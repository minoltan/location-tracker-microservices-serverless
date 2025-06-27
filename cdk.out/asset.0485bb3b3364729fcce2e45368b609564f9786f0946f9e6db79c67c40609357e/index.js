"use strict";

// asset-input/src/iot-test-client/index.js
var { IoTDataPlaneClient, PublishCommand } = require("@aws-sdk/client-iot-data-plane");
var { marshall } = require("@aws-sdk/util-dynamodb");
var iotClient = new IoTDataPlaneClient();
exports.handler = async function() {
  console.log("Starting IoT test client simulation");
  let response;
  try {
    const coordinates = generateTestCoordinates();
    console.log("Generated coordinates:", coordinates);
    const publishResult = await publishToIotCore(coordinates);
    console.log("Publish result:", publishResult);
    response = {
      statusCode: 200,
      body: JSON.stringify({
        message: "Successfully published test coordinates",
        coordinates,
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
  console.log("Execution completed:", response);
  return response;
};
var generateTestCoordinates = () => {
  console.log("Generating test coordinates");
  return {
    deviceId: `test-device-${Math.floor(Math.random() * 1e3)}`,
    latitude: 37.7749 + (Math.random() * 0.1 - 0.05),
    // Random around SF
    longitude: -122.4194 + (Math.random() * 0.1 - 0.05),
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    batteryLevel: Math.floor(Math.random() * 100),
    accuracy: (Math.random() * 10).toFixed(2)
  };
};
var publishToIotCore = async (coordinates) => {
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
