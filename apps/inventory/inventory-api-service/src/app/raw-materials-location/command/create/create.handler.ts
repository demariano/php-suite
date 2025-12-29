import { UserCognito } from '@auth-guard-lib';
import { ErrorResponseDto, RawMaterialsLocationDto, ResponseDto, StatusEnum, UserRole } from '@dto';
import { reduceArrayContents } from '@dynamo-db-lib';
import { RawMaterialsLocationDatabaseServiceAbstract } from '@inventory-database-service';
import { BadRequestException, Inject, Logger } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { CreateRawMaterialsLocationCommand } from './create.command';

const HTTP_STATUS_CREATED = 201;
const ACTIVITY_LOGS_LIMIT = 10;

@CommandHandler(CreateRawMaterialsLocationCommand)
export class CreateRawMaterialsLocationHandler implements ICommandHandler<CreateRawMaterialsLocationCommand> {
    protected readonly logger = new Logger(CreateRawMaterialsLocationHandler.name);

    constructor(
        @Inject('RawMaterialsLocationDatabaseService')
        private readonly rawMaterialsLocationDatabaseService: RawMaterialsLocationDatabaseServiceAbstract
    ) {}

    async execute(
        command: CreateRawMaterialsLocationCommand
    ): Promise<ResponseDto<RawMaterialsLocationDto | ErrorResponseDto>> {
        this.logger.log(`Creating raw materials location: ${command.rawMaterialsLocationDto.rawMaterialsLocationName}`);

        const hasApprovalPermission = this.hasApprovalPermission(command.user);
        this.prepareStatusAndAudit(command.rawMaterialsLocationDto, command.user, hasApprovalPermission);

        try {
            const created = await this.rawMaterialsLocationDatabaseService.createRecord(
                command.rawMaterialsLocationDto
            );
            return new ResponseDto<RawMaterialsLocationDto>(created, HTTP_STATUS_CREATED);
        } catch (error) {
            this.logger.error('Failed to create raw materials location', error as Error);
            throw new BadRequestException('Failed to create raw materials location');
        }
    }

    private hasApprovalPermission(user: UserCognito): boolean {
        return (user.roles || []).some((role) => role === UserRole.ADMIN || role === UserRole.SUPER_ADMIN);
    }

    private prepareStatusAndAudit(dto: RawMaterialsLocationDto, user: UserCognito, approveDirect: boolean): void {
        const timestamp = new Date().toLocaleString('en-US', { timeZone: 'Asia/Manila' });
        dto.activityLogs = dto.activityLogs || [];
        if (approveDirect) {
            dto.status = StatusEnum.ACTIVE;
            dto.activityLogs.push(
                `Date: ${timestamp}, Raw materials location created by ${user.username}, status set to ACTIVE`
            );
            dto.activityLogs = reduceArrayContents(dto.activityLogs, ACTIVITY_LOGS_LIMIT);
            dto.changeReason = undefined;
        } else {
            dto.status = StatusEnum.NEW_RECORD;
            dto.activityLogs.push(
                `Date: ${timestamp}, Raw materials location created by ${user.username} for approval`
            );
            dto.activityLogs = reduceArrayContents(dto.activityLogs, ACTIVITY_LOGS_LIMIT);
            dto.forApprovalVersion = {
                rawMaterialsLocationName: dto.rawMaterialsLocationName,
            } as Record<string, unknown>;
        }
    }
}
