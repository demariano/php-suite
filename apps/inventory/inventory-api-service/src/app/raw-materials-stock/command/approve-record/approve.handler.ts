import { UserCognito } from '@auth-guard-lib';
import { ErrorResponseDto, RawMaterialsStockDto, ResponseDto, StatusEnum, UserRole } from '@dto';
import { reduceArrayContents } from '@dynamo-db-lib';
import { RawMaterialsStockDatabaseServiceAbstract } from '@inventory-database-service';
import { BadRequestException, ForbiddenException, Inject, Logger, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { ApproveRawMaterialsStockCommand } from './approve.command';

// Constants
const HTTP_STATUS_OK = 200;
const ACTIVITY_LOGS_LIMIT = 10;

@CommandHandler(ApproveRawMaterialsStockCommand)
export class ApproveRawMaterialsStockHandler implements ICommandHandler<ApproveRawMaterialsStockCommand> {
    protected readonly logger = new Logger(ApproveRawMaterialsStockHandler.name);

    constructor(
        @Inject('RawMaterialsStockDatabaseService')
        private readonly rawMaterialsStockDatabaseService: RawMaterialsStockDatabaseServiceAbstract
    ) {}

    async execute(
        command: ApproveRawMaterialsStockCommand
    ): Promise<ResponseDto<RawMaterialsStockDto | ErrorResponseDto>> {
        this.logger.log(`Processing approve request for raw materials stock: ${command.recordId}`);

        try {
            // Fetch and validate existing record
            const existingRecord = await this.fetchRawMaterialsStockById(command.recordId);

            // Validate user authorization
            this.validateUserAuthorization(command.user.roles);

            // Process approval based on current status
            const result = await this.processApproval(existingRecord, command.user);

            this.logger.log(`Raw materials stock approved successfully: ${command.recordId}`);
            return result;
        } catch (error) {
            return this.handleError(error, command.recordId);
        }
    }

    /**
     * Fetches and validates a raw materials stock record by ID
     */
    private async fetchRawMaterialsStockById(recordId: string): Promise<RawMaterialsStockDto> {
        const record = await this.rawMaterialsStockDatabaseService.findRecordById(recordId);

        if (!record) {
            this.logger.warn(`Raw materials stock not found for ID: ${recordId}`);
            throw new NotFoundException(`Raw materials stock not found for ID: ${recordId}`);
        }

        return record;
    }

    /**
     * Validates that the user has permission to approve records
     */
    private validateUserAuthorization(userRoles?: string[]): void {
        if (!userRoles || userRoles.length === 0) {
            throw new ForbiddenException('User roles are required for approval');
        }

        const hasPermission = userRoles.includes(UserRole.SUPER_ADMIN) || userRoles.includes(UserRole.ADMIN);

        if (!hasPermission) {
            throw new ForbiddenException('Only SUPER_ADMIN or ADMIN users can approve records');
        }
    }

    /**
     * Processes approval based on the current status of the record
     */
    private async processApproval(
        existingRecord: RawMaterialsStockDto,
        user: UserCognito
    ): Promise<ResponseDto<RawMaterialsStockDto>> {
        switch (existingRecord.status) {
            case StatusEnum.FOR_APPROVAL:
            case StatusEnum.NEW_RECORD:
                return await this.approveRawMaterialsStock(existingRecord, user);
            case StatusEnum.FOR_DELETION:
                return await this.approveDeletion(existingRecord);
            default:
                throw new BadRequestException(
                    `Cannot approve raw materials stock with status: ${existingRecord.status}`
                );
        }
    }

    /**
     * Approves a raw materials stock record by applying forApprovalVersion changes
     */
    private async approveRawMaterialsStock(
        existingRecord: RawMaterialsStockDto,
        user: UserCognito
    ): Promise<ResponseDto<RawMaterialsStockDto>> {
        // Apply changes from forApprovalVersion
        const forApprovalVersion = existingRecord.forApprovalVersion;
        if (forApprovalVersion) {
            existingRecord.rawMaterialId = forApprovalVersion.rawMaterialId as string;
            existingRecord.rawMaterialName = forApprovalVersion.rawMaterialName as string;
            existingRecord.rawMaterialUnitId = forApprovalVersion.rawMaterialUnitId as string;
            existingRecord.rawMaterialUnitName = forApprovalVersion.rawMaterialUnitName as string;
            existingRecord.rawMaterialSupplierId = forApprovalVersion.rawMaterialSupplierId as string;
            existingRecord.rawMaterialSupplierName = forApprovalVersion.rawMaterialSupplierName as string;
            existingRecord.rawMaterialsLocationId = forApprovalVersion.rawMaterialsLocationId as string;
            existingRecord.rawMaterialsLocationName = forApprovalVersion.rawMaterialsLocationName as string;
            existingRecord.rawMaterialNamePoNo = forApprovalVersion.rawMaterialNamePoNo as string;
            existingRecord.qty = forApprovalVersion.qty as number;
            existingRecord.lotNo = forApprovalVersion.lotNo as string;
        }
        existingRecord.forApprovalVersion = {};

        // Update status and add activity log
        existingRecord.status = StatusEnum.ACTIVE;
        const activityLog = `Date: ${new Date().toLocaleString('en-US', {
            timeZone: 'Asia/Manila',
        })}, Raw materials stock approved by ${user.username}`;
        existingRecord.activityLogs = [...(existingRecord.activityLogs || []), activityLog];

        // Limit activity logs to last 10 entries
        existingRecord.activityLogs = reduceArrayContents(existingRecord.activityLogs, ACTIVITY_LOGS_LIMIT);

        // Update record in database
        const updatedRecord = await this.rawMaterialsStockDatabaseService.updateRecord(existingRecord);

        return new ResponseDto<RawMaterialsStockDto>(updatedRecord, HTTP_STATUS_OK);
    }

    /**
     * Approves deletion of a raw materials stock record
     */
    private async approveDeletion(existingRecord: RawMaterialsStockDto): Promise<ResponseDto<RawMaterialsStockDto>> {
        this.logger.log(`Raw materials stock deletion approved: ${existingRecord.rawMaterialsStockId}`);
        await this.rawMaterialsStockDatabaseService.deleteRecord(existingRecord);
        return new ResponseDto<RawMaterialsStockDto>(existingRecord, HTTP_STATUS_OK);
    }

    /**
     * Centralized error handling
     */
    private handleError(error: unknown, recordId: string): never {
        this.logger.error(`Error processing approve request for ${recordId}:`, error);

        // Re-throw known exceptions
        if (
            error instanceof BadRequestException ||
            error instanceof NotFoundException ||
            error instanceof ForbiddenException
        ) {
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
        return 'An unknown error occurred during approval';
    }
}
