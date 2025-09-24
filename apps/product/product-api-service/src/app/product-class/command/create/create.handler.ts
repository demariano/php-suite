import { ErrorResponseDto, ProductClassDto, ResponseDto, StatusEnum, UserRole } from '@dto';
import { BadRequestException, Inject, Logger } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { ProductClassDatabaseServiceAbstract } from '@product-database-service';
import { CreateProductClassCommand } from './create.command';

// Constants
const ACTIVITY_LOGS_LIMIT = 10;
const HTTP_STATUS_CREATED = 201;

@CommandHandler(CreateProductClassCommand)
export class CreateProductClassHandler implements ICommandHandler<CreateProductClassCommand> {
    protected readonly logger = new Logger(CreateProductClassHandler.name);

    constructor(
        @Inject('ProductClassDatabaseService')
        private readonly productClassDatabaseService: ProductClassDatabaseServiceAbstract
    ) {}

    async execute(command: CreateProductClassCommand): Promise<ResponseDto<ProductClassDto | ErrorResponseDto>> {
        this.logger.log(`Processing create request for product class: ${command.productClassDto.productClassName}`);

        try {
            // Validate that product class name doesn't already exist
            await this.validateProductClassNameUnique(command.productClassDto.productClassName);

            // Check user authorization and determine status
            const hasApprovalPermission = this.hasApprovalPermission(command.user.roles);

            // Update status and activity logs based on permissions
            this.updateProductClassStatus(command, hasApprovalPermission);

            // Create record in database
            const createdRecord = await this.productClassDatabaseService.createRecord(command.productClassDto);

            this.logger.log(`Product class created successfully: ${createdRecord.productClassId}`);
            return new ResponseDto<ProductClassDto>(createdRecord, HTTP_STATUS_CREATED);
        } catch (error) {
            return this.handleError(error, command.productClassDto.productClassName);
        }
    }

    /**
     * Validates that the product class name is unique
     */
    private async validateProductClassNameUnique(productClassName: string): Promise<void> {
        const existingRecord = await this.productClassDatabaseService.findRecordByName(productClassName);

        if (existingRecord) {
            this.logger.warn(`Product class name already exists: ${productClassName}`);
            throw new BadRequestException('Product class name already exists');
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
     * Updates product class status and activity logs based on user permissions
     */
    private updateProductClassStatus(command: CreateProductClassCommand, hasApprovalPermission: boolean): void {
        if (hasApprovalPermission) {
            // User can approve directly - set to ACTIVE
            command.productClassDto.status = StatusEnum.ACTIVE;
            command.productClassDto.activityLogs = [];
            command.productClassDto.activityLogs.push(
                `Date: ${new Date().toLocaleString('en-US', {
                    timeZone: 'Asia/Manila',
                })}, Product class created by ${command.user.username}, status set to ${StatusEnum.ACTIVE}`
            );
        } else {
            // User needs approval - set to FOR_APPROVAL
            command.productClassDto.status = StatusEnum.FOR_APPROVAL;
            command.productClassDto.activityLogs = [];
            command.productClassDto.activityLogs.push(
                `Date: ${new Date().toLocaleString('en-US', {
                    timeZone: 'Asia/Manila',
                })}, Product class created by ${command.user.username} for approval`
            );
        }
    }

    /**
     * Centralized error handling
     */
    private handleError(error: unknown, productClassName: string): never {
        this.logger.error(`Error processing create request for ${productClassName}:`, error);

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
