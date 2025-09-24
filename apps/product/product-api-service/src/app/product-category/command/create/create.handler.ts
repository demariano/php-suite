import { ErrorResponseDto, ProductCategoryDto, ResponseDto, StatusEnum, UserRole } from '@dto';
import { BadRequestException, Inject, Logger } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { ProductCategoryDatabaseServiceAbstract } from '@product-database-service';
import { CreateProductCategoryCommand } from './create.command';

// Constants
const ACTIVITY_LOGS_LIMIT = 10;
const HTTP_STATUS_CREATED = 201;

@CommandHandler(CreateProductCategoryCommand)
export class CreateProductCategoryHandler implements ICommandHandler<CreateProductCategoryCommand> {
    protected readonly logger = new Logger(CreateProductCategoryHandler.name);

    constructor(
        @Inject('ProductCategoryDatabaseService')
        private readonly productCategoryDatabaseService: ProductCategoryDatabaseServiceAbstract
    ) {}

    async execute(command: CreateProductCategoryCommand): Promise<ResponseDto<ProductCategoryDto | ErrorResponseDto>> {
        this.logger.log(
            `Processing create request for product category: ${command.productCategoryDto.productCategoryName}`
        );

        try {
            // Validate that product category name doesn't already exist
            await this.validateProductCategoryNameUnique(command.productCategoryDto.productCategoryName);

            // Check user authorization and determine status
            const hasApprovalPermission = this.hasApprovalPermission(command.user.roles);

            // Update status and activity logs based on permissions
            this.updateProductCategoryStatus(command, hasApprovalPermission);

            // Create record in database
            const createdRecord = await this.productCategoryDatabaseService.createRecord(command.productCategoryDto);

            this.logger.log(`Product category created successfully: ${createdRecord.productCategoryId}`);
            return new ResponseDto<ProductCategoryDto>(createdRecord, HTTP_STATUS_CREATED);
        } catch (error) {
            return this.handleError(error, command.productCategoryDto.productCategoryName);
        }
    }

    /**
     * Validates that the product category name is unique
     */
    private async validateProductCategoryNameUnique(productCategoryName: string): Promise<void> {
        const existingRecord = await this.productCategoryDatabaseService.findRecordByName(productCategoryName);

        if (existingRecord) {
            this.logger.warn(`Product category name already exists: ${productCategoryName}`);
            throw new BadRequestException('Product category name already exists');
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
     * Updates product category status and activity logs based on user permissions
     */
    private updateProductCategoryStatus(command: CreateProductCategoryCommand, hasApprovalPermission: boolean): void {
        if (hasApprovalPermission) {
            // User can approve directly - set to ACTIVE
            command.productCategoryDto.status = StatusEnum.ACTIVE;
            command.productCategoryDto.activityLogs = [];
            command.productCategoryDto.activityLogs.push(
                `Date: ${new Date().toLocaleString('en-US', {
                    timeZone: 'Asia/Manila',
                })}, Product category created by ${command.user.username}, status set to ${StatusEnum.ACTIVE}`
            );
        } else {
            // User needs approval - set to FOR_APPROVAL
            command.productCategoryDto.status = StatusEnum.FOR_APPROVAL;
            command.productCategoryDto.activityLogs = [];
            command.productCategoryDto.activityLogs.push(
                `Date: ${new Date().toLocaleString('en-US', {
                    timeZone: 'Asia/Manila',
                })}, Product category created by ${command.user.username} for approval`
            );
        }
    }

    /**
     * Centralized error handling
     */
    private handleError(error: unknown, productCategoryName: string): never {
        this.logger.error(`Error processing create request for ${productCategoryName}:`, error);

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
