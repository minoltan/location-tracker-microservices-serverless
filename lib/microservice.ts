import { ITable } from "aws-cdk-lib/aws-dynamodb";
import { Runtime } from "aws-cdk-lib/aws-lambda";
import { NodejsFunction, NodejsFunctionProps } from "aws-cdk-lib/aws-lambda-nodejs";
import { Construct } from "constructs";
import { join } from "path";
import { Stack } from 'aws-cdk-lib';
import * as iam from 'aws-cdk-lib/aws-iam';
import { DynamoEventSource } from 'aws-cdk-lib/aws-lambda-event-sources';
import { StartingPosition } from 'aws-cdk-lib/aws-lambda';


interface LockeyMicroservicesProps {
    deviceTable: ITable;
    locationTable: ITable;
    trackTable: ITable;
    connectionsTable: ITable;
    webSocketApiEndpoint?: string;
}

export class LockeyMicroservices extends Construct {

    public readonly deviceMicroservice: NodejsFunction;
    public readonly locationMicroservice: NodejsFunction;
    public readonly trackMicroservice: NodejsFunction;
    public readonly webSocketHandler: NodejsFunction;
    public readonly iotTestClient: NodejsFunction;
    public readonly statusChangeHandler: NodejsFunction;


    constructor(scope: Construct, id: string, props: LockeyMicroservicesProps) {
        super(scope, id);


        // Device Microservice
        this.deviceMicroservice = this.createDeviceFunction(props.deviceTable);
        // Location Microservice
        this.locationMicroservice = this.createLocationFunction(props.locationTable, props.connectionsTable);
        // Track Microservice
        this.trackMicroservice = this.createTrackFunction(props.trackTable);
        // WebSocket Handler
        this.webSocketHandler = this.createWebSocketHandler(props);
        // IoT Test Client
        this.iotTestClient = this.createIotTestClient(props.connectionsTable);
        // Stream for track request and updates
        this.statusChangeHandler = this.createStatusChangeHandler(props.trackTable, props.connectionsTable);
    }


    private createDeviceFunction(deviceTable: ITable): NodejsFunction {
        const nodeJsFunctionProps: NodejsFunctionProps = {
            bundling: {
                externalModules: [
                    'aws-sdk'
                ]
            },
            environment: {
                PRIMARY_KEY: 'id',
                DYNAMODB_TABLE_NAME: deviceTable.tableName
            },
            runtime: Runtime.NODEJS_20_X
        }

        // Device microservices lambda function
        const deviceFunction = new NodejsFunction(this, 'deviceLambdaFunction', {
            entry: join(__dirname, `/../src/device/index.js`),
            ...nodeJsFunctionProps,
        })

        deviceTable.grantReadWriteData(deviceFunction);

        return deviceFunction;
    }

    private createLocationFunction(locationTable: ITable, connectionsTable: ITable): NodejsFunction {
        const locationFunctionProps: NodejsFunctionProps = {
            bundling: {
                externalModules: [
                    'aws-sdk',
                ],
            },
            environment: {
                PRIMARY_KEY: 'deviceId',
                DYNAMODB_TABLE_NAME: locationTable.tableName,
                EVENT_SOURCE: "com.lockey.location.trackLocation",
                EVENT_DETAILTYPE: "TrackLocation",
                EVENT_BUSNAME: "LockeyEventBus",
                CONNECTIONS_TABLE: connectionsTable.tableName
            },
            runtime: Runtime.NODEJS_20_X,
        }

        const locationFunction = new NodejsFunction(this, 'locationLambdaFunction', {
            entry: join(__dirname, `/../src/location/index.js`),
            ...locationFunctionProps,
        });

        locationTable.grantReadWriteData(locationFunction);
        connectionsTable.grantReadWriteData(locationFunction);

        // Add WebSocket API management permissions
        locationFunction.addToRolePolicy(new iam.PolicyStatement({
            actions: ['execute-api:ManageConnections'],
            resources: [
                `arn:aws:execute-api:${Stack.of(this).region}:${Stack.of(this).account}:*/*/*/@connections/*`
            ],
        }));

        return locationFunction;
    }

    private createTrackFunction(trackTable: ITable): NodejsFunction {
        const nodeJsFunctionProps: NodejsFunctionProps = {
            bundling: {
                externalModules: [
                    'aws-sdk',
                ],
            },
            environment: {
                PRIMARY_KEY: 'deviceId',
                SORT_KEY: 'trackDate',
                DYNAMODB_TABLE_NAME: trackTable.tableName
            },
            runtime: Runtime.NODEJS_20_X,
        }

        const trackFunction = new NodejsFunction(this, 'trackLambdaFunction', {
            entry: join(__dirname, `/../src/track/index.js`),
            ...nodeJsFunctionProps,
        });

        trackTable.grantReadWriteData(trackFunction);
        return trackFunction;
    }

    private createWebSocketHandler(props: LockeyMicroservicesProps): NodejsFunction {
        const webSocketFunctionProps: NodejsFunctionProps = {
            bundling: {
                externalModules: [
                    'aws-sdk'
                ]
            },
            environment: {
                DEVICE_TABLE_NAME: props.deviceTable.tableName,
                LOCATION_TABLE_NAME: props.locationTable.tableName,
                TRACK_TABLE_NAME: props.trackTable.tableName,
                CONNECTION_TABLE_NAME: props.connectionsTable.tableName
            },
            runtime: Runtime.NODEJS_20_X
        };

        const webSocketFunction = new NodejsFunction(this, 'webSocketHandler', {
            entry: join(__dirname, `/../src/websocket/index.js`),
            ...webSocketFunctionProps,
        });

        props.deviceTable.grantReadWriteData(webSocketFunction);
        props.locationTable.grantReadWriteData(webSocketFunction);
        props.trackTable.grantReadWriteData(webSocketFunction);
        props.connectionsTable.grantReadWriteData(webSocketFunction);


        return webSocketFunction;
    }

    private createIotTestClient(connectionsTable: ITable): NodejsFunction {
        const functionProps: NodejsFunctionProps = {
            runtime: Runtime.NODEJS_20_X,
            environment: {
                IOT_ENDPOINT: `https://${Stack.of(this).account}.iot.${Stack.of(this).region}.amazonaws.com`,
                IOT_TOPIC: 'device/coordinates',
                TRACK_TABLE_NAME: connectionsTable.tableName,
            }
        };

        const iotTestClient = new NodejsFunction(this, 'IotTestClient', {
            entry: join(__dirname, `/../src/iot-test-client/index.js`),
            ...functionProps,
        });

        iotTestClient.addToRolePolicy(new iam.PolicyStatement({
            actions: ['iot:Publish'],
            resources: ['*'] // Restrict to specific topics in production
        }));


        return iotTestClient;
    }

    private createStatusChangeHandler(trackTable: ITable, connectionsTable: ITable): NodejsFunction {
        const handlerProps: NodejsFunctionProps = {
            bundling: {
                externalModules: [
                    'aws-sdk',
                ],
            },
            environment: {
                TABLE_NAME: trackTable.tableName,
                CONNECTIONS_TABLE: connectionsTable.tableName,            
                PRIMARY_KEY: 'deviceId' 
            },
            runtime: Runtime.NODEJS_20_X,
        };

        const handler = new NodejsFunction(this, 'StatusChangeHandler', {
            entry: 'src/track/status-change-handler.ts',
            ...handlerProps,
        });

        // Grant permissions
        trackTable.grantStreamRead(handler);
        connectionsTable.grantReadWriteData(handler);

        // Add WebSocket API management permissions
        handler.addToRolePolicy(new iam.PolicyStatement({
            actions: ['execute-api:ManageConnections'],
            resources: [
                `arn:aws:execute-api:${Stack.of(this).region}:${Stack.of(this).account}:*/*/*/@connections/*`
            ],
        }));

        // Add DynamoDB permissions for connection management
        handler.addToRolePolicy(new iam.PolicyStatement({
            actions: [
                'dynamodb:GetItem',
                'dynamodb:DeleteItem'
            ],
            resources: [connectionsTable.tableArn]
        }));

        // Event source mapping
        handler.addEventSource(new DynamoEventSource(trackTable, {
            startingPosition: StartingPosition.LATEST,
            batchSize: 10,
            retryAttempts: 3,
            filters: [{
                pattern: JSON.stringify({
                    eventName: ["INSERT", "MODIFY"],
                    dynamodb: {
                        NewImage: {
                            status: { "S": [{ "exists": true }] }
                        }
                    }
                }),
            }],
        }));

        return handler;
    }
}