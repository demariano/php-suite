import { ErrorResponseDto, ProductDto, ResponseDto, StatusEnum, UserRole } from '@dto';
import { reduceArrayContents } from '@dynamo-db-lib';
import { BadRequestException, Inject, Logger, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { ProductDatabaseServiceAbstract } from '@product-database-service';
import { DeleteProductCommand } from './delete.command';

// Constants
const ACTIVITY_LOGS_LIMIT = 10;
const HTTP_STATUS_OK = 200;

@CommandHandler(DeleteProductCommand)
export class DeleteProductHandler implements ICommandHandler<DeleteProductCommand> {
    protected readonly logger = new Logger(DeleteProductHandler.name);

    constructor(
        @Inject('ProductDatabaseService')
        private readonly productDatabaseService: ProductDatabaseServiceAbstract
    ) {}

    async execute(command: DeleteProductCommand): Promise<ResponseDto<ProductDto | ErrorResponseDto>> {
        this.logger.log(`Processing delete request for product: ${command.productDto.productId}`);

        try {
            // Fetch and validate existing product record
            const existingRecord = await this.validateProductExists(command.productId);

            // Check user authorization
            const hasApprovalPermission = this.hasDeletePermission(command.user.roles);

            // Update status and activity logs based on permissions
            const productPayload = this.updateProductStatus(command, existingRecord, hasApprovalPermission);

            // Perform soft delete (always updateRecord - master data)
            const deletedRecord = await this.performDeletion(productPayload);

            this.logger.log(`Product soft deleted successfully: ${deletedRecord.productId}`);
            return new ResponseDto<ProductDto>(deletedRecord, HTTP_STATUS_OK);
        } catch (error) {
            return this.handleError(error, command.productDto.productId);
        }
    }

    /**
     * Validates that the product record exists
     */
    private async validateProductExists(productId: string): Promise<ProductDto> {
        const existingRecord = await this.productDatabaseService.findRecordById(productId);

        if (!existingRecord) {
            this.logger.warn(`Product not found: ${productId}`);
            throw new NotFoundException(`Product record not found for id ${productId}`);
        }

        return existingRecord;
    }

    /**
     * Checks if user has permission to directly delete records
     */
    private hasDeletePermission(userRoles?: string[]): boolean {
        if (!userRoles || userRoles.length === 0) {
            return false;
        }

        return userRoles.includes(UserRole.SUPER_ADMIN) || userRoles.includes(UserRole.ADMIN);
    }

    /**
     * Updates product status and activity logs based on user permissions
     */
    private updateProductStatus(
        command: DeleteProductCommand,
        existingRecord: ProductDto,
        hasApprovalPermission: boolean
    ): ProductDto {
        command.productDto.productId = command.productId;
        command.productDto.deletionReason = command.productDto.deletionReason || 'No reason provided';

        if (hasApprovalPermission) {
            // ADMIN: Immediate soft delete to INACTIVE
            command.productDto.status = StatusEnum.INACTIVE;
            const activityLog = `Date: ${new Date().toLocaleString('en-US', {
                timeZone: 'Asia/Manila',
            })}, Product soft deleted by ${command.user.username}`;
            command.productDto.activityLogs = reduceArrayContents(
                [...(existingRecord.activityLogs || []), activityLog],
                ACTIVITY_LOGS_LIMIT
            );
        } else {
            // USER: Mark for deactivation, requires approval
            command.productDto.status = StatusEnum.FOR_DEACTIVATION;
            command.productDto.changeReason = command.productDto.changeReason || 'Pending deactivation approval';
            const activityLog = `Date: ${new Date().toLocaleString('en-US', {
                timeZone: 'Asia/Manila',
            })}, Product marked for deactivation by ${command.user.username}`;
            command.productDto.activityLogs = reduceArrayContents(
                [...(existingRecord.activityLogs || []), activityLog],
                ACTIVITY_LOGS_LIMIT
            );
        }

        return command.productDto;
    }

    /**
     * Performs the actual deletion - ALWAYS uses soft delete (updateRecord)
     * Products are master data - no hard delete allowed
     */
    private async performDeletion(productPayload: ProductDto): Promise<ProductDto> {
        // Both ADMIN and USER use updateRecord for soft delete
        // Products are master data - no hard delete allowed
        return await this.productDatabaseService.updateRecord(productPayload);
    }

    /**
     * Centralized error handling
     */
    private handleError(error: unknown, productId: string): never {
        this.logger.error(`Error processing delete request for ${productId}:`, error);

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
