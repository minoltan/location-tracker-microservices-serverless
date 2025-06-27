import { Stack, StackProps, CfnOutput } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { LockeyDatabase } from './database';
import { LockeyMicroservices } from './microservice';
import { LockeyApiGateway } from './apigateway';
import { LockeyEventBus } from './eventbus';
import { LockeyQueue } from './queue';
import { LockeyIotCore } from './iotcore';



export class AwsLockeyServerlessMicroserviceStack extends Stack {

  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    // Device table 
    const database = new LockeyDatabase(this, 'Database');

    // Microservice lambda
    const microservices = new LockeyMicroservices(this, 'Microservices', {
      deviceTable: database.deviceTable,
      locationTable: database.locationTable,
      trackTable: database.trackTable,
      connectionsTable: database.connectionsTable
    });

    // API Gateway
    const apigateway = new LockeyApiGateway(this, 'ApiGateway', {
      deviceMicroservice: microservices.deviceMicroservice,
      locationMicroservice: microservices.locationMicroservice,
      trackMicroservice: microservices.trackMicroservice,
      webSocketHandler: microservices.webSocketHandler,
      iotTestClient:microservices.iotTestClient
    });

    // Queue
    const queue = new LockeyQueue(this, 'Queue', {
      consumer: microservices.trackMicroservice
    });

    // Event Bus
    const eventbus = new LockeyEventBus(this, 'LockeyEventBus', {
      publisherFuntion: microservices.locationMicroservice,
      targetQueue: queue.trackQueue
    });

    // IoT Core
    const iotCore = new LockeyIotCore(this, 'IotCore', {
      locationHandler: microservices.locationMicroservice
    });

    // Outputs
    new CfnOutput(this, 'IotEndpoint', {
      value: `https://${this.account}.iot.${this.region}.amazonaws.com`,
      description: 'IoT Core endpoint'
    });

    new CfnOutput(this, 'WebSocketUrl', {
      value: apigateway.webSocketApi?.apiEndpoint || '',
      description: 'WebSocket API URL'
    });

    new CfnOutput(this, 'IotTestClientFunction', {
      value: microservices.iotTestClient.functionName,
      description: 'IoT Test Client Lambda function name'
    }); 

    microservices.locationMicroservice.addEnvironment(
        'WEBSOCKET_API_ENDPOINT', 
        apigateway.webSocketApiEndpoint
    );

  }


}
