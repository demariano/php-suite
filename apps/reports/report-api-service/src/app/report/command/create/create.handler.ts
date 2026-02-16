import { ErrorResponseDto, ReportDto, ReportEventDto, ReportEventEnum, ResponseDto } from '@dto';
import { MessageQueueServiceAbstract } from '@message-queue-lib';
import { BadRequestException, Inject, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { ReportDatabaseServiceAbstract } from '@report-database-service';
import { CreateReportCommand } from './create.command';

// Constants
const HTTP_STATUS_CREATED = 201;
const ACTIVITY_LOGS_LIMIT = 10;

@CommandHandler(CreateReportCommand)
export class CreateReportHandler implements ICommandHandler<CreateReportCommand> {
    protected readonly logger = new Logger(CreateReportHandler.name);

    constructor(
        @Inject('ReportDatabaseService')
        private readonly reportDatabaseService: ReportDatabaseServiceAbstract,
        @Inject('MessageQueueAwsLibService')
        private readonly messageQueueService: MessageQueueServiceAbstract,
        private readonly configService: ConfigService
    ) {}
    async execute(command: CreateReportCommand): Promise<ResponseDto<ReportDto | ErrorResponseDto>> {
        this.logger.log(`Processing create request for report: ${command.reportDto.reportName}`);

        try {
            // Create record in database
            command.reportDto.createdBy = command.user.username;
            command.reportDto.dateCreated = new Date().toISOString();
            const createdRecord = await this.reportDatabaseService.createRecord(command.reportDto);

            this.logger.log(`Report created successfully: ${createdRecord.reportId}`);

            // Send SQS event to trigger report generation
            await this.sendReportGenerationEvent(createdRecord, command.user.username);

            return new ResponseDto<ReportDto>(createdRecord, HTTP_STATUS_CREATED);
        } catch (error) {
            return this.handleError(error, command.reportDto.reportName);
        }
    }

    /**
     * Sends an SQS event to trigger async report generation
     */
    private async sendReportGenerationEvent(report: ReportDto, createdBy: string): Promise<void> {
        const queueUrl = this.configService.get<string>('REPORT_EVENT_SQS');

        if (!queueUrl) {
            this.logger.error('REPORT_EVENT_SQS is not configured - report generation event not sent');
            return;
        }

        const eventDto: ReportEventDto = {
            eventType: ReportEventEnum.GENERATE_REPORT,
            reportId: report.reportId || '',
            reportType: report.reportType!,
            reportName: report.reportName || '',
            createdBy: createdBy,
            filters: report.filters || {},
            timestamp: new Date().toISOString(),
        };

        await this.messageQueueService.sendMessageToSQS(queueUrl, JSON.stringify(eventDto));
        this.logger.log(`Report generation event sent for report: ${report.reportId}`);
    }

    /**
     * Centralized error handling
     */
    private handleError(error: unknown, areaName: string): never {
        this.logger.error(`Error processing create request for ${areaName}:`, error);

        // Re-throw known exceptions
        if (error instanceof BadRequestException) {
            throw error;
        }

        // Handle unknown errors
        const errorMessage = this.extractErrorMessage(error);
        throw new BadRequestException(errorMessage);
    }

    /**
     * Extracts error message from various error types
     */
    private extractErrorMessage(error: unknown): string {
        if (error instanceof Error) {
            return error.message;
        }

        if (typeof error === 'object' && error !== null && 'response' in error) {
            const responseError = error as { response?: { body?: { errorMessage?: string } } };
            return responseError.response?.body?.errorMessage || 'Unknown error occurred';
        }

        return 'An unexpected error occurred';
    }
}
