import { UserCognito } from '@auth-guard-lib';
import { ErrorResponseDto, RawMaterialSupplierDto, ResponseDto, StatusEnum, UserRole } from '@dto';
import { reduceArrayContents } from '@dynamo-db-lib';
import { RawMaterialSupplierDatabaseServiceAbstract } from '@inventory-database-service';
import { BadRequestException, ForbiddenException, Inject, Logger, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { ApproveRawMaterialSupplierCommand } from './approve.command';

const HTTP_STATUS_OK = 200;
const ACTIVITY_LOGS_LIMIT = 10;

@CommandHandler(ApproveRawMaterialSupplierCommand)
export class ApproveRawMaterialSupplierHandler implements ICommandHandler<ApproveRawMaterialSupplierCommand> {
    protected readonly logger = new Logger(ApproveRawMaterialSupplierHandler.name);

    constructor(
        @Inject('RawMaterialSupplierDatabaseService')
        private readonly rawMaterialSupplierDatabaseService: RawMaterialSupplierDatabaseServiceAbstract
    ) {}

    async execute(
        command: ApproveRawMaterialSupplierCommand
    ): Promise<ResponseDto<RawMaterialSupplierDto | ErrorResponseDto>> {
        this.logger.log(`Processing approve request for raw material supplier: ${command.recordId}`);

        try {
            const existingRecord = await this.fetchRecord(command.recordId);
            this.validateUserAuthorization(command.user.roles);
            const result = await this.processApproval(existingRecord, command.user);
            this.logger.log(`Raw material supplier approved successfully: ${command.recordId}`);
            return result;
        } catch (error) {
            return this.handleError(error, command.recordId);
        }
    }

    private async fetchRecord(recordId: string): Promise<RawMaterialSupplierDto> {
        const record = await this.rawMaterialSupplierDatabaseService.findRecordById(recordId);

        if (!record) {
            this.logger.warn(`Raw material supplier not found for ID: ${recordId}`);
            throw new NotFoundException(`Raw material supplier not found for ID: ${recordId}`);
        }

        return record;
    }

    private validateUserAuthorization(userRoles?: string[]): void {
        if (!userRoles || userRoles.length === 0) {
            throw new ForbiddenException('User roles are required for approval');
        }

        const hasPermission = userRoles.includes(UserRole.SUPER_ADMIN) || userRoles.includes(UserRole.ADMIN);

        if (!hasPermission) {
            throw new ForbiddenException('Only SUPER_ADMIN or ADMIN users can approve records');
        }
    }

    private async processApproval(
        existingRecord: RawMaterialSupplierDto,
        user: UserCognito
    ): Promise<ResponseDto<RawMaterialSupplierDto>> {
        switch (existingRecord.status) {
            case StatusEnum.FOR_APPROVAL:
            case StatusEnum.NEW_RECORD:
                return await this.approveRecord(existingRecord, user);
            case StatusEnum.FOR_DELETION:
                return await this.approveDeletion(existingRecord);
            default:
                throw new BadRequestException(
                    `Cannot approve raw material supplier with status: ${existingRecord.status}`
                );
        }
    }

    private async approveRecord(
        existingRecord: RawMaterialSupplierDto,
        user: UserCognito
    ): Promise<ResponseDto<RawMaterialSupplierDto>> {
        const forApprovalVersion = existingRecord.forApprovalVersion || {};
        existingRecord.rawMaterialSupplierName =
            (forApprovalVersion.rawMaterialSupplierName as string) || existingRecord.rawMaterialSupplierName;
        existingRecord.forApprovalVersion = {};
        existingRecord.status = StatusEnum.ACTIVE;
        existingRecord.changeReason = null;
        existingRecord.approverMessage = null;

        const activityLog = `Date: ${new Date().toLocaleString('en-US', {
            timeZone: 'Asia/Manila',
        })}, Raw material supplier approved by ${user.username}, status set to ${StatusEnum.ACTIVE}`;
        existingRecord.activityLogs = [...(existingRecord.activityLogs || []), activityLog];
        existingRecord.activityLogs = reduceArrayContents(existingRecord.activityLogs, ACTIVITY_LOGS_LIMIT);

        const updatedRecord = await this.rawMaterialSupplierDatabaseService.updateRecord(existingRecord);
        return new ResponseDto<RawMaterialSupplierDto>(updatedRecord, HTTP_STATUS_OK);
    }

    private async approveDeletion(
        existingRecord: RawMaterialSupplierDto
    ): Promise<ResponseDto<RawMaterialSupplierDto>> {
        existingRecord.changeReason = null;
        await this.rawMaterialSupplierDatabaseService.deleteRecord(existingRecord);
        return new ResponseDto<RawMaterialSupplierDto>(existingRecord, HTTP_STATUS_OK);
    }

    private handleError(error: unknown, recordId: string): never {
        this.logger.error(`Error processing approve request for ${recordId}:`, error);

        if (
            error instanceof BadRequestException ||
            error instanceof NotFoundException ||
            error instanceof ForbiddenException
        ) {
            throw error;
        }

        const errorMessage = this.extractErrorMessage(error);
        throw new BadRequestException(errorMessage);
    }

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
