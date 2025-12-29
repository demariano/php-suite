import { UserCognito } from '@auth-guard-lib';
import { ErrorResponseDto, RawMaterialsLocationDto, ResponseDto, StatusEnum, UserRole } from '@dto';
import { reduceArrayContents } from '@dynamo-db-lib';
import { RawMaterialsLocationDatabaseServiceAbstract } from '@inventory-database-service';
import { BadRequestException, Inject, Logger, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { DeleteRawMaterialsLocationCommand } from './delete.command';

const HTTP_STATUS_OK = 200;
const ACTIVITY_LOGS_LIMIT = 10;

@CommandHandler(DeleteRawMaterialsLocationCommand)
export class DeleteRawMaterialsLocationHandler implements ICommandHandler<DeleteRawMaterialsLocationCommand> {
    protected readonly logger = new Logger(DeleteRawMaterialsLocationHandler.name);

    constructor(
        @Inject('RawMaterialsLocationDatabaseService')
        private readonly rawMaterialsLocationDatabaseService: RawMaterialsLocationDatabaseServiceAbstract
    ) {}

    async execute(
        command: DeleteRawMaterialsLocationCommand
    ): Promise<ResponseDto<RawMaterialsLocationDto | ErrorResponseDto>> {
        const existing = await this.rawMaterialsLocationDatabaseService.findRecordById(command.recordId);
        if (!existing) {
            throw new NotFoundException(`Raw materials location not found for ID: ${command.recordId}`);
        }

        const approveDirect = this.hasApprovalPermission(command.user);
        const timestamp = new Date().toLocaleString('en-US', { timeZone: 'Asia/Manila' });
        existing.activityLogs = existing.activityLogs || [];
        existing.activityLogs.push(
            approveDirect
                ? `Date: ${timestamp}, Raw materials location deleted by ${command.user.username}`
                : `Date: ${timestamp}, Raw materials location marked for deletion by ${command.user.username}`
        );
        existing.activityLogs = reduceArrayContents(existing.activityLogs, ACTIVITY_LOGS_LIMIT);
        existing.status = StatusEnum.FOR_DELETION;

        try {
            const result = approveDirect
                ? await this.rawMaterialsLocationDatabaseService.deleteRecord(existing)
                : await this.rawMaterialsLocationDatabaseService.updateRecord(existing);
            return new ResponseDto<RawMaterialsLocationDto>(result, HTTP_STATUS_OK);
        } catch (error) {
            this.logger.error('Failed to delete raw materials location', error as Error);
            throw new BadRequestException('Failed to delete raw materials location');
        }
    }

    private hasApprovalPermission(user: UserCognito): boolean {
        return (user.roles || []).some((role) => role === UserRole.ADMIN || role === UserRole.SUPER_ADMIN);
    }
}
