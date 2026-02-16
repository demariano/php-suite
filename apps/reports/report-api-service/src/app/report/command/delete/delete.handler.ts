import { AwsS3LibService } from '@aws-s3-lib';
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
        private readonly reportDatabaseService: ReportDatabaseServiceAbstract,
        @Inject('AwsS3LibService')
        private readonly s3Service: AwsS3LibService
    ) {}

    async execute(command: DeleteReportCommand): Promise<ResponseDto<ReportDto | ErrorResponseDto>> {
        this.logger.log(`Processing delete request for report: ${command.recordId}`);

        try {
            // Fetch and validate existing report record
            const existingRecord = await this.fetchReportById(command.recordId);

            // Delete S3 file if it exists
            await this.deleteS3File(existingRecord);

            // Delete database record
            await this.reportDatabaseService.deleteRecord(command.reportDto);

            return new ResponseDto<ReportDto>(existingRecord, HTTP_STATUS_OK);
        } catch (error) {
            return this.handleError(error, command.recordId);
        }
    }

    /**
     * Deletes the S3 file associated with the report if file details exist
     */
    private async deleteS3File(report: ReportDto): Promise<void> {
        if (report.fileDetails?.bucket && report.fileDetails?.key) {
            try {
                await this.s3Service.deleteObject(report.fileDetails.bucket, report.fileDetails.key);
                this.logger.log(`S3 file deleted: bucket=${report.fileDetails.bucket}, key=${report.fileDetails.key}`);
            } catch (error) {
                this.logger.warn(
                    `Failed to delete S3 file for report ${report.reportId}, continuing with record deletion`,
                    error
                );
            }
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
