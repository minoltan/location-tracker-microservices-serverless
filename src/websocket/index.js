import { ddbClient } from "../shared/ddbClient";
import { PutItemCommand, DeleteItemCommand } from "@aws-sdk/client-dynamodb";
import { PostToConnectionCommand } from "@aws-sdk/client-apigatewaymanagementapi";
import { marshall } from "@aws-sdk/util-dynamodb";
import { webSocketClient } from "./websocketClient";

export const handler = async (event) => {
    const { requestContext, body, queryStringParameters } = event;
    const { connectionId, routeKey } = requestContext;

    try {
        switch (routeKey) {
            case '$connect':
                const deviceId = queryStringParameters?.deviceId;
                await handleConnect(connectionId, deviceId);
                return { statusCode: 200, body: 'Connected' };

            case '$disconnect':
                await handleDisconnect(connectionId);
                return { statusCode: 200, body: 'Disconnected' };

            case '$default':
                const message = body ? JSON.parse(body) : {};
                if (message.action === 'track') {
                    // Handle tracking updates
                }
                return await handleDefaultMessage(body, connectionId, webSocketClient);

            default:
                return { statusCode: 400, body: 'Unknown route' };
        }
    } catch (err) {
        console.error('WebSocket error:', err);
        return { statusCode: 500, body: 'Internal Server Error' };
    }
};

const handleConnect = async (connectionId, deviceId) => {
    try {
        await ddbClient.send(new PutItemCommand({
            TableName: process.env.CONNECTION_TABLE_NAME,
            Item: marshall({
                deviceId,
                connectionId,
                ttl: Math.floor(Date.now() / 1000) + 3600 // 1 hour TTL
            })
        }));
        console.log(`Connection ${connectionId} stored with device ${deviceId}`);
    } catch (err) {
        console.error('Failed to store connection:', err);
        throw err;
    }
};

const handleDisconnect = async (connectionId) => {
    try {
        // First get the deviceId before deleting (optional - useful for logging)
        const { Item } = await ddbClient.send(new GetItemCommand({
            TableName: process.env.CONNECTIONS_TABLE,
            Key: marshall({ connectionId })
        }));
        
        const deviceId = Item?.deviceId?.S;
        
        await ddbClient.send(new DeleteItemCommand({
            TableName: process.env.CONNECTIONS_TABLE,
            Key: marshall({ connectionId })
        }));
        
        console.log(`Connection ${connectionId} (device: ${deviceId || 'unknown'}) removed`);
        
        // Optional: Add any device-specific cleanup here
        
    } catch (err) {
        console.error('Failed to remove connection:', err);
        throw err;
    }
};

const handleDefaultMessage = async (body, connectionId, webSocketClient) => {
    try {
        const message = body ? JSON.parse(body) : {};

        if (message.action === 'track') {
            await webSocketClient.send(new PostToConnectionCommand({
                ConnectionId: connectionId,
                Data: JSON.stringify({
                    status: 'tracking',
                    deviceId: message.deviceId,
                    timestamp: new Date().toISOString()
                })
            }));
            return { statusCode: 200, body: 'Tracking initiated' };
        }

        return { statusCode: 200, body: 'Message processed' };

    } catch (err) {
        console.error('Message handling error:', err);
        throw err;
    }
};