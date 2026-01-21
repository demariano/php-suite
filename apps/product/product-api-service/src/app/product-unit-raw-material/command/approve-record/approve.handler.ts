import { UserCognito } from '@auth-guard-lib';
import { ErrorResponseDto, ProductUnitRawMaterialDto, ResponseDto, StatusEnum, UserRole } from '@dto';
import { reduceArrayContents } from '@dynamo-db-lib';
import { BadRequestException, ForbiddenException, Inject, Logger, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { ProductUnitRawMaterialDatabaseServiceAbstract } from '@product-database-service';
import { ApproveProductUnitRawMaterialCommand } from './approve.command';

// Constants
const ACTIVITY_LOGS_LIMIT = 10;
const HTTP_STATUS_OK = 200;

@CommandHandler(ApproveProductUnitRawMaterialCommand)
export class ApproveProductUnitRawMaterialHandler implements ICommandHandler<ApproveProductUnitRawMaterialCommand> {
    protected readonly logger = new Logger(ApproveProductUnitRawMaterialHandler.name);

    constructor(
        @Inject('ProductUnitRawMaterialDatabaseService')
        private readonly productUnitRawMaterialDatabaseService: ProductUnitRawMaterialDatabaseServiceAbstract
    ) {}

    async execute(
        command: ApproveProductUnitRawMaterialCommand
    ): Promise<ResponseDto<ProductUnitRawMaterialDto | ErrorResponseDto>> {
        this.logger.log(
            `Processing approval request for product unit raw material: ${command.productUnitRawMaterialId}`
        );

        try {
            // Validate record exists
            const existingRecord = await this.validateProductUnitRawMaterialExists(command.productUnitRawMaterialId);

            // Check user authorization
            this.validateUserAuthorization(command.user.roles);

            // Process approval based on current status
            return await this.processApproval(existingRecord, command.user);
        } catch (error) {
            return this.handleError(error, command.productUnitRawMaterialId);
        }
    }

    /**
     * Validates that the product unit raw material record exists
     */
    private async validateProductUnitRawMaterialExists(
        productUnitRawMaterialId: string
    ): Promise<ProductUnitRawMaterialDto> {
        const existingRecord = await this.productUnitRawMaterialDatabaseService.findRecordById(
            productUnitRawMaterialId
        );

        if (!existingRecord) {
            this.logger.warn(`Product unit raw material not found: ${productUnitRawMaterialId}`);
            throw new NotFoundException(
                `Product unit raw material record not found for id ${productUnitRawMaterialId}`
            );
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
            throw new ForbiddenException(
                'Current user is not authorized to approve product unit raw material change request'
            );
        }
    }

    /**
     * Processes the approval based on the current status of the record
     */
    private async processApproval(
        existingRecord: ProductUnitRawMaterialDto,
        user: UserCognito
    ): Promise<ResponseDto<ProductUnitRawMaterialDto>> {
        switch (existingRecord.status) {
            case StatusEnum.FOR_APPROVAL:
            case StatusEnum.NEW_RECORD:
                return await this.approveProductUnitRawMaterial(existingRecord, user);
            case StatusEnum.FOR_DELETION:
                return await this.approveDeletion(existingRecord);
            case StatusEnum.FOR_DEACTIVATION:
                return await this.approveDeactivation(existingRecord);
            default:
                throw new BadRequestException(
                    `Cannot approve product unit raw material with status: ${existingRecord.status}`
                );
        }
    }

    /**
     * Approves a product unit raw material for approval
     */
    private async approveProductUnitRawMaterial(
        existingRecord: ProductUnitRawMaterialDto,
        user: UserCognito
    ): Promise<ResponseDto<ProductUnitRawMaterialDto>> {
        const approvalVersion = existingRecord.forApprovalVersion ?? {};

        // Update status and add activity log
        existingRecord.activityLogs = existingRecord.activityLogs ?? [];
        existingRecord.status = StatusEnum.ACTIVE;
        existingRecord.activityLogs.push(
            `Date: ${new Date().toLocaleString('en-US', {
                timeZone: 'Asia/Manila',
            })}, Product unit raw material approved by ${user.username}, status set to ${StatusEnum.ACTIVE}`
        );

        // Optimize activity logs
        existingRecord.activityLogs = reduceArrayContents(existingRecord.activityLogs, ACTIVITY_LOGS_LIMIT);

        existingRecord.productId = (approvalVersion.productId as string) ?? existingRecord.productId;
        existingRecord.productName = (approvalVersion.productName as string) ?? existingRecord.productName;
        existingRecord.rawMaterialsPerUnit =
            (approvalVersion.rawMaterialsPerUnit as any[]) ?? existingRecord.rawMaterialsPerUnit ?? [];
        existingRecord.changeReason = undefined;
        existingRecord.forApprovalVersion = {};

        // Update record in database
        const updatedRecord = await this.productUnitRawMaterialDatabaseService.updateRecord(existingRecord);

        this.logger.log(`Product unit raw material approved successfully: ${existingRecord.productUnitRawMaterialId}`);
        return new ResponseDto<ProductUnitRawMaterialDto>(updatedRecord, HTTP_STATUS_OK);
    }

    /**
     * Approves deletion of a product unit raw material
     */
    private async approveDeletion(
        existingRecord: ProductUnitRawMaterialDto
    ): Promise<ResponseDto<ProductUnitRawMaterialDto>> {
        existingRecord.changeReason = undefined;
        await this.productUnitRawMaterialDatabaseService.deleteRecord(existingRecord);

        this.logger.log(`Product unit raw material deletion approved: ${existingRecord.productUnitRawMaterialId}`);
        return new ResponseDto<ProductUnitRawMaterialDto>(existingRecord, HTTP_STATUS_OK);
    }

    /**
     * Approves deactivation of a product unit raw material (soft delete)
     */
    private async approveDeactivation(
        existingRecord: ProductUnitRawMaterialDto
    ): Promise<ResponseDto<ProductUnitRawMaterialDto>> {
        existingRecord.changeReason = undefined;
        existingRecord.status = StatusEnum.INACTIVE;
        existingRecord.activityLogs = existingRecord.activityLogs ?? [];
        existingRecord.activityLogs.push(
            `Date: ${new Date().toLocaleString('en-US', {
                timeZone: 'Asia/Manila',
            })}, Product unit raw material deactivation approved, status set to ${StatusEnum.INACTIVE}`
        );
        existingRecord.activityLogs = reduceArrayContents(existingRecord.activityLogs, ACTIVITY_LOGS_LIMIT);
        const updatedRecord = await this.productUnitRawMaterialDatabaseService.updateRecord(existingRecord);

        this.logger.log(`Product unit raw material deactivation approved: ${existingRecord.productUnitRawMaterialId}`);
        return new ResponseDto<ProductUnitRawMaterialDto>(updatedRecord, HTTP_STATUS_OK);
    }

    /**
     * Centralized error handling
     */
    private handleError(error: unknown, productUnitRawMaterialId: string): never {
        this.logger.error(`Error processing approval request for ${productUnitRawMaterialId}:`, error);

        // Re-throw known exceptions
        if (
            error instanceof NotFoundException ||
            error instanceof ForbiddenException ||
            error instanceof BadRequestException
        ) {
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
