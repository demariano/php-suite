---
name: 'event-handler-service'
description: 'USE FOR: Creating NestJS SQS event handler services. Covers Lambda SQS handler main.ts, SqsLocalService local polling, MessageHandlerService dispatch by eventType, sync handler services for denormalized name propagation (paginate + batch update), event handler app.module.ts, app.service.ts with dual-mode bootstrap.'
---

# NestJS SQS Event Handler Service

## main.ts — Dual SQS/Local Bootstrap

```ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app/app.module';
import { AppService } from './app/app.service';

let lambdaHandler: (event: unknown, context: unknown) => Promise<void>;

async function bootstrap() {
    const app = await NestFactory.create(AppModule);
    const appService = app.get(AppService);

    // Lambda handler for SQS events
    lambdaHandler = async (event: { Records?: Array<{ body: string }> }) => {
        if (event.Records) {
            for (const record of event.Records) {
                await appService.handleMessage(record.body);
            }
        }
    };

    // Local mode: start Express server + SQS polling
    if (process.env['SERVICE_TRIGGER'] === 'LOCALHOST') {
        const port = process.env['PORT'] || 40XX;
        await app.listen(port);
        console.log(`{Domain} Event Handler running on port ${port}`);
    }
}

bootstrap();

export const handler = async (event: unknown, context: unknown) => {
    if (!lambdaHandler) await bootstrap();
    return lambdaHandler(event, context);
};
```

## app.module.ts

```ts
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { {Domain}DatabaseServiceModule } from '@{domain}-database-service';
import { MessageQueueLibModule } from '@message-queue-lib';
import { ConfigurationLibModule } from '@configuration-lib';
import { AppService } from './app.service';
import { SqsLocalService } from './sqs.local.service';
import { MessageHandlerService } from './message.handler.service';
import { {EntityA}SyncHandlerService } from './{entity-a}.sync.handler.service';
import { {EntityB}SyncHandlerService } from './{entity-b}.sync.handler.service';

@Module({
    imports: [
        ConfigurationLibModule,
        {Domain}DatabaseServiceModule,
        MessageQueueLibModule,
    ],
    providers: [
        AppService,
        SqsLocalService,
        MessageHandlerService,
        {EntityA}SyncHandlerService,
        {EntityB}SyncHandlerService,
    ],
})
export class AppModule {}
```

## app.service.ts

```ts
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MessageHandlerService } from './message.handler.service';
import { SqsLocalService } from './sqs.local.service';

@Injectable()
export class AppService implements OnModuleInit {
    protected readonly logger = new Logger(AppService.name);

    constructor(
        private readonly messageHandlerService: MessageHandlerService,
        private readonly sqsLocalService: SqsLocalService,
        private readonly configService: ConfigService
    ) {}

    async onModuleInit() {
        if (this.configService.get('LOCALSTACK_STATUS') === 'ENABLED') {
            this.logger.log('Starting local SQS polling...');
            this.sqsLocalService.startPolling();
        }
    }

    async handleMessage(body: string): Promise<void> {
        try {
            const parsed = JSON.parse(body);
            await this.messageHandlerService.handleMessage(parsed);
        } catch (error) {
            this.logger.error('Error processing message', error);
        }
    }
}
```

## sqs.local.service.ts — LocalStack Polling

```ts
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MessageQueueServiceAbstract } from '@message-queue-lib';
import { Inject } from '@nestjs/common';
import { MessageHandlerService } from './message.handler.service';

const POLLING_INTERVAL_MS = 1000;
const MAX_MESSAGES = 10;
const WAIT_TIME_SECONDS = 5;

@Injectable()
export class SqsLocalService {
    protected readonly logger = new Logger(SqsLocalService.name);
    private isPolling = false;

    constructor(
        @Inject('MessageQueueAwsLibService')
        private readonly messageQueueService: MessageQueueServiceAbstract,
        private readonly configService: ConfigService,
        private readonly messageHandlerService: MessageHandlerService
    ) {}

    async startPolling(): Promise<void> {
        if (this.isPolling) return;
        this.isPolling = true;

        const queueUrl = this.configService.get<string>('{DOMAIN}_EVENT_SQS');
        if (!queueUrl) {
            this.logger.error('Queue URL not configured');
            return;
        }

        this.logger.log(`Polling SQS queue: ${queueUrl}`);
        this.pollQueue(queueUrl);
    }

    private async pollQueue(queueUrl: string): Promise<void> {
        while (this.isPolling) {
            try {
                const messages = await this.messageQueueService.receiveMessages(
                    queueUrl,
                    MAX_MESSAGES,
                    WAIT_TIME_SECONDS
                );
                if (messages && messages.length > 0) {
                    for (const message of messages) {
                        try {
                            const parsed = JSON.parse(message.Body);
                            await this.messageHandlerService.handleMessage(parsed);
                            await this.messageQueueService.deleteMessage(queueUrl, message.ReceiptHandle);
                        } catch (error) {
                            this.logger.error('Error processing message', error);
                        }
                    }
                }
            } catch (error) {
                this.logger.error('Error polling queue', error);
            }
            await new Promise((resolve) => setTimeout(resolve, POLLING_INTERVAL_MS));
        }
    }
}
```

## message.handler.service.ts — Event Dispatch

```ts
import { Injectable, Logger } from '@nestjs/common';
import { {EntityA}EventEnum, {EntityB}EventEnum } from '@dto';
import { {EntityA}SyncHandlerService } from './{entity-a}.sync.handler.service';
import { {EntityB}SyncHandlerService } from './{entity-b}.sync.handler.service';

@Injectable()
export class MessageHandlerService {
    protected readonly logger = new Logger(MessageHandlerService.name);

    constructor(
        private readonly {entityA}SyncHandlerService: {EntityA}SyncHandlerService,
        private readonly {entityB}SyncHandlerService: {EntityB}SyncHandlerService
    ) {}

    async handleMessage(message: { eventType: string; [key: string]: unknown }): Promise<void> {
        this.logger.log(`Processing event: ${message.eventType}`);

        switch (true) {
            // Each entity/event-enum pair maps to its sync handler
            case Object.values({EntityA}EventEnum).includes(message.eventType as {EntityA}EventEnum):
                await this.{entityA}SyncHandlerService.handleSync(message);
                break;

            case Object.values({EntityB}EventEnum).includes(message.eventType as {EntityB}EventEnum):
                await this.{entityB}SyncHandlerService.handleSync(message);
                break;

            default:
                this.logger.warn(`Unhandled event type: ${message.eventType}`);
        }
    }
}
```

## Sync Handler Service — Denormalized Name Propagation

When a parent entity's name changes, this handler paginates all child records
and batch-updates the denormalized name field.

```ts
import { Injectable, Inject, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { {ChildEntity}DatabaseServiceAbstract } from '@{domain}-database-service';
import { {ParentEntity}EventDto, {ParentEntity}EventEnum } from '@dto';

const SYNC_PAGE_SIZE = 100;
const SYNC_DELAY_MS = 50;

@Injectable()
export class {ParentEntity}SyncHandlerService {
    protected readonly logger = new Logger({ParentEntity}SyncHandlerService.name);

    constructor(
        @Inject('{ChildEntity}DatabaseService')
        private readonly {childEntity}DatabaseService: {ChildEntity}DatabaseServiceAbstract,
        private readonly configService: ConfigService
    ) {}

    async handleSync(message: Record<string, unknown>): Promise<void> {
        const eventDto = message as unknown as {ParentEntity}EventDto;

        switch (eventDto.eventType) {
            case {ParentEntity}EventEnum.{PARENT_ENTITY}_UPDATED:
                await this.syncUpdatedName(eventDto);
                break;
            default:
                this.logger.warn(`Unhandled event: ${eventDto.eventType}`);
        }
    }

    private async syncUpdatedName(eventDto: {ParentEntity}EventDto): Promise<void> {
        this.logger.log(`Syncing {parentEntity} name for id: ${eventDto.{parentEntity}Id}`);

        let nextCursor: string | undefined;
        let hasMore = true;

        while (hasMore) {
            // Paginate all child records that reference this parent
            const page = await this.{childEntity}DatabaseService.findRecordsByParentIdPagination(
                eventDto.{parentEntity}Id,
                nextCursor ?? '',
                '',
                SYNC_PAGE_SIZE
            );

            const records = page.data ?? [];
            for (const record of records) {
                record.{parentEntity}Name = eventDto.new{ParentEntity}Name;
                await this.{childEntity}DatabaseService.updateRecord(record);
            }

            nextCursor = page.nextCursorPointer;
            hasMore = !!nextCursor && nextCursor.length > 0;

            if (hasMore) {
                await new Promise(resolve => setTimeout(resolve, SYNC_DELAY_MS));
            }
        }
    }
}
```

## Folder Structure

```
apps/{domain}/{domain}-event-handler-service/
├── project.json
├── webpack.config.js
└── src/
    ├── main.ts
    └── app/
        ├── app.module.ts
        ├── app.service.ts
        ├── sqs.local.service.ts
        ├── message.handler.service.ts
        ├── {entity-a}.sync.handler.service.ts
        └── {entity-b}.sync.handler.service.ts
```

## webpack.config.js (same as API service)

```js
const { NxAppWebpackPlugin } = require('@nx/webpack/app-plugin');
const { join } = require('path');

module.exports = {
    output: { path: join(__dirname, '../../../dist/apps/{domain}/{domain}-event-handler-service') },
    plugins: [
        new NxAppWebpackPlugin({
            target: 'node',
            compiler: 'tsc',
            main: './src/main.ts',
            tsConfig: './tsconfig.app.json',
            outputHashing: 'none',
            optimization: false,
            sourceMap: true,
            outputFileName: 'main.js',
        }),
    ],
};
```

## project.json

```json
{
    "name": "{domain}-event-handler-service",
    "$schema": "../../../../node_modules/nx/schemas/project-schema.json",
    "sourceRoot": "apps/{domain}/{domain}-event-handler-service/src",
    "projectType": "application",
    "tags": [],
    "targets": {
        "build-serverless-files": {},
        "serve": {
            "executor": "@nx/webpack:webpack-dev-server",
            "options": {
                "buildTarget": "{domain}-event-handler-service:build",
                "runInBackground": true
            }
        }
    }
}
```

## Cross-Domain Event Flow Example

```
Invoice Approved → INVOICE_APPROVED event to INVENTORY_EVENT_SQS
  → InventoryEventHandler picks up
  → MessageHandlerService dispatches to InvoiceApprovedSyncHandler
  → Deducts stock quantities per invoice line item
```
