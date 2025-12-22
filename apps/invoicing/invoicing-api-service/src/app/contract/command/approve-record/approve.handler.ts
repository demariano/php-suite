import { UserCognito } from '@auth-guard-lib';
import {
    ContractDto,
    ContractProductDealDto,
    DeliveryStatusEnum,
    ErrorResponseDto,
    PaymentStatusEnum,
    RebateClaimedStatusEnum,
    RebateTypeEnum,
    ResponseDto,
    StatusEnum,
    UserRole,
} from '@dto';
import { reduceArrayContents } from '@dynamo-db-lib';
import { ContractDatabaseServiceAbstract } from '@invoicing-database-service';
import { BadRequestException, ForbiddenException, Inject, Logger, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { ApproveContractCommand } from './approve.command';

// Constants
const ACTIVITY_LOGS_LIMIT = 10;
const HTTP_STATUS_OK = 200;

@CommandHandler(ApproveContractCommand)
export class ApproveContractHandler implements ICommandHandler<ApproveContractCommand> {
    protected readonly logger = new Logger(ApproveContractHandler.name);

    constructor(
        @Inject('ContractDatabaseService')
        private readonly contractDatabaseService: ContractDatabaseServiceAbstract
    ) {}

    async execute(command: ApproveContractCommand): Promise<ResponseDto<ContractDto | ErrorResponseDto>> {
        this.logger.log(`Processing approval request for contract: ${command.recordId}`);

        try {
            // Validate record exists
            const existingRecord = await this.validateContractExists(command.recordId);

            // Check user authorization
            this.validateUserAuthorization(command.user.roles);

            // Process approval based on current status
            return await this.processApproval(existingRecord, command.user);
        } catch (error) {
            return this.handleError(error, command.recordId);
        }
    }

    /**
     * Validates that the contract record exists
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
     * Validates that the user has authorization to approve
     */
    private validateUserAuthorization(userRoles?: string[]): void {
        if (!userRoles || userRoles.length === 0) {
            throw new ForbiddenException('User roles not found');
        }

        const hasApprovalPermission = userRoles.includes(UserRole.SUPER_ADMIN) || userRoles.includes(UserRole.ADMIN);

        if (!hasApprovalPermission) {
            throw new ForbiddenException('Current user is not authorized to approve contract change request');
        }
    }

    /**
     * Processes the approval based on the current status of the record
     */
    private async processApproval(existingRecord: ContractDto, user: UserCognito): Promise<ResponseDto<ContractDto>> {
        switch (existingRecord.status) {
            case StatusEnum.FOR_APPROVAL:
            case StatusEnum.NEW_RECORD:
                return await this.approveContract(existingRecord, user);
            case StatusEnum.FOR_DELETION:
                return await this.approveDeletion(existingRecord);
            default:
                throw new BadRequestException(`Cannot approve contract with status: ${existingRecord.status}`);
        }
    }

    /**
     * Approves a contract for approval
     */
    private async approveContract(existingRecord: ContractDto, user: UserCognito): Promise<ResponseDto<ContractDto>> {
        // Update status and add activity log
        existingRecord.status = StatusEnum.ACTIVE;
        existingRecord.activityLogs = existingRecord.activityLogs || [];
        existingRecord.activityLogs.push(
            `Date: ${new Date().toLocaleString('en-US', {
                timeZone: 'Asia/Manila',
            })}, Contract approved by ${user.username}, status set to ${StatusEnum.ACTIVE}`
        );

        // Limit activity logs to last 10 entries
        existingRecord.activityLogs = reduceArrayContents(existingRecord.activityLogs, ACTIVITY_LOGS_LIMIT);

        const forApprovalVersion = existingRecord.forApprovalVersion;
        existingRecord.contractNo = forApprovalVersion.contractNo as string;
        existingRecord.contractName = forApprovalVersion.contractName as string;
        existingRecord.customerId = forApprovalVersion.customerId as string;
        existingRecord.customerName = forApprovalVersion.customerName as string;
        existingRecord.areaId = forApprovalVersion.areaId as string | undefined;
        existingRecord.areaName = forApprovalVersion.areaName as string | undefined;
        existingRecord.startDate = forApprovalVersion.startDate as string;
        existingRecord.endDate = forApprovalVersion.endDate as string;
        existingRecord.contractAmount = forApprovalVersion.contractAmount as number;
        existingRecord.amountPaid = forApprovalVersion.amountPaid as number;
        existingRecord.contractProductDeals = forApprovalVersion.contractProductDeals as ContractProductDealDto[];
        existingRecord.deliveryStatus = forApprovalVersion.deliveryStatus as DeliveryStatusEnum;
        existingRecord.paymentStatus = forApprovalVersion.paymentStatus as PaymentStatusEnum;
        existingRecord.deliveredAmount = forApprovalVersion.deliveredAmount as number;
        existingRecord.invoicedAmount = forApprovalVersion.invoicedAmount as number | undefined;
        existingRecord.rebatePercentage = forApprovalVersion.rebatePercentage as number | undefined;
        existingRecord.rebateType = forApprovalVersion.rebateType as RebateTypeEnum | undefined;
        existingRecord.rebateAmount = forApprovalVersion.rebateAmount as number | undefined;
        existingRecord.rebateClaimedAmount = forApprovalVersion.rebateClaimedAmount as number | undefined;
        existingRecord.rebateClaimedStatus = forApprovalVersion.rebateClaimedStatus as
            | RebateClaimedStatusEnum
            | undefined;
        existingRecord.forApprovalVersion = {};
        // Reset changeReason to null AFTER applying forApprovalVersion
        existingRecord.changeReason = null;

        // Update record in database
        const updatedRecord = await this.contractDatabaseService.updateRecord(existingRecord);

        this.logger.log(`Contract approved successfully: ${existingRecord.contractId}`);
        return new ResponseDto<ContractDto>(updatedRecord, HTTP_STATUS_OK);
    }

    /**
     * Approves deletion of a contract
     */
    private async approveDeletion(existingRecord: ContractDto): Promise<ResponseDto<ContractDto>> {
        existingRecord.changeReason = null;
        await this.contractDatabaseService.deleteRecord(existingRecord);

        this.logger.log(`Contract deletion approved: ${existingRecord.contractId}`);
        return new ResponseDto<ContractDto>(existingRecord, HTTP_STATUS_OK);
    }

    /**
     * Centralized error handling
     */
    private handleError(error: unknown, recordId: string): never {
        this.logger.error(`Error processing approval request for ${recordId}:`, error);

        // Re-throw known exceptions
        if (error instanceof NotFoundException || error instanceof ForbiddenException) {
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
