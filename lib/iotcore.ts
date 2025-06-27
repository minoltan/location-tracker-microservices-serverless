import { Construct } from 'constructs';
import * as iot from 'aws-cdk-lib/aws-iot';
import * as iam from 'aws-cdk-lib/aws-iam';
import { IFunction } from 'aws-cdk-lib/aws-lambda';
import { CfnOutput } from 'aws-cdk-lib';

interface LockeyIotCoreProps {
    locationHandler: IFunction;
    topicName?: string;
}

export class LockeyIotCore extends Construct {
    public readonly topicName: string;

    constructor(scope: Construct, id: string, props: LockeyIotCoreProps) {
        super(scope, id);

        this.topicName = props.topicName || 'device/coordinates';

        // IoT Rule to trigger Lambda
        const iotRule = new iot.CfnTopicRule(this, 'LocationUpdateRule', {
            topicRulePayload: {
                actions: [{
                    lambda: {
                        functionArn: props.locationHandler.functionArn
                    }
                }],
                awsIotSqlVersion: '2016-03-23',
                sql: `SELECT * FROM '${this.topicName}'`,
                ruleDisabled: false
            }
        });

        // Grant IoT permission to invoke Lambda
        props.locationHandler.addPermission('IotInvokePermission', {
            principal: new iam.ServicePrincipal('iot.amazonaws.com'),
            sourceArn: iotRule.attrArn
        });

        new CfnOutput(this, 'IotTopic', { 
            value: this.topicName,
            description: 'IoT Core topic for device coordinates'
        });
    }
}