import { ContractDto, ErrorResponseDto, ResponseDto, StatusEnum, UserRole } from '@dto';
import { reduceArrayContents } from '@dynamo-db-lib';
import { ContractDatabaseServiceAbstract } from '@invoicing-database-service';
import { BadRequestException, Inject, Logger } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { CreateContractCommand } from './create.command';

// Constants
const ACTIVITY_LOGS_LIMIT = 10;
const HTTP_STATUS_CREATED = 201;
const CONTRACT_NUMBER_PREFIX = 'CNTRCT'; // Contract prefix for auto-generated contract numbers

@CommandHandler(CreateContractCommand)
export class CreateContractHandler implements ICommandHandler<CreateContractCommand> {
    protected readonly logger = new Logger(CreateContractHandler.name);

    constructor(
        @Inject('ContractDatabaseService')
        private readonly contractDatabaseService: ContractDatabaseServiceAbstract
    ) {}

    async execute(command: CreateContractCommand): Promise<ResponseDto<ContractDto | ErrorResponseDto>> {
        this.logger.log(`Processing create request for contract`);

        try {
            // Generate contract number based on area contract count
            if (!command.contractDto.areaId) {
                throw new BadRequestException('Area ID is required to generate contract number');
            }

            if (!command.contractDto.areaPrefixId) {
                throw new BadRequestException('Area prefix ID is required to generate contract number');
            }

            const contractCount = await this.contractDatabaseService.getContractCountByAreaId(
                command.contractDto.areaId
            );
            const nextContractNumber = contractCount + 1;
            command.contractDto.contractNo = `${command.contractDto.areaPrefixId}-${CONTRACT_NUMBER_PREFIX}-${nextContractNumber}`;

            this.logger.log(
                `Generated contract number: ${command.contractDto.contractNo} for area: ${command.contractDto.areaId} (count: ${contractCount}, prefix: ${command.contractDto.areaPrefixId})`
            );

            // Validate that contract number doesn't already exist
            await this.validateContractNoUnique(command.contractDto.contractNo);

            // Check user authorization and determine status
            const hasApprovalPermission = this.hasApprovalPermission(command.user.roles);

            // Update status and activity logs based on permissions
            this.updateContractStatus(command, hasApprovalPermission);

            // Create record in database
            const createdRecord = await this.contractDatabaseService.createRecord(command.contractDto);

            this.logger.log(`Contract created successfully: ${createdRecord.contractId}`);
            return new ResponseDto<ContractDto>(createdRecord, HTTP_STATUS_CREATED);
        } catch (error) {
            return this.handleError(error, command.contractDto.contractNo || 'unknown');
        }
    }

    /**
     * Validates that the contract number is unique
     */
    private async validateContractNoUnique(contractNo: string): Promise<void> {
        const existingRecord = await this.contractDatabaseService.findRecordByContractNo(contractNo);

        if (existingRecord) {
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
    private updateContractStatus(command: CreateContractCommand, hasApprovalPermission: boolean): void {
        if (hasApprovalPermission) {
            // User can approve directly - set to ACTIVE
            command.contractDto.status = StatusEnum.ACTIVE;
            command.contractDto.activityLogs = [];
            command.contractDto.activityLogs.push(
                `Date: ${new Date().toLocaleString('en-US', {
                    timeZone: 'Asia/Manila',
                })}, Contract created by ${command.user.username}, status set to ${StatusEnum.ACTIVE}`
            );
            // Limit activity logs to last 10 entries
            command.contractDto.activityLogs = reduceArrayContents(
                command.contractDto.activityLogs,
                ACTIVITY_LOGS_LIMIT
            );
        } else {
            // User needs approval - set to NEW_RECORD
            command.contractDto.status = StatusEnum.NEW_RECORD;
            command.contractDto.activityLogs = [];
            command.contractDto.activityLogs.push(
                `Date: ${new Date().toLocaleString('en-US', {
                    timeZone: 'Asia/Manila',
                })}, Contract created by ${command.user.username} for approval`
            );
            // Limit activity logs to last 10 entries
            command.contractDto.activityLogs = reduceArrayContents(
                command.contractDto.activityLogs,
                ACTIVITY_LOGS_LIMIT
            );
            command.contractDto.forApprovalVersion = {};
            command.contractDto.forApprovalVersion.contractNo = command.contractDto.contractNo;
            command.contractDto.forApprovalVersion.contractName = command.contractDto.contractName;
            command.contractDto.forApprovalVersion.customerId = command.contractDto.customerId;
            command.contractDto.forApprovalVersion.customerName = command.contractDto.customerName;
            command.contractDto.forApprovalVersion.areaId = command.contractDto.areaId;
            command.contractDto.forApprovalVersion.areaName = command.contractDto.areaName;
            command.contractDto.forApprovalVersion.startDate = command.contractDto.startDate;
            command.contractDto.forApprovalVersion.endDate = command.contractDto.endDate;
            command.contractDto.forApprovalVersion.contractType = command.contractDto.contractType;
            command.contractDto.forApprovalVersion.contractAmount = command.contractDto.contractAmount;
            command.contractDto.forApprovalVersion.totalAmountPaid = command.contractDto.totalAmountPaid;
            command.contractDto.forApprovalVersion.contractProductDeals = command.contractDto.contractProductDeals;
            command.contractDto.forApprovalVersion.deliveryStatus = command.contractDto.deliveryStatus;
            command.contractDto.forApprovalVersion.paymentStatus = command.contractDto.paymentStatus;
            command.contractDto.forApprovalVersion.deliveredAmount = command.contractDto.deliveredAmount;
            command.contractDto.forApprovalVersion.changeReason = command.contractDto.changeReason;
            command.contractDto.forApprovalVersion.invoicedAmount = command.contractDto.invoicedAmount;
            command.contractDto.forApprovalVersion.rebatePercentage = command.contractDto.rebatePercentage;
            command.contractDto.forApprovalVersion.rebateType = command.contractDto.rebateType;
            command.contractDto.forApprovalVersion.rebateAmount = command.contractDto.rebateAmount;
            command.contractDto.forApprovalVersion.rebateClaimedAmount = command.contractDto.rebateClaimedAmount;
            command.contractDto.forApprovalVersion.rebateClaimedStatus = command.contractDto.rebateClaimedStatus;
        }
    }

    /**
     * Centralized error handling
     */
    private handleError(error: unknown, contractNo: string): never {
        this.logger.error(`Error processing create request for ${contractNo}:`, error);

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
