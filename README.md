# Location Tracker Microservices Serverless
This project implements a scalable backend system for tracking IoT devices in real-time using AWS serverless architecture. The solution can connects mobile applications with IoT tracker devices, processes location data through AWS IoT Core, and provides real-time coordinates via a serverless microservice architecture.

## TABLE OF CONTENTS
1. [Features](#FEATURES) 
2. [Stack](#STACK)
3. [Architecture](#ARCHITECTURE)
4. [Setup](#SETUP)
5. [Personalization](#PERSONALIZATION)
6. [Tips](#TIPS)
7. [Deployment](#DEPLOYMENT)
8. [Install as a Mobile App](#PWA)
9. [Author](#AUTHOR)


## FEATURES
    
- **Device Integration**: Seamless connection between IoT tracker devices and mobile applications (not implemented mobile development yet)
- **AWS IoT Core**: Device registration and MQTT communication (For real world products need certificates)
- **Serverless Processing**: Lambda functions for efficient data handling and processing
- **Real-time Updates**: Immediate location coordinate transmission to connected clients
- **Scalable Architecture**: Cloud-native design using AWS serverless components
- **Easy Deployment**: Minutes of Deployment using CDK 

## Technical Stack

- <img src="https://img.shields.io/badge/AWS_IoT_Core-326304?style=flat&logo=amazon-aws&logoColor=white" alt="AWS IoT Core"> - Device management and secure MQTT communication  
- <img src="https://img.shields.io/badge/AWS_Lambda-FF9900?style=flat&logo=awslambda&logoColor=white" alt="AWS Lambda"> - Serverless functions for real-time data processing  
- <img src="https://img.shields.io/badge/Amazon_DynamoDB-4053D6?style=flat&logo=amazon-dynamodb&logoColor=white" alt="DynamoDB"> - Persistent storage for device and location data  
- <img src="https://img.shields.io/badge/Amazon_API_Gateway-5e6dd1?style=flat&logo=amazon-aws&logoColor=white" alt="API Gateway"> - RESTful endpoints for mobile/web integration  
- <img src="https://img.shields.io/badge/AWS_IoT_Rules-407d07?style=flat&logo=amazon-aws&logoColor=white" alt="IoT Rules"> - Message routing and processing  
- <img src="https://img.shields.io/badge/Amazon_EventBridge-870f57?style=flat&logo=amazon-aws&logoColor=white" alt="EventBridge"> - Event-driven architecture  
- <img src="https://img.shields.io/badge/Amazon_SQS-b3257a?style=flat&logo=amazon-sqs&logoColor=white" alt="SQS"> - Decoupled message queuing  


## ARCHITECTURE
**Device Connection**
![connection](public/readme/connect.png)<br />
1. Device (Mobile App) Connects via WebSocket:

- Path: ```/device/connect```

- A client (e.g. mobile or web app) initiates a WebSocket connection.

-  The WebSocket gateway triggers the ```connectDevice``` Lambda function, which:


2. IoT Device Sends Coordinates:

- The Location Tracker (e.g. GPS-enabled IoT device) sends location data to AWS IoT Core.

- IoT Core matches incoming messages with Message Routing Rules, which trigger:


3. Client Receives Updates:

- The WebSocket client receives live location updates pushed from the backend.

4. For Testing purpose , you can use the following API to send fake location data:
- Path: ```/test/coordinates```

**Device Data**
![device](public/readme/device.png)<br />

1. Exposes CRUD APIs to manage registered devices.

2. REST API Gateway exposing 4 endpoints:

- ```POST /device``` – Registers a device (payload includes device info).

- ```GET /device``` – Retrieves all registered devices.

- ```GET /device/{deviceId}``` – Retrieves a single device’s data.

- ```DELETE /device/{deviceId}``` – Deletes a device.

3. All routes trigger the ```deviceMicroservice``` Lambda function 
4. Device records are stored in a DynamoDB ```device``` table.

**Location Track Data**
![location track](public/readme/location-track.png)<br />

1. Handles tracking and location events, and supports event-driven processing via SQS & EventBridge.
2. Location Retrieval & Tracking APIs:
- ```GET /location/{deviceId}?time``` – Fetch historical location data from location table via ```locationMicroservice```.
- ```POST /location/track``` – Submits new location data to ```locationMicroservice```.

3. Track Events:
- ```locationMicroservice``` stores the location data in the ```location``` table.
- It then emits a track event, which is pushed to EventBridge.

4. Event-Driven Tracking:
- EventBridge routes the event to an SQS Queue.
- ```trackMicroservice``` Lambda is triggered via the queue.
- It processes the event and stores it in the ```track``` table for auditing or analytics.

5. Track Query APIs:
- ```GET /track``` – Fetch all track records.
- ```GET /track/{device-id}?time``` – Fetch specific track history for a device.

**Road Map Plan**
![track prediction](public/readme/roadmap.png)<br />
- AI-based device location prediction system using Amazon Bedrock (for generating contextual insights) and Amazon SageMaker (for prediction using a model, possibly with reinforcement learning later).



# Welcome to your CDK TypeScript project

This is a blank project for CDK development with TypeScript.

The `cdk.json` file tells the CDK Toolkit how to execute your app.

## Useful commands

* ```npm run build```   compile typescript to js
* `npm run watch`   watch for changes and compile
* `npm run test`    perform the jest unit tests
* `npx cdk deploy`  deploy this stack to your default AWS account/region
* `npx cdk diff`    compare deployed stack with current state
* `npx cdk synth`   emits the synthesized CloudFormation template


## Cofigure AWS
use access key & secret key to configure aws



## Requirement documentation
add a notion doc

## Demo Video URL

## Postman collection


## AI - Device predicition --- LLM | sagemaker
## AI - bettery saver recomendation | sagemaker
## AI - Chat bot
