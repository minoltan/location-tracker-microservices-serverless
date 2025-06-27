import { PublishCommand } from "@aws-sdk/client-iot-data-plane";
import { iotClient } from "./iotClient";

export const handler = async function(event) {
    console.log("Starting IoT test client simulation");
        const deviceId = event.queryStringParameters?.deviceId || 
                    event.pathParameters?.deviceId || 
                    (event.body ? JSON.parse(event.body).deviceId : null);

    if (!deviceId) {
        return {
            statusCode: 400,
            body: JSON.stringify({
                message: "Device ID is required",
                usage: "Pass deviceId via query string, path, or request body"
            })
        };
    }

    let response;

    try {
        const coordinates = generateTestCoordinates(deviceId);
       
        const publishResult = await publishToIotCore(coordinates);
        
        response = {
            statusCode: 200,
            body: JSON.stringify({
                message: "Successfully published test coordinates",
                coordinates: coordinates,
                iotResponse: publishResult
            })
        };

    } catch (e) {
        console.error("Error in IoT test client:", e);
        response = {
            statusCode: 500,
            body: JSON.stringify({
                message: "Failed to publish test coordinates",
                errorMsg: e.message,
                errorStack: e.stack
            })
        };
    }

    return response;
};

const generateTestCoordinates = (deviceId) => {
    console.log("Generating test coordinates");
    return {
        deviceId: deviceId,
        latitude: 37.7749 + (Math.random() * 0.1 - 0.05),
        longitude: -122.4194 + (Math.random() * 0.1 - 0.05),
        timestamp: new Date().toISOString(),
        batteryLevel: Math.floor(Math.random() * 100),
        accuracy: (Math.random() * 10).toFixed(2)
    };
};

const publishToIotCore = async (coordinates) => {
    console.log("Publishing to IoT Core. Topic:", process.env.IOT_TOPIC);
    try {
        const params = {
            topic: process.env.IOT_TOPIC,
            payload: JSON.stringify(coordinates),
            qos: 0
        };

        console.log("Publish parameters:", params);
        const command = new PublishCommand(params);
        const result = await iotClient.send(command);

        console.log("Successfully published to IoT Core");
        return {
            messageId: result.$metadata.requestId,
            httpStatusCode: result.$metadata.httpStatusCode
        };

    } catch (e) {
        console.error("Failed to publish to IoT Core:", e);
        throw new Error(`IoT Publish Error: ${e.message}`);
    }
};