import { UserCognito } from '@auth-guard-lib';
import { ErrorResponseDto, RawMaterialsStockDto, ResponseDto, StatusEnum, UserRole } from '@dto';
import { reduceArrayContents } from '@dynamo-db-lib';
import { RawMaterialsStockDatabaseServiceAbstract } from '@inventory-database-service';
import { BadRequestException, Inject, Logger } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { CreateRawMaterialsStockCommand } from './create.command';

const HTTP_STATUS_CREATED = 201;
const ACTIVITY_LOGS_LIMIT = 10;

@CommandHandler(CreateRawMaterialsStockCommand)
export class CreateRawMaterialsStockHandler implements ICommandHandler<CreateRawMaterialsStockCommand> {
    protected readonly logger = new Logger(CreateRawMaterialsStockHandler.name);

    constructor(
        @Inject('RawMaterialsStockDatabaseService')
        private readonly rawMaterialsStockDatabaseService: RawMaterialsStockDatabaseServiceAbstract
    ) {}

    async execute(
        command: CreateRawMaterialsStockCommand
    ): Promise<ResponseDto<RawMaterialsStockDto | ErrorResponseDto>> {
        this.logger.log(`Creating raw materials stock: ${command.rawMaterialsStockDto.rawMaterialName}`);

        const hasApprovalPermission = this.hasApprovalPermission(command.user);
        this.prepareStatusAndAudit(command.rawMaterialsStockDto, command.user, hasApprovalPermission);

        try {
            const created = await this.rawMaterialsStockDatabaseService.createRecord(command.rawMaterialsStockDto);
            return new ResponseDto<RawMaterialsStockDto>(created, HTTP_STATUS_CREATED);
        } catch (error) {
            this.logger.error('Failed to create raw materials stock', error as Error);
            throw new BadRequestException('Failed to create raw materials stock');
        }
    }

    private hasApprovalPermission(user: UserCognito): boolean {
        return (user.roles || []).some((role) => role === UserRole.ADMIN || role === UserRole.SUPER_ADMIN);
    }

    private prepareStatusAndAudit(dto: RawMaterialsStockDto, user: UserCognito, approveDirect: boolean): void {
        const timestamp = new Date().toLocaleString('en-US', { timeZone: 'Asia/Manila' });
        dto.activityLogs = dto.activityLogs || [];
        if (approveDirect) {
            dto.status = StatusEnum.ACTIVE;
            dto.activityLogs.push(
                `Date: ${timestamp}, Raw materials stock created by ${user.username}, status set to ACTIVE`
            );
            dto.activityLogs = reduceArrayContents(dto.activityLogs, ACTIVITY_LOGS_LIMIT);
            dto.changeReason = undefined;
        } else {
            dto.status = StatusEnum.NEW_RECORD;
            dto.activityLogs.push(`Date: ${timestamp}, Raw materials stock created by ${user.username} for approval`);
            dto.activityLogs = reduceArrayContents(dto.activityLogs, ACTIVITY_LOGS_LIMIT);
            dto.forApprovalVersion = {
                rawMaterialId: dto.rawMaterialId,
                rawMaterialName: dto.rawMaterialName,
                rawMaterialUnitId: dto.rawMaterialUnitId,
                rawMaterialUnitName: dto.rawMaterialUnitName,
                rawMaterialSupplierId: dto.rawMaterialSupplierId,
                rawMaterialSupplierName: dto.rawMaterialSupplierName,
                rawMaterialsLocationId: dto.rawMaterialsLocationId,
                rawMaterialsLocationName: dto.rawMaterialsLocationName,
                rawMaterialNamePoNo: dto.rawMaterialNamePoNo,
                qty: dto.qty,
                lotNo: dto.lotNo,
            } as Record<string, unknown>;
        }
    }
}
