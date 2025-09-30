import { CustomerDatabaseServiceModule } from '@customer-database-service';
import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { AreaController } from './area.controller';
import { ApproveAreaHandler } from './command/approve-record/approve.handler';
import { CreateAreaHandler } from './command/create/create.handler';
import { DeleteAreaHandler } from './command/delete/delete.handler';
import { DenyAreaHandler } from './command/deny-record/deny.handler';
import { UpdateAreaHandler } from './command/update/update.handler';
import { GetAreaByIdHandler } from './queries/get.by.id/get.area.by.id.handler';
import { GetAreaByNameHandler } from './queries/get.by.name/get.area.by.name.handler';
import { GetRecordsPaginationHandler } from './queries/get.records.pagination/get.records.pagination.handler';

const commandHandlers = [CreateAreaHandler, UpdateAreaHandler, DeleteAreaHandler, ApproveAreaHandler, DenyAreaHandler];

const queryHandlers = [GetAreaByIdHandler, GetAreaByNameHandler, GetRecordsPaginationHandler];

@Module({
    imports: [CqrsModule, CustomerDatabaseServiceModule],
    controllers: [AreaController],
    providers: [...commandHandlers, ...queryHandlers],
})
export class AreaModule {}
