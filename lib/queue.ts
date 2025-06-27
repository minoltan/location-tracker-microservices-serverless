import { Duration } from "aws-cdk-lib";
import { IFunction } from "aws-cdk-lib/aws-lambda";
import { SqsEventSource } from "aws-cdk-lib/aws-lambda-event-sources";
import { IQueue, Queue } from "aws-cdk-lib/aws-sqs";
import { Construct } from "constructs";

interface LockeyQueueProps {
    consumer: IFunction;
}

export class LockeyQueue extends Construct {

    public readonly trackQueue: IQueue;

    constructor(scope: Construct, id: string, props: LockeyQueueProps) {
        super(scope, id);

      //queue
      this.trackQueue = new Queue(this, 'TrackQueue', {
        queueName : 'TrackQueue',
        visibilityTimeout: Duration.seconds(30) // default value
      });
      
      props.consumer.addEventSource(new SqsEventSource(this.trackQueue, {
          batchSize: 1
      }));
    }
}