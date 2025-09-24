import { UserCognito } from '@auth-guard-lib';
import { ErrorResponseDto, ProductDealDto, ResponseDto, StatusEnum, UserRole } from '@dto';
import { reduceArrayContents } from '@dynamo-db-lib';
import { BadRequestException, ForbiddenException, Inject, Logger, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { ProductDealDatabaseServiceAbstract } from '@product-database-service';
import { ApproveProductDealCommand } from './approve.command';

// Constants
const ACTIVITY_LOGS_LIMIT = 10;
const HTTP_STATUS_OK = 200;

@CommandHandler(ApproveProductDealCommand)
export class ApproveProductDealHandler implements ICommandHandler<ApproveProductDealCommand> {
    protected readonly logger = new Logger(ApproveProductDealHandler.name);

    constructor(
        @Inject('ProductDealDatabaseService')
        private readonly productDealDatabaseService: ProductDealDatabaseServiceAbstract
    ) {}

    async execute(command: ApproveProductDealCommand): Promise<ResponseDto<ProductDealDto | ErrorResponseDto>> {
        this.logger.log(`Processing approval request for product deal: ${command.productDealId}`);

        try {
            // Validate record exists
            const existingRecord = await this.validateProductDealExists(command.productDealId);

            // Check user authorization
            this.validateUserAuthorization(command.user.roles);

            // Process approval based on current status
            return await this.processApproval(existingRecord, command.user);
        } catch (error) {
            return this.handleError(error, command.productDealId);
        }
    }

    /**
     * Validates that the product deal record exists
     */
    private async validateProductDealExists(productDealId: string): Promise<ProductDealDto> {
        const existingRecord = await this.productDealDatabaseService.findRecordById(productDealId);

        if (!existingRecord) {
            this.logger.warn(`Product deal not found: ${productDealId}`);
            throw new NotFoundException(`Product deal record not found for id ${productDealId}`);
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
            throw new ForbiddenException('Current user is not authorized to approve product deal change request');
        }
    }

    /**
     * Processes the approval based on the current status of the record
     */
    private async processApproval(
        existingRecord: ProductDealDto,
        user: UserCognito
    ): Promise<ResponseDto<ProductDealDto>> {
        switch (existingRecord.status) {
            case StatusEnum.FOR_APPROVAL:
                return await this.approveProductDeal(existingRecord, user);
            case StatusEnum.FOR_DELETION:
                return await this.approveDeletion(existingRecord);
            default:
                throw new BadRequestException(`Cannot approve product deal with status: ${existingRecord.status}`);
        }
    }

    /**
     * Approves a product deal for approval
     */
    private async approveProductDeal(
        existingRecord: ProductDealDto,
        user: UserCognito
    ): Promise<ResponseDto<ProductDealDto>> {
        // Update status and add activity log
        existingRecord.status = StatusEnum.ACTIVE;
        existingRecord.activityLogs.push(
            `Date: ${new Date().toLocaleString('en-US', {
                timeZone: 'Asia/Manila',
            })}, Product deal approved by ${user.username}, status set to ${StatusEnum.ACTIVE}`
        );

        // Optimize activity logs
        existingRecord.activityLogs = reduceArrayContents(existingRecord.activityLogs, ACTIVITY_LOGS_LIMIT);

        const forApprovalVersion = existingRecord.forApprovalVersion;
        existingRecord.productDealName = forApprovalVersion.productDealName as string;
        existingRecord.additionalQty = forApprovalVersion.additionalQty as number;
        existingRecord.minQty = forApprovalVersion.minQty as number;
        existingRecord.forApprovalVersion = {};

        // Update record in database
        const updatedRecord = await this.productDealDatabaseService.updateRecord(existingRecord);

        this.logger.log(`Product deal approved successfully: ${existingRecord.productDealId}`);
        return new ResponseDto<ProductDealDto>(updatedRecord, HTTP_STATUS_OK);
    }

    /**
     * Approves deletion of a product deal
     */
    private async approveDeletion(existingRecord: ProductDealDto): Promise<ResponseDto<ProductDealDto>> {
        await this.productDealDatabaseService.deleteRecord(existingRecord);

        this.logger.log(`Product deal deletion approved: ${existingRecord.productDealId}`);
        return new ResponseDto<ProductDealDto>(existingRecord, HTTP_STATUS_OK);
    }

    /**
     * Centralized error handling
     */
    private handleError(error: unknown, productDealId: string): never {
        this.logger.error(`Error processing approval request for ${productDealId}:`, error);

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
