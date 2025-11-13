import { UserCognito } from '@auth-guard-lib';
import {
    ErrorResponseDto,
    ProductDealDetailsDto,
    ProductDto,
    ProductUnitPriceDto,
    ResponseDto,
    StatusEnum,
    UserRole,
} from '@dto';
import { reduceArrayContents } from '@dynamo-db-lib';
import { BadRequestException, ForbiddenException, Inject, Logger, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { ProductDatabaseServiceAbstract } from '@product-database-service';
import { ApproveProductCommand } from './approve.command';

// Constants
const ACTIVITY_LOGS_LIMIT = 10;
const HTTP_STATUS_OK = 200;

@CommandHandler(ApproveProductCommand)
export class ApproveProductHandler implements ICommandHandler<ApproveProductCommand> {
    protected readonly logger = new Logger(ApproveProductHandler.name);

    constructor(
        @Inject('ProductDatabaseService')
        private readonly productDatabaseService: ProductDatabaseServiceAbstract
    ) {}

    async execute(command: ApproveProductCommand): Promise<ResponseDto<ProductDto | ErrorResponseDto>> {
        this.logger.log(`Processing approval request for product: ${command.productId}`);

        try {
            // Validate record exists
            const existingRecord = await this.validateProductExists(command.productId);

            // Check user authorization
            this.validateUserAuthorization(command.user.roles);

            // Process approval based on current status
            return await this.processApproval(existingRecord, command.user);
        } catch (error) {
            return this.handleError(error, command.productId);
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
     * Validates that the user has authorization to approve
     */
    private validateUserAuthorization(userRoles?: string[]): void {
        if (!userRoles || userRoles.length === 0) {
            throw new ForbiddenException('User roles not found');
        }

        const hasApprovalPermission = userRoles.includes(UserRole.SUPER_ADMIN) || userRoles.includes(UserRole.ADMIN);

        if (!hasApprovalPermission) {
            throw new ForbiddenException('Current user is not authorized to approve product change request');
        }
    }

    /**
     * Processes the approval based on the current status of the record
     */
    private async processApproval(existingRecord: ProductDto, user: UserCognito): Promise<ResponseDto<ProductDto>> {
        switch (existingRecord.status) {
            case StatusEnum.FOR_APPROVAL:
            case StatusEnum.NEW_RECORD:
                return await this.approveProduct(existingRecord, user);
            case StatusEnum.FOR_DELETION:
                return await this.approveDeletion(existingRecord);
            default:
                throw new BadRequestException(`Cannot approve product with status: ${existingRecord.status}`);
        }
    }

    /**
     * Approves a product for approval
     */
    private async approveProduct(existingRecord: ProductDto, user: UserCognito): Promise<ResponseDto<ProductDto>> {
        const approvalVersion = existingRecord.forApprovalVersion ?? {};

        // Update status and add activity log
        existingRecord.activityLogs = existingRecord.activityLogs ?? [];
        existingRecord.status = StatusEnum.ACTIVE;
        existingRecord.activityLogs.push(
            `Date: ${new Date().toLocaleString('en-US', {
                timeZone: 'Asia/Manila',
            })}, Product approved by ${user.username}, status set to ${StatusEnum.ACTIVE}`
        );

        // Optimize activity logs
        existingRecord.activityLogs = reduceArrayContents(existingRecord.activityLogs, ACTIVITY_LOGS_LIMIT);

        existingRecord.productName = (approvalVersion.productName as string) ?? existingRecord.productName;
        existingRecord.criticalLevel = (approvalVersion.criticalLevel as number) ?? existingRecord.criticalLevel;
        existingRecord.productCategoryId =
            (approvalVersion.productCategoryId as string) ?? existingRecord.productCategoryId;
        existingRecord.productCategoryName =
            (approvalVersion.productCategoryName as string) ?? existingRecord.productCategoryName;
        existingRecord.productClassId = (approvalVersion.productClassId as string) ?? existingRecord.productClassId;
        existingRecord.productClassName =
            (approvalVersion.productClassName as string) ?? existingRecord.productClassName;
        existingRecord.productDeals =
            (approvalVersion.productDeals as ProductDealDetailsDto[]) ?? existingRecord.productDeals ?? [];
        existingRecord.productUnitPrice =
            (approvalVersion.productUnitPrice as ProductUnitPriceDto[]) ?? existingRecord.productUnitPrice ?? [];
        existingRecord.changeReason = null;
        existingRecord.forApprovalVersion = {};

        // Update record in database
        const updatedRecord = await this.productDatabaseService.updateRecord(existingRecord);

        this.logger.log(`Product approved successfully: ${existingRecord.productId}`);
        return new ResponseDto<ProductDto>(updatedRecord, HTTP_STATUS_OK);
    }

    /**
     * Approves deletion of a product
     */
    private async approveDeletion(existingRecord: ProductDto): Promise<ResponseDto<ProductDto>> {
        existingRecord.changeReason = null;
        await this.productDatabaseService.deleteRecord(existingRecord);

        this.logger.log(`Product deletion approved: ${existingRecord.productId}`);
        return new ResponseDto<ProductDto>(existingRecord, HTTP_STATUS_OK);
    }

    /**
     * Centralized error handling
     */
    private handleError(error: unknown, productId: string): never {
        this.logger.error(`Error processing approval request for ${productId}:`, error);

        // Re-throw known exceptions
        if (error instanceof NotFoundException || error instanceof ForbiddenException) {
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
