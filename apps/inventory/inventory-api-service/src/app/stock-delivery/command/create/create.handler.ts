import { ErrorResponseDto, ResponseDto, StatusEnum, StockDeliveryDto } from '@dto';
import { StockDeliveryDatabaseServiceAbstract } from '@inventory-database-service';
import { BadRequestException, Inject, Logger } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { CreateStockDeliveryCommand } from './create.command';

// Constants
const HTTP_STATUS_CREATED = 201;

@CommandHandler(CreateStockDeliveryCommand)
export class CreateStockDeliveryHandler implements ICommandHandler<CreateStockDeliveryCommand> {
    protected readonly logger = new Logger(CreateStockDeliveryHandler.name);

    constructor(
        @Inject('StockDeliveryDatabaseService')
        private readonly stockDeliveryDatabaseService: StockDeliveryDatabaseServiceAbstract
    ) {}

    async execute(command: CreateStockDeliveryCommand): Promise<ResponseDto<StockDeliveryDto | ErrorResponseDto>> {
        this.logger.log(`Processing create request for stock delivery: ${command.stockDeliveryDto.docno}`);

        try {
            // Validate that docno is not empty, null, undefined, or whitespace-only
            this.validateDocnoNotEmpty(command.stockDeliveryDto.docno);

            // Validate that stock delivery docno doesn't already exist
            await this.validateStockDeliveryDocnoUnique(command.stockDeliveryDto.docno);

            // Update status and activity logs based on permissions
            this.updateStockDeliveryStatus(command);

            // Create record in database
            const createdRecord = await this.stockDeliveryDatabaseService.createRecord(command.stockDeliveryDto);

            this.logger.log(`Stock delivery created successfully: ${createdRecord.stockDeliveryId}`);
            return new ResponseDto<StockDeliveryDto>(createdRecord, HTTP_STATUS_CREATED);
        } catch (error) {
            return this.handleError(error, command.stockDeliveryDto.docno);
        }
    }

    /**
     * Validates that the docno is not empty, null, undefined, or whitespace-only
     */
    private validateDocnoNotEmpty(docno: string): void {
        if (!docno || docno.trim() === '') {
            this.logger.warn(`Stock delivery docno is empty or invalid: ${docno}`);
            throw new BadRequestException('Document number is required and cannot be empty');
        }
    }

    /**
     * Validates that the stock delivery docno is unique
     */
    private async validateStockDeliveryDocnoUnique(docno: string): Promise<void> {
        const existingRecords = await this.stockDeliveryDatabaseService.findRecordContainingDocno(docno);

        if (existingRecords && existingRecords.length > 0) {
            // Check if any record has the exact docno match
            const exactMatch = existingRecords.find((record) => record.docno === docno);
            if (exactMatch) {
                this.logger.warn(`Stock delivery docno already exists: ${docno}`);
                throw new BadRequestException('Stock delivery document number already exists');
            }
        }
    }

    /**
     * Updates stock delivery status and activity logs based on user permissions
     */
    private updateStockDeliveryStatus(command: CreateStockDeliveryCommand): void {
        const hasApprovalPermission =
            command.user.roles?.includes('ADMIN') || command.user.roles?.includes('SUPER_ADMIN');

        if (hasApprovalPermission) {
            // User can approve directly - set to ACTIVE
            command.stockDeliveryDto.status = StatusEnum.ACTIVE;
            command.stockDeliveryDto.activityLogs = [];
            command.stockDeliveryDto.activityLogs.push(
                `Date: ${new Date().toLocaleString('en-US', {
                    timeZone: 'Asia/Manila',
                })}, Stock delivery created by ${command.user.username}, status set to ${StatusEnum.ACTIVE}`
            );
        } else {
            // User needs approval - set to FOR_APPROVAL
            command.stockDeliveryDto.status = StatusEnum.FOR_APPROVAL;
            command.stockDeliveryDto.activityLogs = [];
            command.stockDeliveryDto.activityLogs.push(
                `Date: ${new Date().toLocaleString('en-US', {
                    timeZone: 'Asia/Manila',
                })}, Stock delivery created by ${command.user.username} for approval`
            );
            command.stockDeliveryDto.forApprovalVersion = {};
            command.stockDeliveryDto.forApprovalVersion.docno = command.stockDeliveryDto.docno;
            command.stockDeliveryDto.forApprovalVersion.supplierId = command.stockDeliveryDto.supplierId;
            command.stockDeliveryDto.forApprovalVersion.supplierName = command.stockDeliveryDto.supplierName;
            command.stockDeliveryDto.forApprovalVersion.dateReceived = command.stockDeliveryDto.dateReceived;
            command.stockDeliveryDto.forApprovalVersion.deliveryDetails = command.stockDeliveryDto.deliveryDetails;
        }
    }

    /**
     * Centralized error handling
     */
    private handleError(error: unknown, docno: string): never {
        this.logger.error(`Error processing create request for ${docno}:`, error);

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
