import { UserCognito } from '@auth-guard-lib';
import { ErrorResponseDto, RawMaterialDto, ResponseDto, StatusEnum, UserRole } from '@dto';
import { reduceArrayContents } from '@dynamo-db-lib';
import { RawMaterialDatabaseServiceAbstract } from '@inventory-database-service';
import { BadRequestException, Inject, Logger, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { DeleteRawMaterialCommand } from './delete.command';

const HTTP_STATUS_OK = 200;
const ACTIVITY_LOGS_LIMIT = 10;

@CommandHandler(DeleteRawMaterialCommand)
export class DeleteRawMaterialHandler implements ICommandHandler<DeleteRawMaterialCommand> {
    protected readonly logger = new Logger(DeleteRawMaterialHandler.name);

    constructor(
        @Inject('RawMaterialDatabaseService')
        private readonly rawMaterialDatabaseService: RawMaterialDatabaseServiceAbstract
    ) {}

    async execute(command: DeleteRawMaterialCommand): Promise<ResponseDto<RawMaterialDto | ErrorResponseDto>> {
        const existing = await this.rawMaterialDatabaseService.findRecordById(command.recordId);
        if (!existing) {
            throw new NotFoundException(`Raw material not found for ID: ${command.recordId}`);
        }

        const approveDirect = this.hasApprovalPermission(command.user);
        const timestamp = new Date().toLocaleString('en-US', { timeZone: 'Asia/Manila' });
        existing.activityLogs = existing.activityLogs || [];
        existing.activityLogs.push(
            approveDirect
                ? `Date: ${timestamp}, Raw material deleted by ${command.user.username}`
                : `Date: ${timestamp}, Raw material marked for deletion by ${command.user.username}`
        );
        existing.activityLogs = reduceArrayContents(existing.activityLogs, ACTIVITY_LOGS_LIMIT);
        existing.status = StatusEnum.FOR_DEACTIVATION;

        try {
            const result = approveDirect
                ? await this.rawMaterialDatabaseService.deleteRecord(existing)
                : await this.rawMaterialDatabaseService.updateRecord(existing);
            return new ResponseDto<RawMaterialDto>(result, HTTP_STATUS_OK);
        } catch (error) {
            this.logger.error('Failed to delete raw material', error as Error);
            throw new BadRequestException('Failed to delete raw material');
        }
    }

    private hasApprovalPermission(user: UserCognito): boolean {
        return (user.roles || []).some((role) => role === UserRole.ADMIN || role === UserRole.SUPER_ADMIN);
    }
}
