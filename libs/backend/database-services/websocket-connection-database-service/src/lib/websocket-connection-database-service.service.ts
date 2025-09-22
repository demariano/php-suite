import { WebSocketConnectionDto } from '@dto';
import { DynamoDbLibService, WebSocketConnectionDataType, WebSocketConnectionSchema } from '@dynamo-db-lib';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Model } from 'dynamodb-onetable';
import { WebsocketConnectionDatabaseServiceAbstract } from './websocket-connection-database-service-abstract-class';

@Injectable()
export class WebsocketConnectionDatabaseService implements WebsocketConnectionDatabaseServiceAbstract {
    protected readonly logger = new Logger(WebsocketConnectionDatabaseService.name);

    private readonly websocketConnectionTable: Model<WebSocketConnectionDataType>;

    constructor(private readonly configService: ConfigService) {
        const DYNAMO_DB_WEBSOCKET_CONNECTION_TABLE = configService.get<string>('DYNAMO_DB_WEBSOCKET_CONNECTION_TABLE');
        if (!DYNAMO_DB_WEBSOCKET_CONNECTION_TABLE) {
            throw new Error('DYNAMO_DB_WEBSOCKET_CONNECTION_TABLE is not defined in the configuration');
        }
        const dynamoDbService = new DynamoDbLibService(configService);
        this.websocketConnectionTable = dynamoDbService
            .dynamoDbMainTable(DYNAMO_DB_WEBSOCKET_CONNECTION_TABLE, WebSocketConnectionSchema)
            .getModel('WebSocketConnection');
    }

    async createRecord(websocketConnectionDto: WebSocketConnectionDto): Promise<WebSocketConnectionDto> {
        const websocketConnectionData: WebSocketConnectionDataType = {
            connectionId: websocketConnectionDto.connectionId,
            userEmail: websocketConnectionDto.userEmail,
            connectedAt: websocketConnectionDto.connectedAt,
        };
        const websocketConnection: WebSocketConnectionDataType = await this.websocketConnectionTable.create(
            websocketConnectionData
        );
        return await this.convertToDto(websocketConnection);
    }

    async findByConnectionId(connectionId: string): Promise<WebSocketConnectionDto | undefined> {
        const record: WebSocketConnectionDataType | undefined = await this.websocketConnectionTable.get({
            PK: 'WS_CONNECTION',
            SK: `${connectionId}`,
        });

        return record ? await this.convertToDto(record) : undefined;
    }

    async deleteRecord(data: WebSocketConnectionDto): Promise<WebSocketConnectionDto> {
        const websocketConnection: WebSocketConnectionDataType = await this.convertToDataType(data);
        await this.websocketConnectionTable.remove(websocketConnection);

        return await this.convertToDto(websocketConnection);
    }

    async getAllActiveConnections(): Promise<WebSocketConnectionDto[]> {
        const connections: WebSocketConnectionDataType[] | undefined = await this.websocketConnectionTable.find(
            {
                GSI1PK: 'ACTIVE_CONNECTIONS',
            },
            {
                fields: ['connectionId', 'userEmail', 'connectedAt'],
                index: 'GSI1',
            }
        );

        return await this.convertToDtoList(connections);
    }

    async convertToDto(websocketConnection: WebSocketConnectionDataType): Promise<WebSocketConnectionDto> {
        return {
            connectionId: websocketConnection.connectionId,
            userEmail: websocketConnection.userEmail,
            connectedAt: websocketConnection.connectedAt,
        };
    }

    async convertToDtoList(websocketConnections: WebSocketConnectionDataType[]): Promise<WebSocketConnectionDto[]> {
        return await Promise.all(websocketConnections.map(this.convertToDto));
    }

    async convertToDataType(dto: WebSocketConnectionDto): Promise<WebSocketConnectionDataType> {
        return {
            connectionId: dto.connectionId,
            userEmail: dto.userEmail,
            connectedAt: dto.connectedAt,
        };
    }
}
