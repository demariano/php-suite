import { ContractDto, ErrorResponseDto, ResponseDto, StatusEnum, UserRole } from '@dto';
import { reduceArrayContents } from '@dynamo-db-lib';
import { ContractDatabaseServiceAbstract } from '@invoicing-database-service';
import { BadRequestException, Inject, Logger, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { DeleteContractCommand } from './delete.command';

// Constants
const HTTP_STATUS_OK = 200;
const ACTIVITY_LOGS_LIMIT = 10;

@CommandHandler(DeleteContractCommand)
export class DeleteContractHandler implements ICommandHandler<DeleteContractCommand> {
    protected readonly logger = new Logger(DeleteContractHandler.name);

    constructor(
        @Inject('ContractDatabaseService')
        private readonly contractDatabaseService: ContractDatabaseServiceAbstract
    ) {}

    async execute(command: DeleteContractCommand): Promise<ResponseDto<ContractDto | ErrorResponseDto>> {
        this.logger.log(`Processing delete request for contract: ${command.id}`);

        try {
            // Fetch and validate existing contract record
            const existingRecord = await this.validateContractExists(command.id);

            // Check user authorization
            const hasApprovalPermission = this.hasApprovalPermission(command.user.roles);

            // Update status and activity logs based on permissions
            const contractPayload = this.updateContractStatus(command, existingRecord, hasApprovalPermission);

            // Delete or mark for deletion based on permissions
            const deletedRecord = await this.performDeletion(contractPayload, hasApprovalPermission);

            this.logger.log(`Contract deleted successfully: ${deletedRecord.contractId}`);
            return new ResponseDto<ContractDto>(deletedRecord, HTTP_STATUS_OK);
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
     * Checks if user has permission to delete directly
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
        command: DeleteContractCommand,
        existingRecord: ContractDto,
        hasApprovalPermission: boolean
    ): ContractDto {
        const activityLogs = existingRecord.activityLogs || [];
        const timestamp = new Date().toLocaleString('en-US', {
            timeZone: 'Asia/Manila',
        });

        if (hasApprovalPermission) {
            const activityLog = `Date: ${timestamp}, Contract deleted by ${command.user.username}`;
            const updatedLogs = reduceArrayContents([...activityLogs, activityLog], ACTIVITY_LOGS_LIMIT);

            return {
                ...existingRecord,
                status: StatusEnum.FOR_DEACTIVATION,
                changeReason: null,
                activityLogs: updatedLogs,
            };
        }

        const pendingDeletionLog = `Date: ${timestamp}, Contract marked for deletion by ${command.user.username}`;
        const logsWithDeletionRequest = reduceArrayContents([...activityLogs, pendingDeletionLog], ACTIVITY_LOGS_LIMIT);

        return {
            ...existingRecord,
            status: StatusEnum.FOR_DEACTIVATION,
            changeReason: command.contractDto.changeReason ?? existingRecord.changeReason,
            activityLogs: logsWithDeletionRequest,
        };
    }

    /**
     * Performs the actual deletion based on user permissions
     */
    private async performDeletion(contractPayload: ContractDto, hasApprovalPermission: boolean): Promise<ContractDto> {
        if (hasApprovalPermission) {
            // Hard delete
            return await this.contractDatabaseService.deleteRecord(contractPayload);
        } else {
            // Soft delete (mark for deletion)
            return await this.contractDatabaseService.updateRecord(contractPayload);
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
