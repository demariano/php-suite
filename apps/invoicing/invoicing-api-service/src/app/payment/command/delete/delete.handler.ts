import { ErrorResponseDto, PaymentDto, ResponseDto, StatusEnum, UserRole } from '@dto';
import { reduceArrayContents } from '@dynamo-db-lib';
import { PaymentDatabaseServiceAbstractClass } from '@invoicing-database-service';
import { BadRequestException, Inject, Logger, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { DeletePaymentCommand } from './delete.command';

// Constants
const HTTP_STATUS_OK = 200;
const ACTIVITY_LOGS_LIMIT = 10;

@CommandHandler(DeletePaymentCommand)
export class DeletePaymentHandler implements ICommandHandler<DeletePaymentCommand> {
    protected readonly logger = new Logger(DeletePaymentHandler.name);

    constructor(
        @Inject('PaymentDatabaseService')
        private readonly paymentDatabaseService: PaymentDatabaseServiceAbstractClass
    ) {}

    async execute(command: DeletePaymentCommand): Promise<ResponseDto<PaymentDto | ErrorResponseDto>> {
        this.logger.log(`Processing delete request for payment: ${command.id}`);

        try {
            // Fetch and validate existing payment record
            const existingRecord = await this.validatePaymentExists(command.id);

            // Check user authorization
            const hasApprovalPermission = this.hasApprovalPermission(command.user.roles);

            // Update status and activity logs based on permissions
            this.updatePaymentStatus(command, existingRecord, hasApprovalPermission);

            // Delete or mark for deletion based on permissions
            const deletedRecord = await this.performDeletion(command, hasApprovalPermission);

            this.logger.log(`Payment deleted successfully: ${deletedRecord.paymentId}`);
            return new ResponseDto<PaymentDto>(deletedRecord, HTTP_STATUS_OK);
        } catch (error) {
            return this.handleError(error, command.id);
        }
    }

    /**
     * Validates that the payment exists
     */
    private async validatePaymentExists(recordId: string): Promise<PaymentDto> {
        const existingRecord = await this.paymentDatabaseService.findRecordById(recordId);

        if (!existingRecord) {
            this.logger.warn(`Payment not found: ${recordId}`);
            throw new NotFoundException(`Payment record not found for id ${recordId}`);
        }

        return existingRecord;
    }

    /**
     * Checks if user has permission to delete directly
     */
    private hasApprovalPermission(userRoles?: string[]): boolean {
        console.log('userRoles', userRoles);
        if (!userRoles || userRoles.length === 0) {
            return false;
        }

        return userRoles.includes(UserRole.SUPER_ADMIN) || userRoles.includes(UserRole.ADMIN);
    }

    /**
     * Updates payment status and activity logs based on user permissions
     */
    private updatePaymentStatus(
        command: DeletePaymentCommand,
        existingRecord: PaymentDto,
        hasApprovalPermission: boolean
    ): void {
        // Set the ID
        command.paymentDto.paymentId = command.id;

        if (hasApprovalPermission) {
            // User can delete directly - set to FOR_DELETION for hard delete
            command.paymentDto.status = StatusEnum.FOR_DELETION;
            command.paymentDto.activityLogs = existingRecord.activityLogs || [];
            command.paymentDto.activityLogs.push(
                `Date: ${new Date().toLocaleString('en-US', {
                    timeZone: 'Asia/Manila',
                })}, Payment deleted by ${command.user.username}, status set to ${StatusEnum.FOR_DELETION}`
            );

            // Limit activity logs to last 10 entries
            command.paymentDto.activityLogs = reduceArrayContents(
                command.paymentDto.activityLogs,
                ACTIVITY_LOGS_LIMIT
            );
        } else {
            // User needs approval - set to FOR_DELETION for soft delete
            command.paymentDto.status = StatusEnum.FOR_DELETION;
            command.paymentDto.activityLogs = existingRecord.activityLogs || [];
            command.paymentDto.activityLogs.push(
                `Date: ${new Date().toLocaleString('en-US', {
                    timeZone: 'Asia/Manila',
                })}, Payment deletion requested by ${command.user.username} for approval`
            );

            // Limit activity logs to last 10 entries
            command.paymentDto.activityLogs = reduceArrayContents(
                command.paymentDto.activityLogs,
                ACTIVITY_LOGS_LIMIT
            );
        }
    }

    /**
     * Performs the actual deletion based on user permissions
     */
    private async performDeletion(command: DeletePaymentCommand, hasApprovalPermission: boolean): Promise<PaymentDto> {
        if (hasApprovalPermission) {
            // Hard delete
            return await this.paymentDatabaseService.deleteRecord(command.paymentDto);
        } else {
            // Soft delete (mark for deletion)
            return await this.paymentDatabaseService.updateRecord(command.paymentDto);
        }
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
