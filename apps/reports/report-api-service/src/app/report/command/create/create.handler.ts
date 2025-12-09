import { ErrorResponseDto, ReportDto, ResponseDto } from '@dto';
import { BadRequestException, Inject, Logger } from '@nestjs/common';
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
        private readonly reportDatabaseService: ReportDatabaseServiceAbstract
    ) {}
    async execute(command: CreateReportCommand): Promise<ResponseDto<ReportDto | ErrorResponseDto>> {
        this.logger.log(`Processing create request for report: ${command.reportDto.reportName}`);

        try {
            // Create record in database
            command.reportDto.createdBy = command.user.username;
            const createdRecord = await this.reportDatabaseService.createRecord(command.reportDto);

            this.logger.log(`Report created successfully: ${createdRecord.reportId}`);
            return new ResponseDto<ReportDto>(createdRecord, HTTP_STATUS_CREATED);
        } catch (error) {
            return this.handleError(error, command.reportDto.reportName);
        }
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
