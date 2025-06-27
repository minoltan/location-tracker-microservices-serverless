import { DeleteItemCommand, GetItemCommand, PutItemCommand, QueryCommand, ScanCommand, UpdateItemCommand } from "@aws-sdk/client-dynamodb";
import { marshall, unmarshall } from "@aws-sdk/util-dynamodb";
import { ddbClient } from "../shared/ddbClient";
import { v4 as uuidv4 } from 'uuid';

exports.handler = async function(event) {
    console.log("request:", JSON.stringify(event, undefined, 2));

    try {
      let body;
      switch (event.httpMethod) {
        case "GET":
          if(event.queryStringParameters != null) {
            body = await getDeviceByCategory(event);
          }
          else if (event.pathParameters != null) {
            body = await getDevice(event.pathParameters.id);
          } else {
            body = await getAllDevices();
          }
          break;
        case "POST":
          body = await createDevice(event);
          break;
        case "DELETE":
          body = await deleteDevice(event.pathParameters.id);
          break;
        case "PUT":
            body = await updateDevice(event); 
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


const getDevice = async (deviceId) => {
  console.log("getDevice");

  try {
    const params = {
      TableName: process.env.DYNAMODB_TABLE_NAME,
      Key: marshall({ id: deviceId })
    };

    const { Item } = await ddbClient.send(new GetItemCommand(params));

    console.log(Item);
    return (Item) ? unmarshall(Item) : {};

  } catch(e) {
    console.error(e);
    throw e;
  }
}

const getAllDevices = async () => {
  console.log("getAllDevices");
  try {
    const params = {
      TableName: process.env.DYNAMODB_TABLE_NAME
    };

    const { Items } = await ddbClient.send(new ScanCommand(params));

    console.log(Items);
    return (Items) ? Items.map((item) => unmarshall(item)) : {};

  } catch(e) {
    console.error(e);
    throw e;
  }
}

const createDevice = async (event) => {
  console.log(`createDevice function. event : "${event}"`);
  try {
    const deviceRequest = JSON.parse(event.body);
    // set deviceid
    const deviceId = uuidv4();
    deviceRequest.id = deviceId;

    const params = {
      TableName: process.env.DYNAMODB_TABLE_NAME,
      Item: marshall(deviceRequest || {})
    };

    const createResult = await ddbClient.send(new PutItemCommand(params));

    console.log(createResult);
    return createResult;

  } catch(e) {
    console.error(e);
    throw e;
  }
}

const deleteDevice = async (deviceId) => {
  console.log(`deleteDevice function. deviceId : "${deviceId}"`);

  try {
    const params = {
      TableName: process.env.DYNAMODB_TABLE_NAME,
      Key: marshall({ id: deviceId }),
    };

    const deleteResult = await ddbClient.send(new DeleteItemCommand(params));

    console.log(deleteResult);
    return deleteResult;
  } catch(e) {
    console.error(e);
    throw e;
  }
}

const updateDevice = async (event) => {
  console.log(`updateDevice function. event : "${event}"`);
  try {
    const requestBody = JSON.parse(event.body);
    const objKeys = Object.keys(requestBody);
    console.log(`updateDevice function. requestBody : "${requestBody}", objKeys: "${objKeys}"`);    

    const params = {
      TableName: process.env.DYNAMODB_TABLE_NAME,
      Key: marshall({ id: event.pathParameters.id }),
      UpdateExpression: `SET ${objKeys.map((_, index) => `#key${index} = :value${index}`).join(", ")}`,
      ExpressionAttributeNames: objKeys.reduce((acc, key, index) => ({
          ...acc,
          [`#key${index}`]: key,
      }), {}),
      ExpressionAttributeValues: marshall(objKeys.reduce((acc, key, index) => ({
          ...acc,
          [`:value${index}`]: requestBody[key],
      }), {})),
    };

    const updateResult = await ddbClient.send(new UpdateItemCommand(params));

    console.log(updateResult);
    return updateResult;
  } catch(e) {
    console.error(e);
    throw e;
  }

}

const getDeviceByCategory = async (event) => {
  console.log("getDeviceByCategory");
  try {
    // GET device/1234?category=Phone
    const deviceId = event.pathParameters.id;
    const category = event.queryStringParameters.category;

    const params = {
      KeyConditionExpression: "id = :deviceId",
      FilterExpression: "contains (category, :category)",
      ExpressionAttributeValues: {
        ":deviceId": { S: deviceId },
        ":category": { S: category }
      },      
      TableName: process.env.DYNAMODB_TABLE_NAME
    };

    const { Items } = await ddbClient.send(new QueryCommand(params));

    console.log(Items);
    return Items.map((item) => unmarshall(item));
  } catch(e) {
    console.error(e);
    throw e;
  }
}


  
