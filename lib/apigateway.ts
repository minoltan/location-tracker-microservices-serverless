import { LambdaRestApi } from "aws-cdk-lib/aws-apigateway";
import { IFunction } from "aws-cdk-lib/aws-lambda";
import { Construct } from "constructs";
import { WebSocketApi, WebSocketStage } from "aws-cdk-lib/aws-apigatewayv2";
import { WebSocketLambdaIntegration } from "aws-cdk-lib/aws-apigatewayv2-integrations";
import { CfnOutput } from 'aws-cdk-lib';

interface LockeyApiGatewayProps {
    deviceMicroservice: IFunction,
    locationMicroservice: IFunction,
    trackMicroservice: IFunction,
    webSocketHandler?: IFunction,
    iotTestClient: IFunction
}

export class LockeyApiGateway extends Construct {

    public readonly webSocketApi: WebSocketApi;
    public readonly webSocketStage: WebSocketStage;
    public readonly webSocketApiEndpoint: string;


    constructor(scope: Construct, id: string, props: LockeyApiGatewayProps) {
        super(scope, id);

        if (props.webSocketHandler) {
            this.webSocketApiEndpoint = this.createWebSocketAPI(props.webSocketHandler);
        }

        // Location API Gateway
        this.createLocationAPI(props.locationMicroservice);
        // Device API Gateway
        this.createDeviceAPI(props.deviceMicroservice);
        // Track API Gateway
        this.createTrackAPI(props.trackMicroservice);
        // Test API Gateway for send manual coordinates        
        this.createTestApi(props.iotTestClient);

    }

    // Generate Coordniate API Gateway
    private createTestApi(iotTestClient: IFunction) {
        const apigw = new LambdaRestApi(this, 'testApi', {
            restApiName: 'Test Service',
            handler: iotTestClient,
            proxy: false
        });

        const test = apigw.root.addResource('test');
        const testCoordinates = test.addResource('coordinates');
        testCoordinates.addMethod('POST');
    }

    // Device microservices api gateway
    private createDeviceAPI(deviceMicroservice: IFunction) {
        const apigw = new LambdaRestApi(this, 'deviceApi', {
            restApiName: 'Device Service',
            handler: deviceMicroservice,
            proxy: false
        });

        const device = apigw.root.addResource('device');
        device.addMethod('GET');
        device.addMethod('POST');

        const singleDevice = device.addResource('{id}');
        singleDevice.addMethod('GET');
        singleDevice.addMethod('PUT');
        singleDevice.addMethod('DELETE');

    }

    // Location microservices api gateway
    private createLocationAPI(locationMicroservice: IFunction) {
        const apigw = new LambdaRestApi(this, 'locationApi', {
            restApiName: 'Location Service',
            handler: locationMicroservice,
            proxy: false
        });

        const location = apigw.root.addResource('location');
        location.addMethod('GET'); 

        const singleDevice = location.addResource('{deviceId}');
        singleDevice.addMethod('GET');

        const track = location.addResource('track');
        const trackByDeviceId = track.addResource('{deviceId}');
        trackByDeviceId.addMethod('POST');

    }

    // Track microservices api gateway
    private createTrackAPI(trackMicroservices: IFunction) {
        const apigw = new LambdaRestApi(this, 'trackApi', {
            restApiName: 'Track Service',
            handler: trackMicroservices,
            proxy: false
        });

        const track = apigw.root.addResource('track');
        track.addMethod('GET');       

        const singleTrack = track.addResource('{deviceId}');
        singleTrack.addMethod('GET');  

        return singleTrack;
    }

    // Send Location
    private createWebSocketAPI(webSocketHandler: IFunction) {
        const webSocketApi = new WebSocketApi(this, 'LockeyWebSocketApi', {
            apiName: 'LockeyWebSocketService',
            connectRouteOptions: {
                integration: new WebSocketLambdaIntegration('ConnectIntegration', webSocketHandler),
            },
            disconnectRouteOptions: {
                integration: new WebSocketLambdaIntegration('DisconnectIntegration', webSocketHandler),
            },
            defaultRouteOptions: {
                integration: new WebSocketLambdaIntegration('DefaultIntegration', webSocketHandler),
            },
        });


        const stage = new WebSocketStage(this, 'LockeyWebSocketStage', {
            webSocketApi,
            stageName: 'prod',
            autoDeploy: true,
        });

        // Add this output declaration
        new CfnOutput(this, 'WebSocketApiUrl', {
            value: stage.url,
            description: 'WebSocket API URL',
            exportName: 'WebSocketApiUrl'
        });

        return stage.url;
    }
}