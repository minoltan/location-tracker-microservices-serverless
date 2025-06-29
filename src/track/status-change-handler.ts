import { DynamoDBStreamEvent } from 'aws-lambda';
import { unmarshall } from '@aws-sdk/util-dynamodb';
import { ApiGatewayManagementApi } from "@aws-sdk/client-apigatewaymanagementapi";
import { DynamoDBClient, GetItemCommand, DeleteItemCommand } from "@aws-sdk/client-dynamodb";
import { marshall } from "@aws-sdk/util-dynamodb";
import { AttributeValue } from '@aws-sdk/client-dynamodb';

interface TrackRecord {
  deviceId: string;
  trackDate: string;
  status?: string;
}

interface ConnectionRecord {
  connectionId: string;
  deviceId: string;
}

// Initialize clients outside handler for reuse
const ddbClient = new DynamoDBClient({});
let apiGatewayClient: ApiGatewayManagementApi;

export const handler = async (event: DynamoDBStreamEvent): Promise<void> => {
  console.log("Received event:", JSON.stringify(event, null, 2));
  
  for (const record of event.Records) {
    try {
      if (!record.dynamodb) {
        console.log('Skipping record with no DynamoDB data');
        continue;
      }

     const newImage = record.dynamodb.NewImage
        ? unmarshall(record.dynamodb.NewImage as Record<string, AttributeValue>) as TrackRecord
        : null;

      const oldImage = record.dynamodb.OldImage
        ? unmarshall(record.dynamodb.OldImage as Record<string, AttributeValue>) as TrackRecord
        : null;

      if (!newImage) {
        console.log('Skipping record with no NewImage');
        continue;
      }

      if (record.eventName === 'MODIFY' && oldImage?.status === newImage.status) {
        console.log(`Skipping unchanged status for device ${newImage.deviceId}`);
        continue;
      }

      console.log('Status change detected:', {
        deviceId: newImage.deviceId,
        newStatus: newImage.status,
        oldStatus: oldImage?.status || 'N/A',
        eventType: record.eventName,
      });

      await processStatusChange(newImage.deviceId, newImage.status);

    } catch (error) {
      console.error('Error processing record:', error);
    }
  }
};

async function processStatusChange(deviceId: string, status?: string): Promise<void> {
  console.log(`Processing status change for device ${deviceId}, new status: ${status}`);
  await broadcastToWebSocket(deviceId, status);
}

const broadcastToWebSocket = async (deviceId: string, status?: string) => {
  try {
    const connection = await getConnectionId(deviceId);
    
    if (!connection?.connectionId) {
      console.log(`No active connection found for device ${deviceId}`);
      return;
    }

    const message = JSON.stringify({
      action: 'statusUpdate',
      deviceId,
      status,
      timestamp: new Date().toISOString()
    });

    // Initialize API Gateway client if not already done
    if (!apiGatewayClient) {
      const wsEndpoint = process.env.WEBSOCKET_API_ENDPOINT;
      if (!wsEndpoint) {
        throw new Error("WEBSOCKET_API_ENDPOINT environment variable not set");
      }
      
      apiGatewayClient = new ApiGatewayManagementApi({
        apiVersion: '2018-11-29',
        endpoint: wsEndpoint.replace('wss://', 'https://')
      });
    }

    console.log(`Sending to connection ${connection.connectionId}:`, message);
    
    try {
      await apiGatewayClient.postToConnection({
        ConnectionId: connection.connectionId,
        Data: message
      });
      console.log(`Successfully sent to device ${deviceId}`);
    } catch (error: any) {
      console.error(`Failed to send to connection ${connection.connectionId}:`, error);
      
      // Remove stale connection (410 = GONE)
      if (error.statusCode === 410 || error.name === 'GoneException') {
        await ddbClient.send(new DeleteItemCommand({
          TableName: process.env.CONNECTIONS_TABLE,
          Key: marshall({
            deviceId: connection.deviceId,
            connectionId: connection.connectionId
          })
        }));
        console.log(`Removed stale connection ${connection.connectionId}`);
      }
    }
  } catch (error) {
    console.error('WebSocket broadcast error:', error);
  }
};

const getConnectionId = async (deviceId: string): Promise<ConnectionRecord | null> => {
  try {
    const { Item } = await ddbClient.send(new GetItemCommand({
      TableName: process.env.CONNECTIONS_TABLE,
      Key: marshall({ deviceId })
    }));

    return Item ? unmarshall(Item) as ConnectionRecord : null;
  } catch (error) {
    console.error('Error fetching connection:', error);
    return null;
  }
};