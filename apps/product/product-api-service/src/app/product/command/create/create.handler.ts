import { ErrorResponseDto, ProductDto, ResponseDto, StatusEnum, UserRole } from '@dto';
import { BadRequestException, Inject, Logger } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { ProductDatabaseServiceAbstract } from '@product-database-service';
import { CreateProductCommand } from './create.command';

// Constants
const HTTP_STATUS_CREATED = 201;
const ACTIVITY_LOGS_LIMIT = 10;

@CommandHandler(CreateProductCommand)
export class CreateProductHandler implements ICommandHandler<CreateProductCommand> {
    protected readonly logger = new Logger(CreateProductHandler.name);

    constructor(
        @Inject('ProductDatabaseService')
        private readonly productDatabaseService: ProductDatabaseServiceAbstract
    ) {}

    async execute(command: CreateProductCommand): Promise<ResponseDto<ProductDto | ErrorResponseDto>> {
        this.logger.log(`Processing create request for product: ${command.productDto.productName}`);

        try {
            // Validate that product name doesn't already exist
            await this.validateProductNameUnique(command.productDto.productName);

            // Check user authorization and determine status
            const hasApprovalPermission = this.hasApprovalPermission(command.user.roles);

            // Update status and activity logs based on permissions
            this.updateProductStatus(command, hasApprovalPermission);

            // Create record in database
            const createdRecord = await this.productDatabaseService.createRecord(command.productDto);

            this.logger.log(`Product created successfully: ${createdRecord.productId}`);
            return new ResponseDto<ProductDto>(createdRecord, HTTP_STATUS_CREATED);
        } catch (error) {
            return this.handleError(error, command.productDto.productName);
        }
    }

    /**
     * Validates that the product name is unique
     */
    private async validateProductNameUnique(productName: string): Promise<void> {
        const existingRecord = await this.productDatabaseService.findRecordByName(productName);

        if (existingRecord) {
            this.logger.warn(`Product name already exists: ${productName}`);
            throw new BadRequestException('Product name already exists');
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
     * Updates product status and activity logs based on user permissions
     */
    private updateProductStatus(command: CreateProductCommand, hasApprovalPermission: boolean): void {
        if (hasApprovalPermission) {
            // User can approve directly - set to ACTIVE
            command.productDto.status = StatusEnum.ACTIVE;
            command.productDto.activityLogs = [];
            command.productDto.activityLogs.push(
                `Date: ${new Date().toLocaleString('en-US', {
                    timeZone: 'Asia/Manila',
                })}, Product created by ${command.user.username}, status set to ${StatusEnum.ACTIVE}`
            );

            // Limit activity logs to last 10 entries
            command.productDto.activityLogs = reduceArrayContents(command.productDto.activityLogs, ACTIVITY_LOGS_LIMIT);
        } else {
            // User needs approval - set to FOR_APPROVAL
            command.productDto.status = StatusEnum.NEW_RECORD;
            command.productDto.activityLogs = [];
            command.productDto.activityLogs.push(
                `Date: ${new Date().toLocaleString('en-US', {
                    timeZone: 'Asia/Manila',
                })}, Product created by ${command.user.username} for approval`
            );

            // Limit activity logs to last 10 entries
            command.productDto.activityLogs = reduceArrayContents(command.productDto.activityLogs, ACTIVITY_LOGS_LIMIT);

            //set the forApprovalVersion
            command.productDto.forApprovalVersion = {};
            command.productDto.forApprovalVersion.productName = command.productDto.productName;
            command.productDto.forApprovalVersion.criticalLevel = command.productDto.criticalLevel;
            command.productDto.forApprovalVersion.productCategoryId = command.productDto.productCategoryId;
            command.productDto.forApprovalVersion.productCategoryName = command.productDto.productCategoryName;
            command.productDto.forApprovalVersion.productClassId = command.productDto.productClassId;
            command.productDto.forApprovalVersion.productClassName = command.productDto.productClassName;
            command.productDto.forApprovalVersion.productDeals = command.productDto.productDeals;
            command.productDto.forApprovalVersion.productUnitPrice = command.productDto.productUnitPrice;
        }
    }

    /**
     * Centralized error handling
     */
    private handleError(error: unknown, productName: string): never {
        this.logger.error(`Error processing create request for ${productName}:`, error);

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
