import { UserCognito } from '@auth-guard-lib';
import { ErrorResponseDto, RawMaterialDto, ResponseDto, StatusEnum, UserRole } from '@dto';
import { reduceArrayContents } from '@dynamo-db-lib';
import { RawMaterialDatabaseServiceAbstract } from '@inventory-database-service';
import { BadRequestException, Inject, Logger, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { UpdateRawMaterialCommand } from './update.command';

const HTTP_STATUS_OK = 200;
const ACTIVITY_LOGS_LIMIT = 10;

@CommandHandler(UpdateRawMaterialCommand)
export class UpdateRawMaterialHandler implements ICommandHandler<UpdateRawMaterialCommand> {
    protected readonly logger = new Logger(UpdateRawMaterialHandler.name);

    constructor(
        @Inject('RawMaterialDatabaseService')
        private readonly rawMaterialDatabaseService: RawMaterialDatabaseServiceAbstract
    ) {}

    async execute(command: UpdateRawMaterialCommand): Promise<ResponseDto<RawMaterialDto | ErrorResponseDto>> {
        const existing = await this.rawMaterialDatabaseService.findRecordById(command.recordId);
        if (!existing) {
            throw new NotFoundException(`Raw material not found for ID: ${command.recordId}`);
        }

        // Prevent duplicate names when changing name
        const nextName = command.rawMaterialDto.rawMaterialName;
        if (nextName && nextName !== existing.rawMaterialName) {
            const conflict = await this.rawMaterialDatabaseService.findRecordByName(nextName);
            if (conflict && conflict.rawMaterialId !== existing.rawMaterialId) {
                throw new BadRequestException('Raw material name already exists');
            }
        }

        const approveDirect = this.hasApprovalPermission(command.user);
        this.applyUpdates(existing, command.rawMaterialDto, command.user, approveDirect);

        try {
            const updated = approveDirect
                ? await this.rawMaterialDatabaseService.updateRecord(existing)
                : await this.rawMaterialDatabaseService.updateRecord(existing);
            return new ResponseDto<RawMaterialDto>(updated, HTTP_STATUS_OK);
        } catch (error) {
            this.logger.error('Failed to update raw material', error as Error);
            throw new BadRequestException('Failed to update raw material');
        }
    }

    private hasApprovalPermission(user: UserCognito): boolean {
        return (user.roles || []).some((role) => role === UserRole.ADMIN || role === UserRole.SUPER_ADMIN);
    }

    private applyUpdates(
        existing: RawMaterialDto,
        payload: RawMaterialDto,
        user: UserCognito,
        approveDirect: boolean
    ): void {
        const timestamp = new Date().toLocaleString('en-US', { timeZone: 'Asia/Manila' });
        existing.activityLogs = existing.activityLogs || [];

        if (approveDirect) {
            existing.rawMaterialName = payload.rawMaterialName ?? existing.rawMaterialName;
            existing.description = payload.description ?? existing.description;
            existing.status = StatusEnum.ACTIVE;
            existing.activityLogs.push(
                `Date: ${timestamp}, Raw material updated by ${user.username}, status set to ACTIVE`
            );
            existing.activityLogs = reduceArrayContents(existing.activityLogs, ACTIVITY_LOGS_LIMIT);
            existing.forApprovalVersion = {};
            existing.changeReason = undefined;
        } else {
            existing.status = StatusEnum.FOR_APPROVAL;
            existing.forApprovalVersion = {
                rawMaterialName: payload.rawMaterialName ?? existing.rawMaterialName,
                description: payload.description ?? existing.description,
            } as Record<string, unknown>;
            existing.changeReason = payload.changeReason;
            existing.activityLogs.push(
                `Date: ${timestamp}, Raw material update requested by ${user.username} for approval`
            );
            existing.activityLogs = reduceArrayContents(existing.activityLogs, ACTIVITY_LOGS_LIMIT);
        }
    }
}
