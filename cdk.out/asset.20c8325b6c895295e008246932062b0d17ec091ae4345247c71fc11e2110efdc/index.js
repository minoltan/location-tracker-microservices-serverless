"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// asset-input/src/iot-test-client/index.js
var iot_test_client_exports = {};
__export(iot_test_client_exports, {
  handler: () => handler
});
module.exports = __toCommonJS(iot_test_client_exports);
var import_client_iot_data_plane2 = require("@aws-sdk/client-iot-data-plane");

// asset-input/src/iot-test-client/iotClient.js
var import_client_iot_data_plane = require("@aws-sdk/client-iot-data-plane");
var iotClient = new import_client_iot_data_plane.IoTDataPlaneClient();

// asset-input/src/iot-test-client/index.js
var handler = async function() {
  console.log("Starting IoT test client simulation");
  let response;
  try {
    const coordinates = generateTestCoordinates();
    const publishResult = await publishToIotCore(coordinates);
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
  return response;
};
var generateTestCoordinates = () => {
  console.log("Generating test coordinates");
  return {
    deviceId: `test-device-${Math.floor(Math.random() * 1e3)}`,
    latitude: 37.7749 + (Math.random() * 0.1 - 0.05),
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
    const command = new import_client_iot_data_plane2.PublishCommand(params);
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
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  handler
});
