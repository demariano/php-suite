import { UserCognito } from '@auth-guard-lib';
import { ErrorResponseDto, RawMaterialUnitDto, ResponseDto, StatusEnum, UserRole } from '@dto';
import { reduceArrayContents } from '@dynamo-db-lib';
import { RawMaterialUnitDatabaseServiceAbstract } from '@inventory-database-service';
import { BadRequestException, ForbiddenException, Inject, Logger, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { DenyRawMaterialUnitCommand } from './deny.command';

const HTTP_STATUS_OK = 200;
const ACTIVITY_LOGS_LIMIT = 10;

@CommandHandler(DenyRawMaterialUnitCommand)
export class DenyRawMaterialUnitHandler implements ICommandHandler<DenyRawMaterialUnitCommand> {
    protected readonly logger = new Logger(DenyRawMaterialUnitHandler.name);

    constructor(
        @Inject('RawMaterialUnitDatabaseService')
        private readonly rawMaterialUnitDatabaseService: RawMaterialUnitDatabaseServiceAbstract
    ) {}

    async execute(command: DenyRawMaterialUnitCommand): Promise<ResponseDto<RawMaterialUnitDto | ErrorResponseDto>> {
        this.logger.log(`Processing deny request for raw material unit: ${command.recordId}`);

        try {
            const existingRecord = await this.fetchRecord(command.recordId);
            this.validateUserAuthorization(command.user.roles);
            const result = await this.processDenial(existingRecord, command);
            this.logger.log(`Raw material unit denied successfully: ${command.recordId}`);
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
            throw new ForbiddenException('User roles are required for denial');
        }

        const hasPermission = userRoles.includes(UserRole.SUPER_ADMIN) || userRoles.includes(UserRole.ADMIN);

        if (!hasPermission) {
            throw new ForbiddenException('Only SUPER_ADMIN or ADMIN users can deny records');
        }
    }

    private async processDenial(
        existingRecord: RawMaterialUnitDto,
        command: DenyRawMaterialUnitCommand
    ): Promise<ResponseDto<RawMaterialUnitDto>> {
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
                throw new BadRequestException(`Cannot deny raw material unit with status: ${existingRecord.status}`);
        }
    }

    private async denyRecord(
        existingRecord: RawMaterialUnitDto,
        user: UserCognito
    ): Promise<ResponseDto<RawMaterialUnitDto>> {
        existingRecord.forApprovalVersion = {};
        existingRecord.changeReason = null;
        existingRecord.status = StatusEnum.ACTIVE;

        const activityLog = `Date: ${new Date().toLocaleString('en-US', {
            timeZone: 'Asia/Manila',
        })}, Raw material unit changes denied by ${user.username}`;
        existingRecord.activityLogs = [...(existingRecord.activityLogs || []), activityLog];

        if (existingRecord.approverMessage) {
            existingRecord.activityLogs.push(
                `Date: ${new Date().toLocaleString('en-US', {
                    timeZone: 'Asia/Manila',
                })}, Raw material unit denied by ${user.username}, approver message: ${existingRecord.approverMessage}`
            );
        }

        existingRecord.activityLogs = reduceArrayContents(existingRecord.activityLogs, ACTIVITY_LOGS_LIMIT);
        existingRecord.approverMessage = null;

        const updatedRecord = await this.rawMaterialUnitDatabaseService.updateRecord(existingRecord);
        return new ResponseDto<RawMaterialUnitDto>(updatedRecord, HTTP_STATUS_OK);
    }

    private async denyDeletion(existingRecord: RawMaterialUnitDto): Promise<ResponseDto<RawMaterialUnitDto>> {
        existingRecord.changeReason = null;
        existingRecord.status = StatusEnum.ACTIVE;

        const activityLog = `Date: ${new Date().toLocaleString('en-US', {
            timeZone: 'Asia/Manila',
        })}, Raw material unit deletion denied`;
        existingRecord.activityLogs = [...(existingRecord.activityLogs || []), activityLog];
        existingRecord.activityLogs = reduceArrayContents(existingRecord.activityLogs, ACTIVITY_LOGS_LIMIT);

        const updatedRecord = await this.rawMaterialUnitDatabaseService.updateRecord(existingRecord);
        return new ResponseDto<RawMaterialUnitDto>(updatedRecord, HTTP_STATUS_OK);
    }

    private async deleteRecord(existingRecord: RawMaterialUnitDto): Promise<ResponseDto<RawMaterialUnitDto>> {
        existingRecord.changeReason = null;
        await this.rawMaterialUnitDatabaseService.deleteRecord(existingRecord);
        return new ResponseDto<RawMaterialUnitDto>(existingRecord, HTTP_STATUS_OK);
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
