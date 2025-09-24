import { ErrorResponseDto, ProductPriceTypeDto, ResponseDto, StatusEnum, UserRole } from '@dto';
import { BadRequestException, Inject, Logger } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { ProductPriceTypeDatabaseServiceAbstract } from '@product-database-service';
import { CreateProductPriceTypeCommand } from './create.command';

// Constants
const ACTIVITY_LOGS_LIMIT = 10;
const HTTP_STATUS_CREATED = 201;

@CommandHandler(CreateProductPriceTypeCommand)
export class CreateProductPriceTypeHandler implements ICommandHandler<CreateProductPriceTypeCommand> {
    protected readonly logger = new Logger(CreateProductPriceTypeHandler.name);

    constructor(
        @Inject('ProductPriceTypeDatabaseService')
        private readonly productPriceTypeDatabaseService: ProductPriceTypeDatabaseServiceAbstract
    ) {}

    async execute(
        command: CreateProductPriceTypeCommand
    ): Promise<ResponseDto<ProductPriceTypeDto | ErrorResponseDto>> {
        this.logger.log(
            `Processing create request for product price type: ${command.productPriceTypeDto.productPriceTypeName}`
        );

        try {
            // Validate that product price type name doesn't already exist
            await this.validateProductPriceTypeNameUnique(command.productPriceTypeDto.productPriceTypeName);

            // Check user authorization and determine status
            const hasApprovalPermission = this.hasApprovalPermission(command.user.roles);

            // Update status and activity logs based on permissions
            this.updateProductPriceTypeStatus(command, hasApprovalPermission);

            // Create record in database
            const createdRecord = await this.productPriceTypeDatabaseService.createRecord(command.productPriceTypeDto);

            this.logger.log(`Product price type created successfully: ${createdRecord.productPriceTypeId}`);
            return new ResponseDto<ProductPriceTypeDto>(createdRecord, HTTP_STATUS_CREATED);
        } catch (error) {
            return this.handleError(error, command.productPriceTypeDto.productPriceTypeName);
        }
    }

    /**
     * Validates that the product price type name is unique
     */
    private async validateProductPriceTypeNameUnique(productPriceTypeName: string): Promise<void> {
        const existingRecord = await this.productPriceTypeDatabaseService.findRecordByName(productPriceTypeName);

        if (existingRecord) {
            this.logger.warn(`Product price type name already exists: ${productPriceTypeName}`);
            throw new BadRequestException('Product price type name already exists');
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
     * Updates product price type status and activity logs based on user permissions
     */
    private updateProductPriceTypeStatus(command: CreateProductPriceTypeCommand, hasApprovalPermission: boolean): void {
        if (hasApprovalPermission) {
            // User can approve directly - set to ACTIVE
            command.productPriceTypeDto.status = StatusEnum.ACTIVE;
            command.productPriceTypeDto.activityLogs = [];
            command.productPriceTypeDto.activityLogs.push(
                `Date: ${new Date().toLocaleString('en-US', {
                    timeZone: 'Asia/Manila',
                })}, Product price type created by ${command.user.username}, status set to ${StatusEnum.ACTIVE}`
            );
        } else {
            // User needs approval - set to FOR_APPROVAL
            command.productPriceTypeDto.status = StatusEnum.FOR_APPROVAL;
            command.productPriceTypeDto.activityLogs = [];
            command.productPriceTypeDto.activityLogs.push(
                `Date: ${new Date().toLocaleString('en-US', {
                    timeZone: 'Asia/Manila',
                })}, Product price type created by ${command.user.username} for approval`
            );
        }
    }

    /**
     * Centralized error handling
     */
    private handleError(error: unknown, productPriceTypeName: string): never {
        this.logger.error(`Error processing create request for ${productPriceTypeName}:`, error);

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
