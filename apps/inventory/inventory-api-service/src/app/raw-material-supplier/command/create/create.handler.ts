import { UserCognito } from '@auth-guard-lib';
import { ErrorResponseDto, RawMaterialSupplierDto, ResponseDto, StatusEnum, UserRole } from '@dto';
import { reduceArrayContents } from '@dynamo-db-lib';
import { RawMaterialSupplierDatabaseServiceAbstract } from '@inventory-database-service';
import { BadRequestException, Inject, Logger } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { CreateRawMaterialSupplierCommand } from './create.command';

const HTTP_STATUS_CREATED = 201;
const ACTIVITY_LOGS_LIMIT = 10;

@CommandHandler(CreateRawMaterialSupplierCommand)
export class CreateRawMaterialSupplierHandler implements ICommandHandler<CreateRawMaterialSupplierCommand> {
    protected readonly logger = new Logger(CreateRawMaterialSupplierHandler.name);

    constructor(
        @Inject('RawMaterialSupplierDatabaseService')
        private readonly rawMaterialSupplierDatabaseService: RawMaterialSupplierDatabaseServiceAbstract
    ) {}

    async execute(
        command: CreateRawMaterialSupplierCommand
    ): Promise<ResponseDto<RawMaterialSupplierDto | ErrorResponseDto>> {
        this.logger.log(`Creating raw material supplier: ${command.rawMaterialSupplierDto.rawMaterialSupplierName}`);

        const hasApprovalPermission = this.hasApprovalPermission(command.user);
        this.prepareStatusAndAudit(command.rawMaterialSupplierDto, command.user, hasApprovalPermission);

        try {
            const created = await this.rawMaterialSupplierDatabaseService.createRecord(command.rawMaterialSupplierDto);
            return new ResponseDto<RawMaterialSupplierDto>(created, HTTP_STATUS_CREATED);
        } catch (error) {
            this.logger.error('Failed to create raw material supplier', error as Error);
            throw new BadRequestException('Failed to create raw material supplier');
        }
    }

    private hasApprovalPermission(user: UserCognito): boolean {
        return (user.roles || []).some((role) => role === UserRole.ADMIN || role === UserRole.SUPER_ADMIN);
    }

    private prepareStatusAndAudit(dto: RawMaterialSupplierDto, user: UserCognito, approveDirect: boolean): void {
        const timestamp = new Date().toLocaleString('en-US', { timeZone: 'Asia/Manila' });
        dto.activityLogs = dto.activityLogs || [];
        if (approveDirect) {
            dto.status = StatusEnum.ACTIVE;
            dto.activityLogs.push(
                `Date: ${timestamp}, Raw material supplier created by ${user.username}, status set to ACTIVE`
            );
            dto.activityLogs = reduceArrayContents(dto.activityLogs, ACTIVITY_LOGS_LIMIT);
            dto.changeReason = undefined;
        } else {
            dto.status = StatusEnum.NEW_RECORD;
            dto.activityLogs.push(`Date: ${timestamp}, Raw material supplier created by ${user.username} for approval`);
            dto.activityLogs = reduceArrayContents(dto.activityLogs, ACTIVITY_LOGS_LIMIT);
            dto.forApprovalVersion = {
                rawMaterialSupplierName: dto.rawMaterialSupplierName,
            } as Record<string, unknown>;
        }
    }
}
