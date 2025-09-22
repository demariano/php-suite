import { WebSocketConnectionDto } from '@dto';
import { WebSocketConnectionDataType } from '@dynamo-db-lib';

export abstract class WebsocketConnectionDatabaseServiceAbstract {
    abstract createRecord(userDto: WebSocketConnectionDto): Promise<WebSocketConnectionDto>;

    abstract deleteRecord(userDto: WebSocketConnectionDto): Promise<WebSocketConnectionDto>;

    abstract findByConnectionId(connectionId: string): Promise<WebSocketConnectionDto | undefined>;

    abstract getAllActiveConnections(): Promise<WebSocketConnectionDto[]>;

    abstract convertToDto(record: WebSocketConnectionDto): Promise<WebSocketConnectionDto>;

    abstract convertToDtoList(records: WebSocketConnectionDto[]): Promise<WebSocketConnectionDto[]>;

    abstract convertToDataType(dto: WebSocketConnectionDto): Promise<WebSocketConnectionDataType>;
}
