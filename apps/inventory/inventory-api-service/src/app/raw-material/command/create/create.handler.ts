import { UserCognito } from '@auth-guard-lib';
import { ErrorResponseDto, RawMaterialDto, ResponseDto, StatusEnum, UserRole } from '@dto';
import { reduceArrayContents } from '@dynamo-db-lib';
import { RawMaterialDatabaseServiceAbstract } from '@inventory-database-service';
import { BadRequestException, Inject, Logger } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { CreateRawMaterialCommand } from './create.command';

const HTTP_STATUS_CREATED = 201;
const ACTIVITY_LOGS_LIMIT = 10;

@CommandHandler(CreateRawMaterialCommand)
export class CreateRawMaterialHandler implements ICommandHandler<CreateRawMaterialCommand> {
    protected readonly logger = new Logger(CreateRawMaterialHandler.name);

    constructor(
        @Inject('RawMaterialDatabaseService')
        private readonly rawMaterialDatabaseService: RawMaterialDatabaseServiceAbstract
    ) {}

    async execute(command: CreateRawMaterialCommand): Promise<ResponseDto<RawMaterialDto | ErrorResponseDto>> {
        this.logger.log(`Creating raw material: ${command.rawMaterialDto.rawMaterialName}`);

        // Prevent duplicate names
        const existingByName = await this.rawMaterialDatabaseService.findRecordByName(
            command.rawMaterialDto.rawMaterialName || ''
        );
        if (existingByName) {
            throw new BadRequestException('Raw material name already exists');
        }

        const hasApprovalPermission = this.hasApprovalPermission(command.user);
        this.prepareStatusAndAudit(command.rawMaterialDto, command.user, hasApprovalPermission);

        try {
            const created = await this.rawMaterialDatabaseService.createRecord(command.rawMaterialDto);
            return new ResponseDto<RawMaterialDto>(created, HTTP_STATUS_CREATED);
        } catch (error) {
            this.logger.error('Failed to create raw material', error as Error);
            throw new BadRequestException('Failed to create raw material');
        }
    }

    private hasApprovalPermission(user: UserCognito): boolean {
        return (user.roles || []).some((role) => role === UserRole.ADMIN || role === UserRole.SUPER_ADMIN);
    }

    private prepareStatusAndAudit(dto: RawMaterialDto, user: UserCognito, approveDirect: boolean): void {
        const timestamp = new Date().toLocaleString('en-US', { timeZone: 'Asia/Manila' });
        dto.activityLogs = dto.activityLogs || [];
        if (approveDirect) {
            dto.status = StatusEnum.ACTIVE;
            dto.activityLogs.push(`Date: ${timestamp}, Raw material created by ${user.username}, status set to ACTIVE`);
            dto.activityLogs = reduceArrayContents(dto.activityLogs, ACTIVITY_LOGS_LIMIT);
            dto.changeReason = undefined;
        } else {
            dto.status = StatusEnum.NEW_RECORD;
            dto.activityLogs.push(`Date: ${timestamp}, Raw material created by ${user.username} for approval`);
            dto.activityLogs = reduceArrayContents(dto.activityLogs, ACTIVITY_LOGS_LIMIT);
            dto.forApprovalVersion = {
                rawMaterialName: dto.rawMaterialName,
                description: dto.description,
            } as Record<string, unknown>;
        }
    }
}
