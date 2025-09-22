import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { Table } from 'dynamodb-onetable';
import { Dynamo } from 'dynamodb-onetable/Dynamo';

import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';



@Injectable()
export class DynamoDbLibService {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private client: any = null;

    constructor(private readonly configService: ConfigService) {

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const dynamoDbClient: any = {
            region: this.configService.get<string>('DEFAULT_REGION'),

        }

        if (process.env['LOCALSTACK_STATUS'] === 'ENABLED') {
            dynamoDbClient.endpoint = process.env['LOCALSTACK_ENDPOINT'];
        }

        this.client = new Dynamo({
            client: new DynamoDBClient(
                dynamoDbClient
            ),
            marshall: {
                convertClassInstanceToMap: true,
                removeUndefinedValues: true,
            }
        });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    dynamoDbMainTable(dynamodbTable: string, schema: any) {
        return new Table({
            client: this.client,
            name: dynamodbTable,
            partial: true,
            schema: schema
        });
    }
}

