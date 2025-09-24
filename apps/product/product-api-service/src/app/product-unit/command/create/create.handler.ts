import { ErrorResponseDto, ProductUnitDto, ResponseDto, StatusEnum, UserRole } from '@dto';
import { BadRequestException, Inject, Logger } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { ProductUnitDatabaseServiceAbstract } from '@product-database-service';
import { CreateProductUnitCommand } from './create.command';

// Constants
const ACTIVITY_LOGS_LIMIT = 10;
const HTTP_STATUS_CREATED = 201;

@CommandHandler(CreateProductUnitCommand)
export class CreateProductUnitHandler implements ICommandHandler<CreateProductUnitCommand> {
    protected readonly logger = new Logger(CreateProductUnitHandler.name);

    constructor(
        @Inject('ProductUnitDatabaseService')
        private readonly productUnitDatabaseService: ProductUnitDatabaseServiceAbstract
    ) {}

    async execute(command: CreateProductUnitCommand): Promise<ResponseDto<ProductUnitDto | ErrorResponseDto>> {
        this.logger.log(`Processing create request for product unit: ${command.productUnitDto.productUnitName}`);

        try {
            // Validate that product unit name doesn't already exist
            await this.validateProductUnitNameUnique(command.productUnitDto.productUnitName);

            // Check user authorization and determine status
            const hasApprovalPermission = this.hasApprovalPermission(command.user.roles);

            // Update status and activity logs based on permissions
            this.updateProductUnitStatus(command, hasApprovalPermission);

            // Create record in database
            const createdRecord = await this.productUnitDatabaseService.createRecord(command.productUnitDto);

            this.logger.log(`Product unit created successfully: ${createdRecord.productUnitId}`);
            return new ResponseDto<ProductUnitDto>(createdRecord, HTTP_STATUS_CREATED);
        } catch (error) {
            return this.handleError(error, command.productUnitDto.productUnitName);
        }
    }

    /**
     * Validates that the product unit name is unique
     */
    private async validateProductUnitNameUnique(productUnitName: string): Promise<void> {
        const existingRecord = await this.productUnitDatabaseService.findRecordByName(productUnitName);

        if (existingRecord) {
            this.logger.warn(`Product unit name already exists: ${productUnitName}`);
            throw new BadRequestException('Product unit name already exists');
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
     * Updates product unit status and activity logs based on user permissions
     */
    private updateProductUnitStatus(command: CreateProductUnitCommand, hasApprovalPermission: boolean): void {
        if (hasApprovalPermission) {
            // User can approve directly - set to ACTIVE
            command.productUnitDto.status = StatusEnum.ACTIVE;
            command.productUnitDto.activityLogs = [];
            command.productUnitDto.activityLogs.push(
                `Date: ${new Date().toLocaleString('en-US', {
                    timeZone: 'Asia/Manila',
                })}, Product unit created by ${command.user.username}, status set to ${StatusEnum.ACTIVE}`
            );
        } else {
            // User needs approval - set to FOR_APPROVAL
            command.productUnitDto.status = StatusEnum.FOR_APPROVAL;
            command.productUnitDto.activityLogs = [];
            command.productUnitDto.activityLogs.push(
                `Date: ${new Date().toLocaleString('en-US', {
                    timeZone: 'Asia/Manila',
                })}, Product unit created by ${command.user.username} for approval`
            );
        }
    }

    /**
     * Centralized error handling
     */
    private handleError(error: unknown, productUnitName: string): never {
        this.logger.error(`Error processing create request for ${productUnitName}:`, error);

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
