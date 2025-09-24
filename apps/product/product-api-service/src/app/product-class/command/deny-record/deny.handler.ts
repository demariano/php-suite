import { UserCognito } from '@auth-guard-lib';
import { ErrorResponseDto, ProductClassDto, ResponseDto, StatusEnum, UserRole } from '@dto';
import { reduceArrayContents } from '@dynamo-db-lib';
import { BadRequestException, ForbiddenException, Inject, Logger, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { ProductClassDatabaseServiceAbstract } from '@product-database-service';
import { DenyProductClassCommand } from './deny.command';

// Constants
const ACTIVITY_LOGS_LIMIT = 10;
const HTTP_STATUS_OK = 200;

@CommandHandler(DenyProductClassCommand)
export class DenyProductClassHandler implements ICommandHandler<DenyProductClassCommand> {
    protected readonly logger = new Logger(DenyProductClassHandler.name);

    constructor(
        @Inject('ProductClassDatabaseService')
        private readonly productClassDatabaseService: ProductClassDatabaseServiceAbstract
    ) {}

    async execute(command: DenyProductClassCommand): Promise<ResponseDto<ProductClassDto | ErrorResponseDto>> {
        this.logger.log(`Processing deny request for product class: ${command.productClassId}`);

        try {
            // Validate record exists
            const existingRecord = await this.validateProductClassExists(command.productClassId);

            // Check user authorization
            this.validateUserAuthorization(command.user.roles);

            // Process approval based on current status
            return await this.processDeny(existingRecord, command.user);
        } catch (error) {
            return this.handleError(error, command.productClassId);
        }
    }

    /**
     * Validates that the product class record exists
     */
    private async validateProductClassExists(productClassId: string): Promise<ProductClassDto> {
        const existingRecord = await this.productClassDatabaseService.findRecordById(productClassId);

        if (!existingRecord) {
            this.logger.warn(`Product class not found: ${productClassId}`);
            throw new NotFoundException(`Product class record not found for id ${productClassId}`);
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
            throw new ForbiddenException('Current user is not authorized to approve product class change request');
        }
    }

    /**
     * Processes the approval based on the current status of the record
     */
    private async processDeny(
        existingRecord: ProductClassDto,
        user: UserCognito
    ): Promise<ResponseDto<ProductClassDto>> {
        switch (existingRecord.status) {
            case StatusEnum.FOR_APPROVAL:
                return await this.denyProductClass(existingRecord, user);
            case StatusEnum.FOR_DELETION:
                return await this.denyDeletion(existingRecord);
            default:
                throw new BadRequestException(`Cannot approve product class with status: ${existingRecord.status}`);
        }
    }

    /**
     * Approves a product class for approval
     */
    private async denyProductClass(
        existingRecord: ProductClassDto,
        user: UserCognito
    ): Promise<ResponseDto<ProductClassDto>> {
        // Update status and add activity log
        existingRecord.status = StatusEnum.ACTIVE;
        existingRecord.activityLogs.push(
            `Product class denied by ${user.username}, status set to ${StatusEnum.ACTIVE}`
        );

        // Optimize activity logs
        existingRecord.activityLogs = reduceArrayContents(existingRecord.activityLogs, ACTIVITY_LOGS_LIMIT);
        existingRecord.forApprovalVersion = {};

        // Update record in database
        const updatedRecord = await this.productClassDatabaseService.updateRecord(existingRecord);

        this.logger.log(`Product class approved successfully: ${existingRecord.productClassId}`);
        return new ResponseDto<ProductClassDto>(updatedRecord, HTTP_STATUS_OK);
    }

    /**
     * Approves deletion of a product class
     */
    private async denyDeletion(existingRecord: ProductClassDto): Promise<ResponseDto<ProductClassDto>> {
        this.logger.log(`Product class deletion approved: ${existingRecord.productClassId}`);
        existingRecord.status = StatusEnum.ACTIVE;
        const updatedRecord = await this.productClassDatabaseService.updateRecord(existingRecord);
        return new ResponseDto<ProductClassDto>(updatedRecord, HTTP_STATUS_OK);
    }

    /**
     * Centralized error handling
     */
    private handleError(error: unknown, productClassId: string): never {
        this.logger.error(`Error processing approval request for ${productClassId}:`, error);

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
