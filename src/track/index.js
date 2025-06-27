import { PutItemCommand, QueryCommand, ScanCommand } from "@aws-sdk/client-dynamodb";
import { marshall, unmarshall } from "@aws-sdk/util-dynamodb";
import { ddbClient } from "../shared/ddbClient";

exports.handler = async function (event) {
  console.log("request:", JSON.stringify(event, undefined, 2));

  if (event.Records != null) {
    // SQS Invocation
    await sqsInvocation(event);
  }
  else if (event['detail-type'] !== undefined) {
    // EventBridge Invocation
    await eventBridgeInvocation(event);
  } else {
    // API Gateway Invocation -- return sync response
    return await apiGatewayInvocation(event);
  }
};

const sqsInvocation = async (event) => {
  console.log(`sqsInvocation function. event : "${event}"`);

  event.Records.forEach(async (record) => {
    console.log('Record: %j', record);

    const trackEventRequest = JSON.parse(record.body);

    await createTrack(trackEventRequest.detail);
  });
}

const eventBridgeInvocation = async (event) => {
  console.log(`eventBridgeInvocation function. event : "${event}"`);

  // create order item into db
  await createTrack(event.detail);
}


const createTrack = async (locationTrackEvent) => {
  try {
    console.log(`createTrack function. event : "${locationTrackEvent}"`);

    // set trackDate for SK of order dynamodb
    const trackDate = new Date().toISOString();
    locationTrackEvent.trackDate = trackDate;
    console.log("Track data: ", locationTrackEvent);

    const item = {
      deviceId: locationTrackEvent.deviceId,
      trackDate: trackDate,
      ...locationTrackEvent
    };

    console.log('Item to save:', item);


    let marshalledItem;
    try {
      marshalledItem = marshall(item, { removeUndefinedValues: true });
    } catch (err) {
      console.error("Error marshalling item:", err);
      throw err;
    }

    const params = {
      TableName: process.env.DYNAMODB_TABLE_NAME,
      Item: marshalledItem
    };


    console.log("Sending PutItemCommand...");
    try {
      const result = await Promise.race([
        ddbClient.send(new PutItemCommand(params)),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("DynamoDB PutItem timed out")), 5000)
        )
      ]);
      console.log("PutItem response:", result);
      return result;
    } catch (err) {
      console.error("PutItem failed or timed out:", err);
      throw err;
    }
    return createResult;

  } catch (e) {
    console.error(e);
    throw e;
  }
}

const apiGatewayInvocation = async (event) => {
  let body;

  try {
    switch (event.httpMethod) {
      case "GET":
        if (event.pathParameters != null) {
          body = await getTrack(event);
        } else {
          body = await getAllTracks();
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
  }
  catch (e) {
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
}

const getTrack = async (event) => {
  console.log("getTrack");

  try {
    const deviceId = event.pathParameters.deviceId;
    const trackDate = event.queryStringParameters.trackDate;

    const params = {
      KeyConditionExpression: "deviceId = :deviceId and trackDate = :trackDate",
      ExpressionAttributeValues: {
        ":deviceId": { S: deviceId },
        ":trackDate": { S: trackDate }
      },
      TableName: process.env.DYNAMODB_TABLE_NAME
    };

    const { Items } = await ddbClient.send(new QueryCommand(params));

    console.log(Items);
    return Items.map((item) => unmarshall(item));
  } catch (e) {
    console.error(e);
    throw e;
  }
}

const getAllTracks = async () => {
  console.log("getAllTracks");
  try {
    const params = {
      TableName: process.env.DYNAMODB_TABLE_NAME
    };

    const { Items } = await ddbClient.send(new ScanCommand(params));

    console.log(Items);
    return (Items) ? Items.map((item) => unmarshall(item)) : {};

  } catch (e) {
    console.error(e);
    throw e;
  }
}