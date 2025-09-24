import { ErrorResponseDto, ProductClassDto, ResponseDto, StatusEnum, UserRole } from '@dto';
import { reduceArrayContents } from '@dynamo-db-lib';
import { BadRequestException, Inject, Logger, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { ProductClassDatabaseServiceAbstract } from '@product-database-service';
import { UpdateProductClassCommand } from './update.command';

// Constants
const ACTIVITY_LOGS_LIMIT = 10;
const HTTP_STATUS_OK = 200;

@CommandHandler(UpdateProductClassCommand)
export class UpdateProductClassHandler implements ICommandHandler<UpdateProductClassCommand> {
    protected readonly logger = new Logger(UpdateProductClassHandler.name);

    constructor(
        @Inject('ProductClassDatabaseService')
        private readonly productClassDatabaseService: ProductClassDatabaseServiceAbstract
    ) {}

    async execute(command: UpdateProductClassCommand): Promise<ResponseDto<ProductClassDto | ErrorResponseDto>> {
        this.logger.log(`Processing update request for product class: ${command.productClassDto.productClassId}`);

        try {
            // Validate record exists
            const existingRecord = await this.validateProductClassExists(command.productClassDto.productClassId);

            // Check user authorization and determine status
            const hasApprovalPermission = this.hasApprovalPermission(command.user.roles);

            // Update status and activity logs based on permissions
            this.updateProductClassStatus(existingRecord, command, hasApprovalPermission);

            // Optimize activity logs
            existingRecord.activityLogs = reduceArrayContents(existingRecord.activityLogs, ACTIVITY_LOGS_LIMIT);

            // Update record in database
            const updatedRecord = await this.productClassDatabaseService.updateRecord(existingRecord);

            this.logger.log(`Product class updated successfully: ${existingRecord.productClassId}`);
            return new ResponseDto<ProductClassDto>(updatedRecord, HTTP_STATUS_OK);
        } catch (error) {
            return this.handleError(error, command.productClassDto.productClassId);
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

        if (existingRecord.status == StatusEnum.FOR_DELETION || existingRecord.status == StatusEnum.FOR_APPROVAL) {
            throw new BadRequestException('Product class is already for deletion or approval');
        }

        return existingRecord;
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
     * Updates product class status and activity logs based on user permissions
     */
    private updateProductClassStatus(
        existingRecord: ProductClassDto,
        command: UpdateProductClassCommand,
        hasApprovalPermission: boolean
    ): void {
        if (hasApprovalPermission) {
            // User can approve directly - set to ACTIVE
            existingRecord.status = StatusEnum.ACTIVE;
            existingRecord.productClassName = command.productClassDto.productClassName;
            existingRecord.activityLogs.push(
                `Date: ${new Date().toLocaleString('en-US', {
                    timeZone: 'Asia/Manila',
                })}, Product class updated by ${command.user.username}, status set to ${StatusEnum.ACTIVE}`
            );
        } else {
            // User needs approval - set to FOR_APPROVAL
            existingRecord.status = StatusEnum.FOR_APPROVAL;
            existingRecord.forApprovalVersion = {};
            existingRecord.forApprovalVersion.productClassName = command.productClassDto.productClassName;
            existingRecord.activityLogs.push(
                `Date: ${new Date().toLocaleString('en-US', {
                    timeZone: 'Asia/Manila',
                })}, Product class updated by ${command.user.username} for approval`
            );
        }
    }

    /**
     * Centralized error handling
     */
    private handleError(error: unknown, productClassId: string): never {
        this.logger.error(`Error processing update request for ${productClassId}:`, error);

        // Re-throw known exceptions
        if (error instanceof NotFoundException) {
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
