import { CreatePaymentDto, ErrorResponseDto, ResponseDto, StatusEnum } from '@dto';
import { PaymentDatabaseServiceAbstractClass } from '@invoicing-database-service';
import { BadRequestException, Inject, Logger } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { CreatePaymentCommand } from './create.command';

// Constants
const HTTP_STATUS_CREATED = 201;

@CommandHandler(CreatePaymentCommand)
export class CreatePaymentHandler implements ICommandHandler<CreatePaymentCommand> {
    protected readonly logger = new Logger(CreatePaymentHandler.name);

    constructor(
        @Inject('PaymentDatabaseService')
        private readonly paymentDatabaseService: PaymentDatabaseServiceAbstractClass
    ) {}

    async execute(command: CreatePaymentCommand): Promise<ResponseDto<CreatePaymentDto | ErrorResponseDto>> {
        this.logger.log(`Processing create request for payment: ${command.paymentDto.receiptNo}`);

        try {
            // Validate that receipt number doesn't already exist
            await this.validateReceiptNoUnique(command.paymentDto.receiptNo);

            // Update status and activity logs based on permissions
            this.updatePaymentStatus(command);

            console.log('command.paymentDto', command.paymentDto);

            // Create record in database
            const createdRecord = await this.paymentDatabaseService.createRecord(command.paymentDto);

            this.logger.log(`Payment created successfully: ${createdRecord.paymentId}`);
            return new ResponseDto<CreatePaymentDto>(createdRecord, HTTP_STATUS_CREATED);
        } catch (error) {
            return this.handleError(error, command.paymentDto.receiptNo);
        }
    }

    /**
     * Validates that the receipt number is unique
     */
    private async validateReceiptNoUnique(receiptNo: string): Promise<void> {
        const existingRecord = await this.paymentDatabaseService.findRecordByReceiptNo(receiptNo);

        if (existingRecord) {
            this.logger.warn(`Receipt number already exists: ${receiptNo}`);
            throw new BadRequestException('Receipt number already exists');
        }
    }

    /**
     * Updates payment status and activity logs based on user permissions
     */
    private updatePaymentStatus(command: CreatePaymentCommand): void {
        command.paymentDto.status = StatusEnum.ACTIVE;
        command.paymentDto.activityLogs = [];
        command.paymentDto.activityLogs.push(
            `Date: ${new Date().toLocaleString('en-US', {
                timeZone: 'Asia/Manila',
            })}, Payment created by ${command.user.username}, status set to ${StatusEnum.ACTIVE}`
        );
    }

    /**
     * Centralized error handling
     */
    private handleError(error: unknown, receiptNo: string): never {
        this.logger.error(`Error processing create request for ${receiptNo}:`, error);

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
    }
}
