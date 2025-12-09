import { ErrorResponseDto, ReportDto, ResponseDto } from '@dto';
import { BadRequestException, Inject, Logger, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { ReportDatabaseServiceAbstract } from '@report-database-service';
import { DeleteReportCommand } from './delete.command';

// Constants
const HTTP_STATUS_OK = 200;

@CommandHandler(DeleteReportCommand)
export class DeleteReportHandler implements ICommandHandler<DeleteReportCommand> {
    protected readonly logger = new Logger(DeleteReportHandler.name);

    constructor(
        @Inject('ReportDatabaseService')
        private readonly reportDatabaseService: ReportDatabaseServiceAbstract
    ) {}

    async execute(command: DeleteReportCommand): Promise<ResponseDto<ReportDto | ErrorResponseDto>> {
        this.logger.log(`Processing delete request for area: ${command.recordId}`);

        try {
            // Fetch and validate existing report record
            const existingRecord = await this.fetchReportById(command.recordId);
            await this.reportDatabaseService.deleteRecord(command.reportDto);

            return new ResponseDto<ReportDto>(existingRecord, HTTP_STATUS_OK);
        } catch (error) {
            return this.handleError(error, command.recordId);
        }
    }

    /**
     * Fetches and validates an area record by ID
     */
    private async fetchReportById(recordId: string): Promise<ReportDto> {
        const reportRecord = await this.reportDatabaseService.findRecordById(recordId);

        if (!reportRecord) {
            this.logger.warn(`Report not found for ID: ${recordId}`);
            throw new NotFoundException(`Report not found for ID: ${recordId}`);
        }

        return reportRecord;
    }

    /**
     * Centralized error handling
     */
    private handleError(error: unknown, recordId: string): never {
        this.logger.error(`Error processing delete request for ${recordId}:`, error);

        // Re-throw known exceptions
        if (error instanceof BadRequestException || error instanceof NotFoundException) {
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
