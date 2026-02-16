import { Injectable, Logger } from '@nestjs/common';
import { MessageHandlerService } from './message.handler.service';

@Injectable()
export class AppService {
    private readonly logger = new Logger(AppService.name);

    constructor(private readonly messageHandlerService: MessageHandlerService) {}

    async handleMessage(input: unknown) {
        this.logger.log(`Record Value: ${JSON.stringify(input)}`);

        const records = this.extractRecords(input);
        for (const record of records) {
            try {
                this.logger.log(`Processing SQS Message: ${JSON.stringify(record)}`);

                const message = this.extractRecordBody(record);
                await this.messageHandlerService.handleMessage(message);
            } catch (error: unknown) {
                this.logger.error(`Error processing SQS Message: ${this.formatError(error)}`);
            }
        }
    }

    private extractRecords(input: unknown): unknown[] {
        if (Array.isArray(input)) {
            return input;
        }

        if (this.isObject(input) && Array.isArray((input as { Records?: unknown }).Records)) {
            return (input as { Records: unknown[] }).Records;
        }

        return [input];
    }

    private extractRecordBody(record: unknown): unknown {
        if (this.isObject(record) && 'body' in record) {
            return (record as { body?: unknown }).body;
        }
        return record;
    }

    private isObject(value: unknown): value is Record<string, unknown> {
        return typeof value === 'object' && value !== null;
    }

    private formatError(error: unknown): string {
        if (error instanceof Error) {
            return `${error.message}${error.stack ? `\n${error.stack}` : ''}`;
        }
        return String(error);
    }
}
