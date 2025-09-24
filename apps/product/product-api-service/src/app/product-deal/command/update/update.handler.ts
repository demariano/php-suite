import { ErrorResponseDto, ProductDealDto, ResponseDto, StatusEnum, UserRole } from '@dto';
import { reduceArrayContents } from '@dynamo-db-lib';
import { BadRequestException, Inject, Logger, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { ProductDealDatabaseServiceAbstract } from '@product-database-service';
import { UpdateProductDealCommand } from './update.command';

// Constants
const ACTIVITY_LOGS_LIMIT = 10;
const HTTP_STATUS_OK = 200;

@CommandHandler(UpdateProductDealCommand)
export class UpdateProductDealHandler implements ICommandHandler<UpdateProductDealCommand> {
    protected readonly logger = new Logger(UpdateProductDealHandler.name);

    constructor(
        @Inject('ProductDealDatabaseService')
        private readonly productDealDatabaseService: ProductDealDatabaseServiceAbstract
    ) {}

    async execute(command: UpdateProductDealCommand): Promise<ResponseDto<ProductDealDto | ErrorResponseDto>> {
        this.logger.log(`Processing update request for product deal: ${command.productDealDto.productDealId}`);

        try {
            // Validate record exists
            const existingRecord = await this.validateProductDealExists(command.productDealDto.productDealId);

            // Check user authorization and determine status
            const hasApprovalPermission = this.hasApprovalPermission(command.user.roles);

            // Update status and activity logs based on permissions
            this.updateProductDealStatus(existingRecord, command, hasApprovalPermission);

            // Optimize activity logs
            existingRecord.activityLogs = reduceArrayContents(existingRecord.activityLogs, ACTIVITY_LOGS_LIMIT);

            // Update record in database
            const updatedRecord = await this.productDealDatabaseService.updateRecord(existingRecord);

            this.logger.log(`Product deal updated successfully: ${existingRecord.productDealId}`);
            return new ResponseDto<ProductDealDto>(updatedRecord, HTTP_STATUS_OK);
        } catch (error) {
            return this.handleError(error, command.productDealDto.productDealId);
        }
    }

    /**
     * Validates that the product deal record exists
     */
    private async validateProductDealExists(productDealId: string): Promise<ProductDealDto> {
        const existingRecord = await this.productDealDatabaseService.findRecordById(productDealId);

        if (!existingRecord) {
            this.logger.warn(`Product deal not found: ${productDealId}`);
            throw new NotFoundException(`Product deal record not found for id ${productDealId}`);
        }

        if (existingRecord.status == StatusEnum.FOR_DELETION || existingRecord.status == StatusEnum.FOR_APPROVAL) {
            throw new BadRequestException('Product deal is already for deletion or approval');
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
     * Updates product deal status and activity logs based on user permissions
     */
    private updateProductDealStatus(
        existingRecord: ProductDealDto,
        command: UpdateProductDealCommand,
        hasApprovalPermission: boolean
    ): void {
        if (hasApprovalPermission) {
            // User can approve directly - set to ACTIVE
            existingRecord.status = StatusEnum.ACTIVE;
            existingRecord.additionalQty = command.productDealDto.additionalQty;
            existingRecord.minQty = command.productDealDto.minQty;
            existingRecord.productDealName = command.productDealDto.productDealName;
            existingRecord.activityLogs.push(
                `Date: ${new Date().toLocaleString('en-US', {
                    timeZone: 'Asia/Manila',
                })}, Product deal updated by ${command.user.username}, status set to ${StatusEnum.ACTIVE}`
            );
        } else {
            // User needs approval - set to FOR_APPROVAL
            existingRecord.status = StatusEnum.FOR_APPROVAL;
            existingRecord.forApprovalVersion = {};
            existingRecord.forApprovalVersion.productDealName = command.productDealDto.productDealName;
            existingRecord.forApprovalVersion.additionalQty = command.productDealDto.additionalQty;
            existingRecord.forApprovalVersion.minQty = command.productDealDto.minQty;
            existingRecord.activityLogs.push(
                `Date: ${new Date().toLocaleString('en-US', {
                    timeZone: 'Asia/Manila',
                })}, Product deal updated by ${command.user.username} for approval`
            );
        }
    }

    /**
     * Centralized error handling
     */
    private handleError(error: unknown, productDealId: string): never {
        this.logger.error(`Error processing update request for ${productDealId}:`, error);

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
