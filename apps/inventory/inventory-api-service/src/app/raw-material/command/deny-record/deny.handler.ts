import { UserCognito } from '@auth-guard-lib';
import { ErrorResponseDto, RawMaterialDto, ResponseDto, StatusEnum, UserRole } from '@dto';
import { reduceArrayContents } from '@dynamo-db-lib';
import { RawMaterialDatabaseServiceAbstract } from '@inventory-database-service';
import { BadRequestException, ForbiddenException, Inject, Logger, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { DenyRawMaterialCommand } from './deny.command';

const HTTP_STATUS_OK = 200;
const ACTIVITY_LOGS_LIMIT = 10;

@CommandHandler(DenyRawMaterialCommand)
export class DenyRawMaterialHandler implements ICommandHandler<DenyRawMaterialCommand> {
    protected readonly logger = new Logger(DenyRawMaterialHandler.name);

    constructor(
        @Inject('RawMaterialDatabaseService')
        private readonly rawMaterialDatabaseService: RawMaterialDatabaseServiceAbstract
    ) {}

    async execute(command: DenyRawMaterialCommand): Promise<ResponseDto<RawMaterialDto | ErrorResponseDto>> {
        this.logger.log(`Processing deny request for raw material: ${command.recordId}`);

        try {
            const existingRecord = await this.fetchRecord(command.recordId);
            this.validateUserAuthorization(command.user.roles);
            const result = await this.processDenial(existingRecord, command);
            this.logger.log(`Raw material denied successfully: ${command.recordId}`);
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
            throw new ForbiddenException('User roles are required for denial');
        }

        const hasPermission = userRoles.includes(UserRole.SUPER_ADMIN) || userRoles.includes(UserRole.ADMIN);

        if (!hasPermission) {
            throw new ForbiddenException('Only SUPER_ADMIN or ADMIN users can deny records');
        }
    }

    private async processDenial(
        existingRecord: RawMaterialDto,
        command: DenyRawMaterialCommand
    ): Promise<ResponseDto<RawMaterialDto>> {
        if (command.approverMessage) {
            existingRecord.approverMessage = command.approverMessage;
        }

        switch (existingRecord.status) {
            case StatusEnum.FOR_APPROVAL:
                return await this.denyRecord(existingRecord, command.user);
            case StatusEnum.FOR_DELETION:
                return await this.denyDeletion(existingRecord);
            case StatusEnum.NEW_RECORD:
                return await this.deleteRecord(existingRecord);
            default:
                throw new BadRequestException(`Cannot deny raw material with status: ${existingRecord.status}`);
        }
    }

    private async denyRecord(existingRecord: RawMaterialDto, user: UserCognito): Promise<ResponseDto<RawMaterialDto>> {
        existingRecord.forApprovalVersion = {};
        existingRecord.changeReason = null;
        existingRecord.status = StatusEnum.ACTIVE;

        const activityLog = `Date: ${new Date().toLocaleString('en-US', {
            timeZone: 'Asia/Manila',
        })}, Raw material changes denied by ${user.username}`;
        existingRecord.activityLogs = [...(existingRecord.activityLogs || []), activityLog];

        if (existingRecord.approverMessage) {
            existingRecord.activityLogs.push(
                `Date: ${new Date().toLocaleString('en-US', {
                    timeZone: 'Asia/Manila',
                })}, Raw material denied by ${user.username}, approver message: ${existingRecord.approverMessage}`
            );
        }

        existingRecord.activityLogs = reduceArrayContents(existingRecord.activityLogs, ACTIVITY_LOGS_LIMIT);
        existingRecord.approverMessage = null;

        const updatedRecord = await this.rawMaterialDatabaseService.updateRecord(existingRecord);
        return new ResponseDto<RawMaterialDto>(updatedRecord, HTTP_STATUS_OK);
    }

    private async denyDeletion(existingRecord: RawMaterialDto): Promise<ResponseDto<RawMaterialDto>> {
        existingRecord.changeReason = null;
        existingRecord.status = StatusEnum.ACTIVE;

        const activityLog = `Date: ${new Date().toLocaleString('en-US', {
            timeZone: 'Asia/Manila',
        })}, Raw material deletion denied`;
        existingRecord.activityLogs = [...(existingRecord.activityLogs || []), activityLog];
        existingRecord.activityLogs = reduceArrayContents(existingRecord.activityLogs, ACTIVITY_LOGS_LIMIT);

        const updatedRecord = await this.rawMaterialDatabaseService.updateRecord(existingRecord);
        return new ResponseDto<RawMaterialDto>(updatedRecord, HTTP_STATUS_OK);
    }

    private async deleteRecord(existingRecord: RawMaterialDto): Promise<ResponseDto<RawMaterialDto>> {
        existingRecord.changeReason = null;
        await this.rawMaterialDatabaseService.deleteRecord(existingRecord);
        return new ResponseDto<RawMaterialDto>(existingRecord, HTTP_STATUS_OK);
    }

    private handleError(error: unknown, recordId: string): never {
        this.logger.error(`Error processing deny request for ${recordId}:`, error);

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
