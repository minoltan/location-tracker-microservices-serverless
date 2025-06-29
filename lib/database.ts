import { RemovalPolicy } from "aws-cdk-lib";
import { AttributeType, BillingMode, ITable, Table } from "aws-cdk-lib/aws-dynamodb";
import { Construct } from "constructs";
import { StreamViewType } from "aws-cdk-lib/aws-dynamodb";

export class LockeyDatabase extends Construct {

    public readonly deviceTable: ITable;
    public readonly locationTable: ITable;
    public readonly trackTable: ITable;
    public readonly connectionsTable: ITable;


    constructor(scope: Construct, id: string){
        super(scope, id);        
        this.deviceTable = this.createDeviceTable();
        this.locationTable = this.createLocationTable();
        this.trackTable = this.createTrackTable();
        this.connectionsTable = this.createConnectionsTable();
    }

    // Device DynamoDb Table Creation
    private createDeviceTable() : ITable{
      const deviceTable = new Table(this, 'device', {
        partitionKey: {
          name: 'id',
          type: AttributeType.STRING
        },
        tableName: 'device',
        removalPolicy: RemovalPolicy.DESTROY,
        billingMode: BillingMode.PAY_PER_REQUEST
      });
      return deviceTable;
    }
  

    // Location DynamoDb Table Creation
    private createLocationTable() : ITable {
      const locationTable = new Table(this, 'location', {
        partitionKey: {
          name: 'deviceId',
          type: AttributeType.STRING
        },
         sortKey: {
            name: 'timestamp',
            type: AttributeType.STRING 
          },
        tableName: 'location',
        removalPolicy: RemovalPolicy.DESTROY,
        billingMode: BillingMode.PAY_PER_REQUEST
      });
      return locationTable;
    }

    // Track DynamoDb Table Creation
    private createTrackTable() : ITable {
      const trackTable = new Table(this, 'track', {
          partitionKey: {
            name: 'deviceId',
            type: AttributeType.STRING
          },
          sortKey: {
            name: 'trackDate',
            type: AttributeType.STRING
          },
          tableName: 'track',
          removalPolicy: RemovalPolicy.DESTROY,
          billingMode: BillingMode.PAY_PER_REQUEST,
          stream: StreamViewType.NEW_AND_OLD_IMAGES
      });
      return trackTable;
    }

    // Connection DynamoDb Table Creation
    private createConnectionsTable(): ITable {
        const connectionsTable = new Table(this, 'connections', {
            partitionKey: { 
              name: 'deviceId', 
              type: AttributeType.STRING 
            },
            tableName: 'connections',
            removalPolicy: RemovalPolicy.DESTROY,
            billingMode: BillingMode.PAY_PER_REQUEST,
            timeToLiveAttribute: 'ttl'
        });
        return connectionsTable;
    }
}