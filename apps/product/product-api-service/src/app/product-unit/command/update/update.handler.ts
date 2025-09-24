import { ErrorResponseDto, ProductUnitDto, ResponseDto, StatusEnum, UserRole } from '@dto';
import { reduceArrayContents } from '@dynamo-db-lib';
import { BadRequestException, Inject, Logger, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { ProductUnitDatabaseServiceAbstract } from '@product-database-service';
import { UpdateProductUnitCommand } from './update.command';

// Constants
const ACTIVITY_LOGS_LIMIT = 10;
const HTTP_STATUS_OK = 200;

@CommandHandler(UpdateProductUnitCommand)
export class UpdateProductUnitHandler implements ICommandHandler<UpdateProductUnitCommand> {
    protected readonly logger = new Logger(UpdateProductUnitHandler.name);

    constructor(
        @Inject('ProductUnitDatabaseService')
        private readonly productUnitDatabaseService: ProductUnitDatabaseServiceAbstract
    ) {}

    async execute(command: UpdateProductUnitCommand): Promise<ResponseDto<ProductUnitDto | ErrorResponseDto>> {
        this.logger.log(`Processing update request for product unit: ${command.productUnitDto.productUnitId}`);

        try {
            // Validate record exists
            const existingRecord = await this.validateProductUnitExists(command.productUnitDto.productUnitId);

            // Check user authorization and determine status
            const hasApprovalPermission = this.hasApprovalPermission(command.user.roles);

            // Update status and activity logs based on permissions
            this.updateProductUnitStatus(existingRecord, command, hasApprovalPermission);

            // Optimize activity logs
            existingRecord.activityLogs = reduceArrayContents(existingRecord.activityLogs, ACTIVITY_LOGS_LIMIT);

            // Update record in database
            const updatedRecord = await this.productUnitDatabaseService.updateRecord(existingRecord);

            this.logger.log(`Product unit updated successfully: ${existingRecord.productUnitId}`);
            return new ResponseDto<ProductUnitDto>(updatedRecord, HTTP_STATUS_OK);
        } catch (error) {
            return this.handleError(error, command.productUnitDto.productUnitId);
        }
    }

    /**
     * Validates that the product unit record exists
     */
    private async validateProductUnitExists(productUnitId: string): Promise<ProductUnitDto> {
        const existingRecord = await this.productUnitDatabaseService.findRecordById(productUnitId);

        if (!existingRecord) {
            this.logger.warn(`Product unit not found: ${productUnitId}`);
            throw new NotFoundException(`Product unit record not found for id ${productUnitId}`);
        }

        if (existingRecord.status == StatusEnum.FOR_DELETION || existingRecord.status == StatusEnum.FOR_APPROVAL) {
            throw new BadRequestException('Product unit is already for deletion or approval');
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
     * Updates product unit status and activity logs based on user permissions
     */
    private updateProductUnitStatus(
        existingRecord: ProductUnitDto,
        command: UpdateProductUnitCommand,
        hasApprovalPermission: boolean
    ): void {
        if (hasApprovalPermission) {
            // User can approve directly - set to ACTIVE
            existingRecord.status = StatusEnum.ACTIVE;
            existingRecord.productUnitName = command.productUnitDto.productUnitName;
            existingRecord.activityLogs.push(
                `Date: ${new Date().toLocaleString('en-US', {
                    timeZone: 'Asia/Manila',
                })}, Product unit updated by ${command.user.username}, status set to ${StatusEnum.ACTIVE}`
            );
        } else {
            // User needs approval - set to FOR_APPROVAL
            existingRecord.status = StatusEnum.FOR_APPROVAL;
            existingRecord.forApprovalVersion = {};
            existingRecord.forApprovalVersion.productUnitName = command.productUnitDto.productUnitName;
            existingRecord.activityLogs.push(
                `Date: ${new Date().toLocaleString('en-US', {
                    timeZone: 'Asia/Manila',
                })}, Product unit updated by ${command.user.username} for approval`
            );
        }
    }

    /**
     * Centralized error handling
     */
    private handleError(error: unknown, productUnitId: string): never {
        this.logger.error(`Error processing update request for ${productUnitId}:`, error);

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
