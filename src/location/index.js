import { DeleteItemCommand, GetItemCommand, PutItemCommand, QueryCommand } from "@aws-sdk/client-dynamodb";
import { marshall, unmarshall } from "@aws-sdk/util-dynamodb";
import { ddbClient } from "../shared/ddbClient";
import { ebClient } from "./eventBridgeClient";
import { PutEventsCommand } from "@aws-sdk/client-eventbridge";
const { ApiGatewayManagementApi } = require('@aws-sdk/client-apigatewaymanagementapi');


exports.handler = async function (event) {
  console.log("request:", JSON.stringify(event, undefined, 2));
  // Handle IoT-triggered events
  if (event.source === 'aws.iot' || (event.deviceId && event.timestamp)) {
    return handleIotEvent(JSON.stringify(event, undefined, 2));
  }


  let body;

  try {
    switch (event.httpMethod) {
      case "GET":
        if (event.pathParameters != null) {
          body = await getDeviceLocationsAfterTimestamp(event.pathParameters.deviceId, event.queryStringParameters.timestamp, event.queryStringParameters.limit);
        }
        break;
      case "POST":
        if (event.resource === "/location/track/{deviceId}") {
          const deviceId = event.pathParameters?.deviceId;
          body = await trackLocation(deviceId);
        }
        break;
      default:
        throw new Error(`Unsupported route: "${event.httpMethod}"`);
    }

    console.log(body);
    return {
      statusCode: 200,
      body: JSON.stringify({
        message: `Successfully finished operation: "${event.httpMethod}"`,
        body: body
      })
    };

  } catch (e) {
    console.error(e);
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: "Failed to perform operation.",
        errorMsg: e.message,
        errorStack: e.stack,
      })
    };
  }
};

const getDeviceLocationsAfterTimestamp = async (deviceId, startTimestamp, limit) => {
  try {
    // Convert limit to number if it's provided as string
    const queryLimit = limit ? parseInt(limit) : undefined;

    // Ensure timestamp is properly formatted ISO string
    const timestamp = startTimestamp
      ? new Date(startTimestamp).toISOString()
      : new Date(0).toISOString();

    console.log("timestamp: ", timestamp);
    const params = {
      TableName: process.env.DYNAMODB_TABLE_NAME,
      KeyConditionExpression: 'deviceId = :deviceId AND #timestamp > :startTimestamp',
      ExpressionAttributeNames: {
        '#timestamp': 'timestamp'
      },
      ExpressionAttributeValues: marshall({
        ':deviceId': deviceId,
        ':startTimestamp': timestamp
      }, { removeUndefinedValues: true }),
      ScanIndexForward: false, // Newest first
      Limit: queryLimit
    };

    const { Items } = await ddbClient.send(new QueryCommand(params));
    return Items ? Items.map(item => unmarshall(item)) : [];
  } catch (error) {
    console.error('Error querying locations:', error);
    throw error;
  }
};

async function saveLocation(coordinates) {
  console.log("Creating location for:", coordinates);

  try {
    // Validate required fields
    if (!coordinates.deviceId) {
      throw new Error("Missing required field: deviceId");
    }

    const params = {
      TableName: process.env.DYNAMODB_TABLE_NAME,
      Item: marshall({
        deviceId: coordinates.deviceId,
        timestamp: coordinates.timestamp || new Date().toISOString(),
        info: { ...coordinates }
      }, {
        removeUndefinedValues: true
      })
    };

    const createResult = await ddbClient.send(new PutItemCommand(params));
    console.log("DynamoDB write success:", createResult);
    return createResult;

  } catch (e) {
    console.error("DynamoDB write failed:", e);
    throw e;
  }
}

const trackLocation = async (deviceId) => {
  console.log("trackLocation");

  var trackPayload = prepareTrackPayload(deviceId);

  const publishedEvent = await publishTrackLocationEvent(trackPayload);
  return publishedEvent;

}

const prepareTrackPayload = (deviceId) => {
  console.log("prepareTrackPayload: ", deviceId);
  let trackRequest = {};
  try {
    trackRequest.deviceId = deviceId;
    trackRequest.timestamp = new Date().toISOString();
    trackRequest.status = "PENDING";
    trackRequest.message = "Tracking initiated";

    console.log("Success prepareTrackPayload, trackPayload:", trackRequest);
    return trackRequest;

  } catch (e) {
    console.error(e);
    throw e;
  }
};


const publishTrackLocationEvent = async (trackPayload) => {
  console.log("publishTrackLocationEvent with payload :", trackPayload);
  try {
    // eventbridge parameters for setting event to target system
    const params = {
      Entries: [
        {
          Source: process.env.EVENT_SOURCE,
          Detail: JSON.stringify(trackPayload),
          DetailType: process.env.EVENT_DETAILTYPE,
          Resources: [],
          EventBusName: process.env.EVENT_BUSNAME
        },
      ],
    };

    const data = await ebClient.send(new PutEventsCommand(params));

    console.log("Success, event sent; requestID:", data);
    return trackPayload;

  } catch (e) {
    console.error(e);
    throw e;
  }
}

const handleIotEvent = async (event) => {
  try {

    const coordinates = JSON.parse(event);
    console.log("Parsed coordinates:", coordinates);

    await saveLocation(coordinates);

    await broadcastToWebSocket(coordinates);

    return { statusCode: 200, body: 'IoT event processed' };
  } catch (error) {
    console.error('Error processing IoT event:', error);
    return { statusCode: 500, body: 'Error processing IoT event' };
  }
};

const broadcastToWebSocket = async (coordinates) => {
  try {
    const connection = await getConnectionId(coordinates.deviceId);

    const message = JSON.stringify({
      action: 'locationUpdate',
      data: coordinates
    });

    const wsEndpoint = process.env.WEBSOCKET_API_ENDPOINT;
    if (!wsEndpoint) {
      throw new Error("WEBSOCKET_ENDPOINT environment variable not set");
    }

    const apiGatewayClient = new ApiGatewayManagementApi({
      apiVersion: '2018-11-29',
      endpoint: wsEndpoint.replace('wss://', 'https://') // Important: use https
    });
    console.log("endpoint: ", wsEndpoint.replace('wss://', 'https://'))

    try {
      await apiGatewayClient.postToConnection({
        ConnectionId: connection.connectionId,
        Data: message
      });
      console.log(`Successfully sent to device ${coordinates.deviceId} via connection ${connection.connectionId}`);
    } catch (error) {
      console.error(`Failed to send to connection ${connection.connectionId}:`, error);

      // Remove stale connection (410 = GONE)
      if (error.statusCode === 410) {
        await ddbClient.send(new DeleteItemCommand({
          TableName: process.env.CONNECTIONS_TABLE,
          Key: marshall({
            connectionId: connection.connectionId,
            deviceId: coordinates.deviceId  // Include both PK and SK
          })
        }));
        console.log(`Removed stale connection ${connection.connectionId}`);
      }
      throw error; // Re-throw to handle upstream
    }


  } catch (error) {
    console.error('WebSocket broadcast error:', error);
  }
};

const getConnectionId = async (deviceId) => {
  console.log("getConnectionId");
  try {
    const params = {
      TableName: process.env.CONNECTIONS_TABLE,
      Key: marshall({ deviceId: deviceId })
    };

    const { Item } = await ddbClient.send(new GetItemCommand(params));

    console.log(Item);
    return (Item) ? unmarshall(Item) : {};

  } catch (e) {
    console.error(e);
    throw e;
  }
}