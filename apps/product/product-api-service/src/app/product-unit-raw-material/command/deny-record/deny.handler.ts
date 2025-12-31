import { ErrorResponseDto, ProductUnitRawMaterialDto, ResponseDto, StatusEnum, UserRole } from '@dto';
import { reduceArrayContents } from '@dynamo-db-lib';
import { BadRequestException, ForbiddenException, Inject, Logger, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { ProductUnitRawMaterialDatabaseServiceAbstract } from '@product-database-service';
import { DenyProductUnitRawMaterialCommand } from './deny.command';

// Constants
const ACTIVITY_LOGS_LIMIT = 10;
const HTTP_STATUS_OK = 200;

@CommandHandler(DenyProductUnitRawMaterialCommand)
export class DenyProductUnitRawMaterialHandler implements ICommandHandler<DenyProductUnitRawMaterialCommand> {
    protected readonly logger = new Logger(DenyProductUnitRawMaterialHandler.name);

    constructor(
        @Inject('ProductUnitRawMaterialDatabaseService')
        private readonly productUnitRawMaterialDatabaseService: ProductUnitRawMaterialDatabaseServiceAbstract
    ) {}

    async execute(
        command: DenyProductUnitRawMaterialCommand
    ): Promise<ResponseDto<ProductUnitRawMaterialDto | ErrorResponseDto>> {
        this.logger.log(`Processing deny request for product unit raw material: ${command.productUnitRawMaterialId}`);

        try {
            // Validate record exists
            const existingRecord = await this.validateProductUnitRawMaterialExists(command.productUnitRawMaterialId);

            // Check user authorization
            this.validateUserAuthorization(command.user.roles);

            // Process denial based on current status
            return await this.processDeny(existingRecord, command);
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
     * Validates that the user has authorization to deny
     */
    private validateUserAuthorization(userRoles?: string[]): void {
        if (!userRoles || userRoles.length === 0) {
            throw new ForbiddenException('User roles not found');
        }

        const hasDenyPermission = userRoles.includes(UserRole.SUPER_ADMIN) || userRoles.includes(UserRole.ADMIN);

        if (!hasDenyPermission) {
            throw new ForbiddenException(
                'Current user is not authorized to deny product unit raw material change request'
            );
        }
    }

    /**
     * Processes the denial based on the current status of the record
     */
    private async processDeny(
        existingRecord: ProductUnitRawMaterialDto,
        command: DenyProductUnitRawMaterialCommand
    ): Promise<ResponseDto<ProductUnitRawMaterialDto>> {
        switch (existingRecord.status) {
            case StatusEnum.FOR_APPROVAL:
                return await this.denyProductUnitRawMaterial(existingRecord, command);
            case StatusEnum.FOR_DELETION:
                return await this.denyDeletion(existingRecord, command);
            case StatusEnum.NEW_RECORD:
                return await this.deleteRecord(existingRecord);
            default:
                throw new BadRequestException(
                    `Cannot deny product unit raw material with status: ${existingRecord.status}`
                );
        }
    }

    /**
     * Denies a product unit raw material for approval
     */
    private async denyProductUnitRawMaterial(
        existingRecord: ProductUnitRawMaterialDto,
        command: DenyProductUnitRawMaterialCommand
    ): Promise<ResponseDto<ProductUnitRawMaterialDto>> {
        // Update status and add activity log
        existingRecord.status = StatusEnum.ACTIVE;
        existingRecord.activityLogs = existingRecord.activityLogs ?? [];
        existingRecord.activityLogs.push(
            `Date: ${new Date().toLocaleString('en-US', {
                timeZone: 'Asia/Manila',
            })}, Product unit raw material changes denied by ${command.user.username}, status set to ${
                StatusEnum.ACTIVE
            }`
        );

        //add a new activity log for the using the approver message
        existingRecord.activityLogs.push(
            `Date: ${new Date().toLocaleString('en-US', {
                timeZone: 'Asia/Manila',
            })}, Product unit raw material changes denied by ${command.user.username}, approver message: ${
                command.approverMessage
            }`
        );

        // Optimize activity logs
        existingRecord.activityLogs = reduceArrayContents(existingRecord.activityLogs, ACTIVITY_LOGS_LIMIT);
        existingRecord.forApprovalVersion = {};
        existingRecord.changeReason = undefined;
        existingRecord.approverMessage = undefined;
        // Update record in database
        const updatedRecord = await this.productUnitRawMaterialDatabaseService.updateRecord(existingRecord);

        this.logger.log(`Product unit raw material denied successfully: ${existingRecord.productUnitRawMaterialId}`);
        return new ResponseDto<ProductUnitRawMaterialDto>(updatedRecord, HTTP_STATUS_OK);
    }

    /**
     * Deletes a product unit raw material when it is a new record and it was denied
     */
    private async deleteRecord(
        existingRecord: ProductUnitRawMaterialDto
    ): Promise<ResponseDto<ProductUnitRawMaterialDto>> {
        this.logger.log(`Product unit raw material deleted: ${existingRecord.productUnitRawMaterialId}`);
        existingRecord.changeReason = undefined;
        await this.productUnitRawMaterialDatabaseService.deleteRecord(existingRecord);
        return new ResponseDto<ProductUnitRawMaterialDto>(existingRecord, HTTP_STATUS_OK);
    }

    /**
     * Denies deletion of a product unit raw material
     */
    private async denyDeletion(
        existingRecord: ProductUnitRawMaterialDto,
        command: DenyProductUnitRawMaterialCommand
    ): Promise<ResponseDto<ProductUnitRawMaterialDto>> {
        existingRecord.status = StatusEnum.ACTIVE;
        existingRecord.activityLogs = existingRecord.activityLogs ?? [];
        existingRecord.activityLogs.push(
            `Date: ${new Date().toLocaleString('en-US', {
                timeZone: 'Asia/Manila',
            })}, Product unit raw material deletion denied by ${command.user.username}`
        );

        existingRecord.activityLogs.push(
            `Date: ${new Date().toLocaleString('en-US', {
                timeZone: 'Asia/Manila',
            })}, Product unit raw material deletion denied by ${command.user.username}, approver message: ${
                command.approverMessage
            }`
        );

        existingRecord.activityLogs = reduceArrayContents(existingRecord.activityLogs, ACTIVITY_LOGS_LIMIT);
        existingRecord.changeReason = undefined;
        existingRecord.approverMessage = undefined;
        const updatedRecord = await this.productUnitRawMaterialDatabaseService.updateRecord(existingRecord);

        this.logger.log(`Product unit raw material deletion denied: ${existingRecord.productUnitRawMaterialId}`);
        return new ResponseDto<ProductUnitRawMaterialDto>(updatedRecord, HTTP_STATUS_OK);
    }

    /**
     * Centralized error handling
     */
    private handleError(error: unknown, productUnitRawMaterialId: string): never {
        this.logger.error(`Error processing deny request for ${productUnitRawMaterialId}:`, error);

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
