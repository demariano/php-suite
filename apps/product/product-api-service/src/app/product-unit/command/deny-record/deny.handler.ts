import { UserCognito } from '@auth-guard-lib';
import { ErrorResponseDto, ProductUnitDto, ResponseDto, StatusEnum, UserRole } from '@dto';
import { reduceArrayContents } from '@dynamo-db-lib';
import { BadRequestException, ForbiddenException, Inject, Logger, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { ProductUnitDatabaseServiceAbstract } from '@product-database-service';
import { DenyProductUnitCommand } from './deny.command';

// Constants
const ACTIVITY_LOGS_LIMIT = 10;
const HTTP_STATUS_OK = 200;

@CommandHandler(DenyProductUnitCommand)
export class DenyProductUnitHandler implements ICommandHandler<DenyProductUnitCommand> {
    protected readonly logger = new Logger(DenyProductUnitHandler.name);

    constructor(
        @Inject('ProductUnitDatabaseService')
        private readonly productUnitDatabaseService: ProductUnitDatabaseServiceAbstract
    ) {}

    async execute(command: DenyProductUnitCommand): Promise<ResponseDto<ProductUnitDto | ErrorResponseDto>> {
        this.logger.log(`Processing deny request for product unit: ${command.productUnitId}`);

        try {
            // Validate record exists
            const existingRecord = await this.validateProductUnitExists(command.productUnitId);

            // Check user authorization
            this.validateUserAuthorization(command.user.roles);

            // Process approval based on current status
            return await this.processDeny(existingRecord, command.user);
        } catch (error) {
            return this.handleError(error, command.productUnitId);
        }
    }

    /**
     * Validates that the product unit record exists
     */
    private async validateProductUnitExists(productUnitId: string): Promise<ProductUnitDto> {
        const existingRecord = await this.productUnitDatabaseService.findRecordById(productUnitId);

        if (!existingRecord) {
            this.logger.warn(`Product unit not found: ${productUnitId}`);
            throw new NotFoundException(`Product unit record not found for id ${productUnitId}`);
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
            throw new ForbiddenException('Current user is not authorized to approve product unit change request');
        }
    }

    /**
     * Processes the approval based on the current status of the record
     */
    private async processDeny(existingRecord: ProductUnitDto, user: UserCognito): Promise<ResponseDto<ProductUnitDto>> {
        switch (existingRecord.status) {
            case StatusEnum.FOR_APPROVAL:
                return await this.denyProductUnit(existingRecord, user);
            case StatusEnum.FOR_DELETION:
                return await this.denyDeletion(existingRecord);
            default:
                throw new BadRequestException(`Cannot approve product unit with status: ${existingRecord.status}`);
        }
    }

    /**
     * Approves a product unit for approval
     */
    private async denyProductUnit(
        existingRecord: ProductUnitDto,
        user: UserCognito
    ): Promise<ResponseDto<ProductUnitDto>> {
        // Update status and add activity log
        existingRecord.status = StatusEnum.ACTIVE;
        existingRecord.activityLogs.push(`Product unit denied by ${user.username}, status set to ${StatusEnum.ACTIVE}`);

        // Optimize activity logs
        existingRecord.activityLogs = reduceArrayContents(existingRecord.activityLogs, ACTIVITY_LOGS_LIMIT);
        existingRecord.forApprovalVersion = {};

        // Update record in database
        const updatedRecord = await this.productUnitDatabaseService.updateRecord(existingRecord);

        this.logger.log(`Product unit approved successfully: ${existingRecord.productUnitId}`);
        return new ResponseDto<ProductUnitDto>(updatedRecord, HTTP_STATUS_OK);
    }

    /**
     * Approves deletion of a product unit
     */
    private async denyDeletion(existingRecord: ProductUnitDto): Promise<ResponseDto<ProductUnitDto>> {
        this.logger.log(`Product unit deletion approved: ${existingRecord.productUnitId}`);
        existingRecord.status = StatusEnum.ACTIVE;
        const updatedRecord = await this.productUnitDatabaseService.updateRecord(existingRecord);
        return new ResponseDto<ProductUnitDto>(updatedRecord, HTTP_STATUS_OK);
    }

    /**
     * Centralized error handling
     */
    private handleError(error: unknown, productUnitId: string): never {
        this.logger.error(`Error processing approval request for ${productUnitId}:`, error);

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
