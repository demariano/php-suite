import { ContractDto, ErrorResponseDto, ResponseDto, StatusEnum, UserRole } from '@dto';
import { reduceArrayContents } from '@dynamo-db-lib';
import { detectFieldChanges, formatFieldChanges } from '@field-change-utils-lib';
import { ContractDatabaseServiceAbstract } from '@invoicing-database-service';
import { BadRequestException, Inject, Logger, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { UpdateContractCommand } from './update.command';

// Constants
const ACTIVITY_LOGS_LIMIT = 10;
const HTTP_STATUS_OK = 200;

@CommandHandler(UpdateContractCommand)
export class UpdateContractHandler implements ICommandHandler<UpdateContractCommand> {
    protected readonly logger = new Logger(UpdateContractHandler.name);

    constructor(
        @Inject('ContractDatabaseService')
        private readonly contractDatabaseService: ContractDatabaseServiceAbstract
    ) {}

    async execute(command: UpdateContractCommand): Promise<ResponseDto<ContractDto | ErrorResponseDto>> {
        this.logger.log(`Processing update request for contract: ${command.id}`);

        try {
            // Validate that contract exists
            const existingRecord = await this.validateContractExists(command.id);

            // Validate that contract number doesn't already exist (excluding current record)
            await this.validateContractNoUnique(command.contractDto.contractNo, command.id);

            // Check user authorization and determine status
            const hasApprovalPermission = this.hasApprovalPermission(command.user.roles);

            // Update status and activity logs based on permissions
            this.updateContractStatus(command, existingRecord, hasApprovalPermission);

            // Update record in database
            const updatedRecord = await this.contractDatabaseService.updateRecord(existingRecord);

            this.logger.log(`Contract updated successfully: ${updatedRecord.contractId}`);
            return new ResponseDto<ContractDto>(updatedRecord, HTTP_STATUS_OK);
        } catch (error) {
            return this.handleError(error, command.id);
        }
    }

    /**
     * Validates that the contract exists
     */
    private async validateContractExists(recordId: string): Promise<ContractDto> {
        const existingRecord = await this.contractDatabaseService.findRecordById(recordId);

        if (!existingRecord) {
            this.logger.warn(`Contract not found: ${recordId}`);
            throw new NotFoundException(`Contract record not found for id ${recordId}`);
        }

        return existingRecord;
    }

    /**
     * Validates that the contract number is unique (excluding current record)
     */
    private async validateContractNoUnique(contractNo: string, currentId: string): Promise<void> {
        const existingRecord = await this.contractDatabaseService.findRecordByContractNo(contractNo);

        if (existingRecord && existingRecord.contractId !== currentId) {
            this.logger.warn(`Contract number already exists: ${contractNo}`);
            throw new BadRequestException('Contract number already exists');
        }
    }

    /**
     * Checks if user has permission to approve updates directly
     */
    private hasApprovalPermission(userRoles?: string[]): boolean {
        if (!userRoles || userRoles.length === 0) {
            return false;
        }

        return userRoles.includes(UserRole.SUPER_ADMIN) || userRoles.includes(UserRole.ADMIN);
    }

    /**
     * Updates contract status and activity logs based on user permissions
     */
    private updateContractStatus(
        command: UpdateContractCommand,
        existingRecord: ContractDto,
        hasApprovalPermission: boolean
    ): void {
        if (hasApprovalPermission) {
            // User can approve directly - update the existing record
            existingRecord.status = StatusEnum.ACTIVE;
            existingRecord.contractNo = command.contractDto.contractNo;
            existingRecord.contractName = command.contractDto.contractName;
            existingRecord.customerId = command.contractDto.customerId;
            existingRecord.customerName = command.contractDto.customerName;
            existingRecord.startDate = command.contractDto.startDate;
            existingRecord.endDate = command.contractDto.endDate;
            existingRecord.contractAmount = command.contractDto.contractAmount;
            existingRecord.amountPaid = command.contractDto.amountPaid;
            existingRecord.productDealId = command.contractDto.productDealId;
            existingRecord.productDealName = command.contractDto.productDealName;
            existingRecord.deliveryStatus = command.contractDto.deliveryStatus;
            existingRecord.paymentStatus = command.contractDto.paymentStatus;
            existingRecord.deliveredAmount = command.contractDto.deliveredAmount;
            existingRecord.productDealQty = command.contractDto.productDealQty;
            // Clear changeReason for admin users since changes are applied directly
            existingRecord.changeReason = undefined;
            const activityLog = `Date: ${new Date().toLocaleString('en-US', {
                timeZone: 'Asia/Manila',
            })}, Contract updated by ${command.user.username}, status set to ${StatusEnum.ACTIVE}`;
            existingRecord.activityLogs = [...(existingRecord.activityLogs || []), activityLog];

            // Limit activity logs to last 10 entries
            existingRecord.activityLogs = reduceArrayContents(existingRecord.activityLogs, ACTIVITY_LOGS_LIMIT);
        } else {
            // User needs approval - store changes in forApprovalVersion, keep existing record unchanged
            existingRecord.status = StatusEnum.FOR_APPROVAL;
            existingRecord.activityLogs = existingRecord.activityLogs || [];

            // Detect field changes
            const fieldChanges = detectFieldChanges(existingRecord, command.contractDto, {});
            const formattedChanges = formatFieldChanges(fieldChanges);

            // Build activity log message
            let activityLogMessage = `Date: ${new Date().toLocaleString('en-US', {
                timeZone: 'Asia/Manila',
            })}, Contract updated by ${command.user.username} for approval`;

            // Append changes to activity log if any changes detected
            if (formattedChanges) {
                activityLogMessage += ` - ${formattedChanges}`;
            }

            existingRecord.activityLogs.push(activityLogMessage);

            // Limit activity logs to last 10 entries
            existingRecord.activityLogs = reduceArrayContents(existingRecord.activityLogs, ACTIVITY_LOGS_LIMIT);

            // Preserve user's manually entered changeReason and combine with auto-generated changes
            const userChangeReason = command.contractDto.changeReason?.trim();
            if (userChangeReason && formattedChanges) {
                // User provided changeReason and we have formatted changes - combine them
                // formatFieldChanges already starts with \n, so we just concatenate
                existingRecord.changeReason = `${userChangeReason}${formattedChanges}`;
            } else if (userChangeReason) {
                // User provided changeReason but no formatted changes - use user's input
                existingRecord.changeReason = userChangeReason;
            } else if (formattedChanges) {
                // No user input but we have formatted changes - use formatted changes
                existingRecord.changeReason = formattedChanges;
            } else {
                // No user input and no formatted changes
                existingRecord.changeReason = undefined;
            }

            existingRecord.forApprovalVersion = {
                contractNo: command.contractDto.contractNo,
                contractName: command.contractDto.contractName,
                customerId: command.contractDto.customerId,
                customerName: command.contractDto.customerName,
                startDate: command.contractDto.startDate,
                endDate: command.contractDto.endDate,
                contractAmount: command.contractDto.contractAmount,
                amountPaid: command.contractDto.amountPaid,
                productDealId: command.contractDto.productDealId,
                productDealName: command.contractDto.productDealName,
                deliveryStatus: command.contractDto.deliveryStatus,
                paymentStatus: command.contractDto.paymentStatus,
                deliveredAmount: command.contractDto.deliveredAmount,
                invoicedAmount: command.contractDto.invoicedAmount,
                productDealQty: command.contractDto.productDealQty,
            };
        }
    }

    /**
     * Centralized error handling
     */
    private handleError(error: unknown, recordId: string): never {
        this.logger.error(`Error processing update request for ${recordId}:`, error);

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
