import { ErrorResponseDto, ProductDealDto, ResponseDto, StatusEnum, UserRole } from '@dto';
import { BadRequestException, Inject, Logger } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { ProductDealDatabaseServiceAbstract } from '@product-database-service';
import { CreateProductDealCommand } from './create.command';

// Constants
const ACTIVITY_LOGS_LIMIT = 10;
const HTTP_STATUS_CREATED = 201;

@CommandHandler(CreateProductDealCommand)
export class CreateProductDealHandler implements ICommandHandler<CreateProductDealCommand> {
    protected readonly logger = new Logger(CreateProductDealHandler.name);

    constructor(
        @Inject('ProductDealDatabaseService')
        private readonly productDealDatabaseService: ProductDealDatabaseServiceAbstract
    ) {}

    async execute(command: CreateProductDealCommand): Promise<ResponseDto<ProductDealDto | ErrorResponseDto>> {
        this.logger.log(`Processing create request for product deal: ${command.productDealDto.productDealName}`);

        try {
            // Validate that product deal name doesn't already exist
            await this.validateProductDealNameUnique(command.productDealDto.productDealName);

            // Check user authorization and determine status
            const hasApprovalPermission = this.hasApprovalPermission(command.user.roles);

            // Update status and activity logs based on permissions
            this.updateProductDealStatus(command, hasApprovalPermission);

            // Create record in database
            const createdRecord = await this.productDealDatabaseService.createRecord(command.productDealDto);

            this.logger.log(`Product deal created successfully: ${createdRecord.productDealId}`);
            return new ResponseDto<ProductDealDto>(createdRecord, HTTP_STATUS_CREATED);
        } catch (error) {
            return this.handleError(error, command.productDealDto.productDealName);
        }
    }

    /**
     * Validates that the product deal name is unique
     */
    private async validateProductDealNameUnique(productDealName: string): Promise<void> {
        const existingRecord = await this.productDealDatabaseService.findRecordByName(productDealName);

        if (existingRecord) {
            this.logger.warn(`Product deal name already exists: ${productDealName}`);
            throw new BadRequestException('Product deal name already exists');
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
     * Updates product deal status and activity logs based on user permissions
     */
    private updateProductDealStatus(command: CreateProductDealCommand, hasApprovalPermission: boolean): void {
        if (hasApprovalPermission) {
            // User can approve directly - set to ACTIVE
            command.productDealDto.status = StatusEnum.ACTIVE;
            command.productDealDto.activityLogs = [];
            command.productDealDto.activityLogs.push(
                `Date: ${new Date().toLocaleString('en-US', {
                    timeZone: 'Asia/Manila',
                })}, Product deal created by ${command.user.username}, status set to ${StatusEnum.ACTIVE}`
            );
        } else {
            // User needs approval - set to FOR_APPROVAL
            command.productDealDto.status = StatusEnum.FOR_APPROVAL;
            command.productDealDto.activityLogs = [];
            command.productDealDto.activityLogs.push(
                `Date: ${new Date().toLocaleString('en-US', {
                    timeZone: 'Asia/Manila',
                })}, Product deal created by ${command.user.username} for approval`
            );
        }
    }

    /**
     * Centralized error handling
     */
    private handleError(error: unknown, productDealName: string): never {
        this.logger.error(`Error processing create request for ${productDealName}:`, error);

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
