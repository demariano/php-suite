import { ConfigurationLibModule } from '@configuration-lib';
import { Module } from '@nestjs/common';
import { WebsocketConnectionDatabaseService } from './websocket-connection-database-service.service';

@Module({
    imports: [ConfigurationLibModule],
    providers: [WebsocketConnectionDatabaseService],
    exports: [WebsocketConnectionDatabaseService],
})
export class WebsocketConnectionDatabaseServiceModule {}
