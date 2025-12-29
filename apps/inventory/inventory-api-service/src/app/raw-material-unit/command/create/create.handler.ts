import { UserCognito } from '@auth-guard-lib';
import { ErrorResponseDto, RawMaterialUnitDto, ResponseDto, StatusEnum, UserRole } from '@dto';
import { reduceArrayContents } from '@dynamo-db-lib';
import { RawMaterialUnitDatabaseServiceAbstract } from '@inventory-database-service';
import { BadRequestException, Inject, Logger } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { CreateRawMaterialUnitCommand } from './create.command';

const HTTP_STATUS_CREATED = 201;
const ACTIVITY_LOGS_LIMIT = 10;

@CommandHandler(CreateRawMaterialUnitCommand)
export class CreateRawMaterialUnitHandler implements ICommandHandler<CreateRawMaterialUnitCommand> {
    protected readonly logger = new Logger(CreateRawMaterialUnitHandler.name);

    constructor(
        @Inject('RawMaterialUnitDatabaseService')
        private readonly rawMaterialUnitDatabaseService: RawMaterialUnitDatabaseServiceAbstract
    ) {}

    async execute(command: CreateRawMaterialUnitCommand): Promise<ResponseDto<RawMaterialUnitDto | ErrorResponseDto>> {
        this.logger.log(`Creating raw material unit: ${command.rawMaterialUnitDto.rawMaterialUnitName}`);

        const approveDirect = this.hasApprovalPermission(command.user);
        this.prepareStatusAndAudit(command.rawMaterialUnitDto, command.user, approveDirect);

        try {
            const created = await this.rawMaterialUnitDatabaseService.createRecord(command.rawMaterialUnitDto);
            return new ResponseDto<RawMaterialUnitDto>(created, HTTP_STATUS_CREATED);
        } catch (error) {
            this.logger.error('Failed to create raw material unit', error as Error);
            throw new BadRequestException('Failed to create raw material unit');
        }
    }

    private hasApprovalPermission(user: UserCognito): boolean {
        return (user.roles || []).some((role) => role === UserRole.ADMIN || role === UserRole.SUPER_ADMIN);
    }

    private prepareStatusAndAudit(dto: RawMaterialUnitDto, user: UserCognito, approveDirect: boolean): void {
        const timestamp = new Date().toLocaleString('en-US', { timeZone: 'Asia/Manila' });
        dto.activityLogs = dto.activityLogs || [];
        if (approveDirect) {
            dto.status = StatusEnum.ACTIVE;
            dto.activityLogs.push(
                `Date: ${timestamp}, Raw material unit created by ${user.username}, status set to ACTIVE`
            );
            dto.activityLogs = reduceArrayContents(dto.activityLogs, ACTIVITY_LOGS_LIMIT);
            dto.changeReason = undefined;
        } else {
            dto.status = StatusEnum.NEW_RECORD;
            dto.activityLogs.push(`Date: ${timestamp}, Raw material unit created by ${user.username} for approval`);
            dto.activityLogs = reduceArrayContents(dto.activityLogs, ACTIVITY_LOGS_LIMIT);
            dto.forApprovalVersion = {
                rawMaterialUnitName: dto.rawMaterialUnitName,
            } as Record<string, unknown>;
        }
    }
}
