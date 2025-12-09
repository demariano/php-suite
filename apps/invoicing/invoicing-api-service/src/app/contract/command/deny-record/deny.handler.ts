import { ContractDto, ErrorResponseDto, ResponseDto, StatusEnum, UserRole } from '@dto';
import { reduceArrayContents } from '@dynamo-db-lib';
import { ContractDatabaseServiceAbstract } from '@invoicing-database-service';
import { BadRequestException, ForbiddenException, Inject, Logger, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { DenyContractCommand } from './deny.command';

// Constants
const ACTIVITY_LOGS_LIMIT = 10;
const HTTP_STATUS_OK = 200;

@CommandHandler(DenyContractCommand)
export class DenyContractHandler implements ICommandHandler<DenyContractCommand> {
    protected readonly logger = new Logger(DenyContractHandler.name);

    constructor(
        @Inject('ContractDatabaseService')
        private readonly contractDatabaseService: ContractDatabaseServiceAbstract
    ) {}

    async execute(command: DenyContractCommand): Promise<ResponseDto<ContractDto | ErrorResponseDto>> {
        this.logger.log(`Processing denial request for contract: ${command.recordId}`);

        try {
            // Validate record exists
            const existingRecord = await this.validateContractExists(command.recordId);

            // Check user authorization
            this.validateUserAuthorization(command.user.roles);

            // Process denial based on current status
            return await this.processDenial(existingRecord, command);
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
     * Validates that the user has authorization to deny
     */
    private validateUserAuthorization(userRoles?: string[]): void {
        if (!userRoles || userRoles.length === 0) {
            throw new ForbiddenException('User roles not found');
        }

        const hasDenyPermission = userRoles.includes(UserRole.SUPER_ADMIN) || userRoles.includes(UserRole.ADMIN);

        if (!hasDenyPermission) {
            throw new ForbiddenException('Current user is not authorized to deny contract change request');
        }
    }

    /**
     * Processes the denial based on the current status of the record
     */
    private async processDenial(
        existingRecord: ContractDto,
        command: DenyContractCommand
    ): Promise<ResponseDto<ContractDto>> {
        switch (existingRecord.status) {
            case StatusEnum.FOR_APPROVAL:
                return await this.denyContract(existingRecord, command);
            case StatusEnum.FOR_DELETION:
                return await this.denyDeletion(existingRecord, command);
            case StatusEnum.NEW_RECORD:
                return await this.deleteRecord(existingRecord);
            default:
                throw new BadRequestException(`Cannot deny contract with status: ${existingRecord.status}`);
        }
    }

    /**
     * Denies a contract for approval
     */
    private async denyContract(
        existingRecord: ContractDto,
        command: DenyContractCommand
    ): Promise<ResponseDto<ContractDto>> {
        // Update status and add activity log
        existingRecord.status = StatusEnum.ACTIVE;
        existingRecord.activityLogs = existingRecord.activityLogs || [];
        existingRecord.activityLogs.push(
            `Date: ${new Date().toLocaleString('en-US', {
                timeZone: 'Asia/Manila',
            })}, Contract denied by ${command.user.username}, status set to ${StatusEnum.ACTIVE}`
        );

        //add a new activity log for the using the approver message
        existingRecord.activityLogs.push(
            `Date: ${new Date().toLocaleString('en-US', {
                timeZone: 'Asia/Manila',
            })}, Contract denied by ${command.user.username}, approver message: ${command.approverMessage}`
        );

        // Limit activity logs to last 10 entries
        existingRecord.activityLogs = reduceArrayContents(existingRecord.activityLogs, ACTIVITY_LOGS_LIMIT);
        existingRecord.approverMessage = null;
        // Clear forApprovalVersion first, then reset changeReason
        existingRecord.forApprovalVersion = {};
        existingRecord.changeReason = null;

        // Update record in database
        const updatedRecord = await this.contractDatabaseService.updateRecord(existingRecord);

        this.logger.log(`Contract denied successfully: ${existingRecord.contractId}`);
        return new ResponseDto<ContractDto>(updatedRecord, HTTP_STATUS_OK);
    }

    /**
     * Denies deletion of a contract
     */
    private async denyDeletion(
        existingRecord: ContractDto,
        command: DenyContractCommand
    ): Promise<ResponseDto<ContractDto>> {
        const timestamp = new Date().toLocaleString('en-US', {
            timeZone: 'Asia/Manila',
        });

        existingRecord.activityLogs = existingRecord.activityLogs || [];
        existingRecord.activityLogs.push(
            `Date: ${timestamp}, Contract deletion denied by ${command.user.username}, approver message: ${command.approverMessage}, status reverted to ${StatusEnum.ACTIVE}`
        );
        existingRecord.activityLogs = reduceArrayContents(existingRecord.activityLogs, ACTIVITY_LOGS_LIMIT);
        existingRecord.status = StatusEnum.ACTIVE;
        existingRecord.changeReason = null;
        const updatedRecord = await this.contractDatabaseService.updateRecord(existingRecord);

        this.logger.log(`Contract deletion denied: ${existingRecord.contractId}`);
        return new ResponseDto<ContractDto>(updatedRecord, HTTP_STATUS_OK);
    }

    /**
     * Deletes a contract when it is a new record and it was denied
     */
    private async deleteRecord(existingRecord: ContractDto): Promise<ResponseDto<ContractDto>> {
        existingRecord.changeReason = null;
        await this.contractDatabaseService.deleteRecord(existingRecord);
        this.logger.log(`Contract deleted after denial: ${existingRecord.contractId}`);
        return new ResponseDto<ContractDto>(existingRecord, HTTP_STATUS_OK);
    }

    /**
     * Centralized error handling
     */
    private handleError(error: unknown, recordId: string): never {
        this.logger.error(`Error processing denial request for ${recordId}:`, error);

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
