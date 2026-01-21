import { UserCognito } from '@auth-guard-lib';
import { ErrorResponseDto, RawMaterialUnitDto, ResponseDto, StatusEnum, UserRole } from '@dto';
import { reduceArrayContents } from '@dynamo-db-lib';
import { RawMaterialUnitDatabaseServiceAbstract } from '@inventory-database-service';
import { BadRequestException, ForbiddenException, Inject, Logger, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { ApproveRawMaterialUnitCommand } from './approve.command';

const HTTP_STATUS_OK = 200;
const ACTIVITY_LOGS_LIMIT = 10;

@CommandHandler(ApproveRawMaterialUnitCommand)
export class ApproveRawMaterialUnitHandler implements ICommandHandler<ApproveRawMaterialUnitCommand> {
    protected readonly logger = new Logger(ApproveRawMaterialUnitHandler.name);

    constructor(
        @Inject('RawMaterialUnitDatabaseService')
        private readonly rawMaterialUnitDatabaseService: RawMaterialUnitDatabaseServiceAbstract
    ) {}

    async execute(command: ApproveRawMaterialUnitCommand): Promise<ResponseDto<RawMaterialUnitDto | ErrorResponseDto>> {
        this.logger.log(`Processing approve request for raw material unit: ${command.recordId}`);

        try {
            const existingRecord = await this.fetchRecord(command.recordId);
            this.validateUserAuthorization(command.user.roles);
            const result = await this.processApproval(existingRecord, command.user);
            this.logger.log(`Raw material unit approved successfully: ${command.recordId}`);
            return result;
        } catch (error) {
            return this.handleError(error, command.recordId);
        }
    }

    private async fetchRecord(recordId: string): Promise<RawMaterialUnitDto> {
        const record = await this.rawMaterialUnitDatabaseService.findRecordById(recordId);

        if (!record) {
            this.logger.warn(`Raw material unit not found for ID: ${recordId}`);
            throw new NotFoundException(`Raw material unit not found for ID: ${recordId}`);
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
        existingRecord: RawMaterialUnitDto,
        user: UserCognito
    ): Promise<ResponseDto<RawMaterialUnitDto>> {
        switch (existingRecord.status) {
            case StatusEnum.FOR_APPROVAL:
            case StatusEnum.NEW_RECORD:
                return await this.approveRecord(existingRecord, user);
            case StatusEnum.FOR_DELETION:
                return await this.approveDeletion(existingRecord);
            case StatusEnum.FOR_DEACTIVATION:
                return await this.approveDeactivation(existingRecord);
            default:
                throw new BadRequestException(`Cannot approve raw material unit with status: ${existingRecord.status}`);
        }
    }

    private async approveRecord(
        existingRecord: RawMaterialUnitDto,
        user: UserCognito
    ): Promise<ResponseDto<RawMaterialUnitDto>> {
        const forApprovalVersion = existingRecord.forApprovalVersion || {};
        existingRecord.rawMaterialUnitName =
            (forApprovalVersion.rawMaterialUnitName as string) || existingRecord.rawMaterialUnitName;
        existingRecord.forApprovalVersion = {};
        existingRecord.status = StatusEnum.ACTIVE;
        existingRecord.changeReason = null;
        existingRecord.approverMessage = null;

        const activityLog = `Date: ${new Date().toLocaleString('en-US', {
            timeZone: 'Asia/Manila',
        })}, Raw material unit approved by ${user.username}, status set to ${StatusEnum.ACTIVE}`;
        existingRecord.activityLogs = [...(existingRecord.activityLogs || []), activityLog];
        existingRecord.activityLogs = reduceArrayContents(existingRecord.activityLogs, ACTIVITY_LOGS_LIMIT);

        const updatedRecord = await this.rawMaterialUnitDatabaseService.updateRecord(existingRecord);
        return new ResponseDto<RawMaterialUnitDto>(updatedRecord, HTTP_STATUS_OK);
    }

    private async approveDeletion(existingRecord: RawMaterialUnitDto): Promise<ResponseDto<RawMaterialUnitDto>> {
        existingRecord.changeReason = null;
        await this.rawMaterialUnitDatabaseService.deleteRecord(existingRecord);
        return new ResponseDto<RawMaterialUnitDto>(existingRecord, HTTP_STATUS_OK);
    }

    private async approveDeactivation(existingRecord: RawMaterialUnitDto): Promise<ResponseDto<RawMaterialUnitDto>> {
        existingRecord.changeReason = null;
        existingRecord.approverMessage = null;
        existingRecord.status = StatusEnum.INACTIVE;
        const activityLog = `Date: ${new Date().toLocaleString('en-US', {
            timeZone: 'Asia/Manila',
        })}, Raw material unit deactivation approved, status set to ${StatusEnum.INACTIVE}`;
        existingRecord.activityLogs = [...(existingRecord.activityLogs || []), activityLog];
        existingRecord.activityLogs = reduceArrayContents(existingRecord.activityLogs, ACTIVITY_LOGS_LIMIT);
        const updatedRecord = await this.rawMaterialUnitDatabaseService.updateRecord(existingRecord);
        return new ResponseDto<RawMaterialUnitDto>(updatedRecord, HTTP_STATUS_OK);
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
