import { EventBus, Rule } from "aws-cdk-lib/aws-events";
import { SqsQueue } from "aws-cdk-lib/aws-events-targets";
import { IFunction } from "aws-cdk-lib/aws-lambda";
import { IQueue } from "aws-cdk-lib/aws-sqs";
import { Construct } from "constructs";

interface LockeyEventBusProps {
    publisherFuntion: IFunction;
    targetQueue: IQueue
}

export class LockeyEventBus extends Construct {

    constructor(scope: Construct, id: string, props: LockeyEventBusProps) {
        super(scope, id);

        //eventbus
        const bus = new EventBus(this, 'LockeyEventBus', {
            eventBusName: 'LockeyEventBus'
        });
    
        const trackingLocationRule = new Rule(this, 'TrackingLocationRule', {
            eventBus: bus,
            enabled: true,
            description: 'When Location microservice track the location',
            eventPattern: {
                source: ['com.lockey.location.trackLocation'],
                detailType: ['TrackLocation']
            },
            ruleName: 'TrackingLocationRule'
        });
    
        // need to pass target to Tracking Lambda service
        trackingLocationRule.addTarget(new SqsQueue(props.targetQueue)); 
        
        bus.grantPutEventsTo(props.publisherFuntion);
            // AccessDeniedException - is not authorized to perform: events:PutEvents

    }

}