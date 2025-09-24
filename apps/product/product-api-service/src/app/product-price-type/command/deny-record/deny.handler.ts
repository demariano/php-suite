import { UserCognito } from '@auth-guard-lib';
import { ErrorResponseDto, ProductPriceTypeDto, ResponseDto, StatusEnum, UserRole } from '@dto';
import { reduceArrayContents } from '@dynamo-db-lib';
import { BadRequestException, ForbiddenException, Inject, Logger, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { ProductPriceTypeDatabaseServiceAbstract } from '@product-database-service';
import { DenyProductPriceTypeCommand } from './deny.command';

// Constants
const ACTIVITY_LOGS_LIMIT = 10;
const HTTP_STATUS_OK = 200;

@CommandHandler(DenyProductPriceTypeCommand)
export class DenyProductPriceTypeHandler implements ICommandHandler<DenyProductPriceTypeCommand> {
    protected readonly logger = new Logger(DenyProductPriceTypeHandler.name);

    constructor(
        @Inject('ProductPriceTypeDatabaseService')
        private readonly productPriceTypeDatabaseService: ProductPriceTypeDatabaseServiceAbstract
    ) {}

    async execute(command: DenyProductPriceTypeCommand): Promise<ResponseDto<ProductPriceTypeDto | ErrorResponseDto>> {
        this.logger.log(`Processing deny request for product price type: ${command.productPriceTypeId}`);

        try {
            // Validate record exists
            const existingRecord = await this.validateProductPriceTypeExists(command.productPriceTypeId);

            // Check user authorization
            this.validateUserAuthorization(command.user.roles);

            // Process approval based on current status
            return await this.processDeny(existingRecord, command.user);
        } catch (error) {
            return this.handleError(error, command.productPriceTypeId);
        }
    }

    /**
     * Validates that the product price type record exists
     */
    private async validateProductPriceTypeExists(productPriceTypeId: string): Promise<ProductPriceTypeDto> {
        const existingRecord = await this.productPriceTypeDatabaseService.findRecordById(productPriceTypeId);

        if (!existingRecord) {
            this.logger.warn(`Product price type not found: ${productPriceTypeId}`);
            throw new NotFoundException(`Product price type record not found for id ${productPriceTypeId}`);
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
            throw new ForbiddenException('Current user is not authorized to approve product price type change request');
        }
    }

    /**
     * Processes the approval based on the current status of the record
     */
    private async processDeny(
        existingRecord: ProductPriceTypeDto,
        user: UserCognito
    ): Promise<ResponseDto<ProductPriceTypeDto>> {
        switch (existingRecord.status) {
            case StatusEnum.FOR_APPROVAL:
                return await this.denyProductPriceType(existingRecord, user);
            case StatusEnum.FOR_DELETION:
                return await this.denyDeletion(existingRecord);
            default:
                throw new BadRequestException(
                    `Cannot approve product price type with status: ${existingRecord.status}`
                );
        }
    }

    /**
     * Approves a product price type for approval
     */
    private async denyProductPriceType(
        existingRecord: ProductPriceTypeDto,
        user: UserCognito
    ): Promise<ResponseDto<ProductPriceTypeDto>> {
        // Update status and add activity log
        existingRecord.status = StatusEnum.ACTIVE;
        existingRecord.activityLogs.push(
            `Product price type denied by ${user.username}, status set to ${StatusEnum.ACTIVE}`
        );

        // Optimize activity logs
        existingRecord.activityLogs = reduceArrayContents(existingRecord.activityLogs, ACTIVITY_LOGS_LIMIT);
        existingRecord.forApprovalVersion = {};

        // Update record in database
        const updatedRecord = await this.productPriceTypeDatabaseService.updateRecord(existingRecord);

        this.logger.log(`Product price type approved successfully: ${existingRecord.productPriceTypeId}`);
        return new ResponseDto<ProductPriceTypeDto>(updatedRecord, HTTP_STATUS_OK);
    }

    /**
     * Approves deletion of a product price type
     */
    private async denyDeletion(existingRecord: ProductPriceTypeDto): Promise<ResponseDto<ProductPriceTypeDto>> {
        this.logger.log(`Product price type deletion approved: ${existingRecord.productPriceTypeId}`);
        existingRecord.status = StatusEnum.ACTIVE;
        const updatedRecord = await this.productPriceTypeDatabaseService.updateRecord(existingRecord);
        return new ResponseDto<ProductPriceTypeDto>(updatedRecord, HTTP_STATUS_OK);
    }

    /**
     * Centralized error handling
     */
    private handleError(error: unknown, productPriceTypeId: string): never {
        this.logger.error(`Error processing approval request for ${productPriceTypeId}:`, error);

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
