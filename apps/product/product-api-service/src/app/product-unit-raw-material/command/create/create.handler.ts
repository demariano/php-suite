import { ErrorResponseDto, ProductUnitRawMaterialDto, ResponseDto, StatusEnum, UserRole } from '@dto';
import { reduceArrayContents } from '@dynamo-db-lib';
import { BadRequestException, Inject, Logger } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { ProductUnitRawMaterialDatabaseServiceAbstract } from '@product-database-service';
import { CreateProductUnitRawMaterialCommand } from './create.command';

// Constants
const HTTP_STATUS_CREATED = 201;
const ACTIVITY_LOGS_LIMIT = 10;

@CommandHandler(CreateProductUnitRawMaterialCommand)
export class CreateProductUnitRawMaterialHandler implements ICommandHandler<CreateProductUnitRawMaterialCommand> {
    protected readonly logger = new Logger(CreateProductUnitRawMaterialHandler.name);

    constructor(
        @Inject('ProductUnitRawMaterialDatabaseService')
        private readonly productUnitRawMaterialDatabaseService: ProductUnitRawMaterialDatabaseServiceAbstract
    ) {}

    async execute(
        command: CreateProductUnitRawMaterialCommand
    ): Promise<ResponseDto<ProductUnitRawMaterialDto | ErrorResponseDto>> {
        this.logger.log(
            `Processing create request for product unit raw material: ${command.productUnitRawMaterialDto.productId}`
        );

        try {
            // Validate that product raw material doesn't already exist for this product
            await this.validateProductRawMaterialUnique(command.productUnitRawMaterialDto.productId);

            // Check user authorization and determine status
            const hasApprovalPermission = this.hasApprovalPermission(command.user.roles);

            // Update status and activity logs based on permissions
            this.updateProductUnitRawMaterialStatus(command, hasApprovalPermission);

            // Create record in database
            const createdRecord = await this.productUnitRawMaterialDatabaseService.createRecord(
                command.productUnitRawMaterialDto
            );

            this.logger.log(
                `Product unit raw material created successfully: ${createdRecord.productUnitRawMaterialId}`
            );
            return new ResponseDto<ProductUnitRawMaterialDto>(createdRecord, HTTP_STATUS_CREATED);
        } catch (error) {
            return this.handleError(error, command.productUnitRawMaterialDto.productId);
        }
    }

    /**
     * Validates that the product raw material is unique for the product
     */
    private async validateProductRawMaterialUnique(productId: string): Promise<void> {
        const existingRecord = await this.productUnitRawMaterialDatabaseService.findRecordByProductId(productId);

        if (existingRecord) {
            this.logger.warn(`Product unit raw material already exists for product: ${productId}`);
            throw new BadRequestException('Product unit raw material already exists for this product');
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
     * Updates product unit raw material status and activity logs based on user permissions
     */
    private updateProductUnitRawMaterialStatus(
        command: CreateProductUnitRawMaterialCommand,
        hasApprovalPermission: boolean
    ): void {
        command.productUnitRawMaterialDto.activityLogs = command.productUnitRawMaterialDto.activityLogs ?? [];

        if (hasApprovalPermission) {
            // User can approve directly - set to ACTIVE
            command.productUnitRawMaterialDto.status = StatusEnum.ACTIVE;
            command.productUnitRawMaterialDto.activityLogs.push(
                `Date: ${new Date().toLocaleString('en-US', {
                    timeZone: 'Asia/Manila',
                })}, Product unit raw material created by ${command.user.username}, status set to ${StatusEnum.ACTIVE}`
            );

            // Limit activity logs to last 10 entries
            command.productUnitRawMaterialDto.activityLogs = reduceArrayContents(
                command.productUnitRawMaterialDto.activityLogs,
                ACTIVITY_LOGS_LIMIT
            );
            command.productUnitRawMaterialDto.forApprovalVersion = {};
            command.productUnitRawMaterialDto.changeReason = undefined;
        } else {
            // User needs approval - set to NEW_RECORD
            command.productUnitRawMaterialDto.status = StatusEnum.NEW_RECORD;
            command.productUnitRawMaterialDto.activityLogs.push(
                `Date: ${new Date().toLocaleString('en-US', {
                    timeZone: 'Asia/Manila',
                })}, Product unit raw material created by ${command.user.username} for approval`
            );

            // Limit activity logs to last 10 entries
            command.productUnitRawMaterialDto.activityLogs = reduceArrayContents(
                command.productUnitRawMaterialDto.activityLogs,
                ACTIVITY_LOGS_LIMIT
            );

            //set the forApprovalVersion
            command.productUnitRawMaterialDto.forApprovalVersion = {
                productId: command.productUnitRawMaterialDto.productId,
                productName: command.productUnitRawMaterialDto.productName,
                rawMaterialsPerUnit: command.productUnitRawMaterialDto.rawMaterialsPerUnit,
            };
        }
    }

    /**
     * Centralized error handling
     */
    private handleError(error: unknown, productId: string): never {
        this.logger.error(`Error processing create request for product ${productId}:`, error);

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
