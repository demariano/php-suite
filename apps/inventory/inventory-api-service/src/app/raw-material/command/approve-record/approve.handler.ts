import { UserCognito } from '@auth-guard-lib';
import { ErrorResponseDto, RawMaterialDto, ResponseDto, StatusEnum, UserRole } from '@dto';
import { reduceArrayContents } from '@dynamo-db-lib';
import { RawMaterialDatabaseServiceAbstract } from '@inventory-database-service';
import { BadRequestException, ForbiddenException, Inject, Logger, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { ApproveRawMaterialCommand } from './approve.command';

const HTTP_STATUS_OK = 200;
const ACTIVITY_LOGS_LIMIT = 10;

@CommandHandler(ApproveRawMaterialCommand)
export class ApproveRawMaterialHandler implements ICommandHandler<ApproveRawMaterialCommand> {
    protected readonly logger = new Logger(ApproveRawMaterialHandler.name);

    constructor(
        @Inject('RawMaterialDatabaseService')
        private readonly rawMaterialDatabaseService: RawMaterialDatabaseServiceAbstract
    ) {}

    async execute(command: ApproveRawMaterialCommand): Promise<ResponseDto<RawMaterialDto | ErrorResponseDto>> {
        this.logger.log(`Processing approve request for raw material: ${command.recordId}`);

        try {
            const existingRecord = await this.fetchRecord(command.recordId);
            this.validateUserAuthorization(command.user.roles);
            const result = await this.processApproval(existingRecord, command.user);
            this.logger.log(`Raw material approved successfully: ${command.recordId}`);
            return result;
        } catch (error) {
            return this.handleError(error, command.recordId);
        }
    }

    private async fetchRecord(recordId: string): Promise<RawMaterialDto> {
        const record = await this.rawMaterialDatabaseService.findRecordById(recordId);

        if (!record) {
            this.logger.warn(`Raw material not found for ID: ${recordId}`);
            throw new NotFoundException(`Raw material not found for ID: ${recordId}`);
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
        existingRecord: RawMaterialDto,
        user: UserCognito
    ): Promise<ResponseDto<RawMaterialDto>> {
        switch (existingRecord.status) {
            case StatusEnum.FOR_APPROVAL:
            case StatusEnum.NEW_RECORD:
                return await this.approveRecord(existingRecord, user);
            case StatusEnum.FOR_DELETION:
                return await this.approveDeletion(existingRecord);
            default:
                throw new BadRequestException(`Cannot approve raw material with status: ${existingRecord.status}`);
        }
    }

    private async approveRecord(
        existingRecord: RawMaterialDto,
        user: UserCognito
    ): Promise<ResponseDto<RawMaterialDto>> {
        const forApprovalVersion = existingRecord.forApprovalVersion || {};
        existingRecord.rawMaterialName =
            (forApprovalVersion.rawMaterialName as string) ?? existingRecord.rawMaterialName;
        existingRecord.description = (forApprovalVersion.description as string) ?? existingRecord.description;
        existingRecord.forApprovalVersion = {};
        existingRecord.status = StatusEnum.ACTIVE;
        existingRecord.changeReason = null;
        existingRecord.approverMessage = null;

        const activityLog = `Date: ${new Date().toLocaleString('en-US', {
            timeZone: 'Asia/Manila',
        })}, Raw material approved by ${user.username}, status set to ${StatusEnum.ACTIVE}`;
        existingRecord.activityLogs = [...(existingRecord.activityLogs || []), activityLog];
        existingRecord.activityLogs = reduceArrayContents(existingRecord.activityLogs, ACTIVITY_LOGS_LIMIT);

        const updatedRecord = await this.rawMaterialDatabaseService.updateRecord(existingRecord);
        return new ResponseDto<RawMaterialDto>(updatedRecord, HTTP_STATUS_OK);
    }

    private async approveDeletion(existingRecord: RawMaterialDto): Promise<ResponseDto<RawMaterialDto>> {
        existingRecord.changeReason = null;
        await this.rawMaterialDatabaseService.deleteRecord(existingRecord);
        return new ResponseDto<RawMaterialDto>(existingRecord, HTTP_STATUS_OK);
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
