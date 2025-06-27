# location-tracker-microservices-serverless
This project implements a scalable backend system for tracking IoT devices in real-time using AWS serverless architecture. The solution can connects mobile applications with IoT tracker devices, processes location data through AWS IoT Core, and provides real-time coordinates via a serverless microservice architecture.

## TABLE OF CONTENTS
1. [Key Features](#FEATURES) 
2. [Technical Stack](#STACK)
3. [Architecture](#ARCHITECTURE)
4. [Setup](#SETUP)
5. [Personalization](#PERSONALIZATION)
6. [Tips](#TIPS)
7. [Deployment](#DEPLOYMENT)
8. [Install as a Mobile App](#PWA)
9. [Author](#AUTHOR)


# FEATURES
    
- **Device Integration**: Seamless connection between IoT tracker devices and mobile applications (not implemented mobile connection yet)
- **AWS IoT Core**: Device registration and MQTT communication (For real world products need certificates)
- **Serverless Processing**: Lambda functions for efficient data handling and processing
- **Real-time Updates**: Immediate location coordinate transmission to connected clients
- **Scalable Architecture**: Cloud-native design using AWS serverless components
- **Easy Deployment**: Minutes of Deployment using CDK

## Technical Stack

- **AWS IoT Core** - Device management and secure MQTT communication  
- **AWS Lambda** - Serverless functions for real-time data processing  
- **Amazon DynamoDB** - Persistent storage for device and location data  
- **Amazon API Gateway** - RESTful endpoints for mobile/web integration  
- **AWS IoT Rules Engine** - Message routing and processing  
- **Amazon EventBridge** - Event-driven architecture for system coordination  
- **Amazon SQS** - Decoupled message queuing for reliable processing  

## Technical Stack

- <img src="https://img.shields.io/badge/AWS_IoT_Core-FF9900?style=flat&logo=amazon-aws&logoColor=white" alt="AWS IoT Core"> - Device management and secure MQTT communication  
- <img src="https://img.shields.io/badge/AWS_Lambda-FF9900?style=flat&logo=awslambda&logoColor=white" alt="AWS Lambda"> - Serverless functions for real-time data processing  
- <img src="https://img.shields.io/badge/Amazon_DynamoDB-4053D6?style=flat&logo=amazon-dynamodb&logoColor=white" alt="DynamoDB"> - Persistent storage for device and location data  
- <img src="https://img.shields.io/badge/Amazon_API_Gateway-FF9900?style=flat&logo=amazon-aws&logoColor=white" alt="API Gateway"> - RESTful endpoints for mobile/web integration  
- <img src="https://img.shields.io/badge/AWS_IoT_Rules-FF9900?style=flat&logo=amazon-aws&logoColor=white" alt="IoT Rules"> - Message routing and processing  
- <img src="https://img.shields.io/badge/Amazon_EventBridge-FF9900?style=flat&logo=amazon-aws&logoColor=white" alt="EventBridge"> - Event-driven architecture  
- <img src="https://img.shields.io/badge/Amazon_SQS-FF9900?style=flat&logo=amazon-sqs&logoColor=white" alt="SQS"> - Decoupled message queuing  



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

## Architecture Diagram
provide the [link]()

## Requirement documentation
add a notion doc

## Demo Video URL

## Postman collection

## Creeate & Update Github repo

## AI - Device predicition --- LLM | sagemaker
## AI - bettery saver recomendation | sagemaker
## AI - Chat bot
