import { ApiProperty } from '@nestjs/swagger';
import { AccountTypeEnum } from '../enums/account.type.enum';
import { StatusEnum } from '../enums/status.enum';

export class AccountsDto {
    @ApiProperty()
    accountingId!: string;

    @ApiProperty()
    accountName?: string;

    @ApiProperty({ enum: StatusEnum })
    status?: StatusEnum;

    @ApiProperty({ enum: AccountTypeEnum })
    accountType?: AccountTypeEnum;

    @ApiProperty()
    subAccounts?: string[];

    @ApiProperty()
    changeReason?: string;

    @ApiProperty()
    activityLogs?: string[];

    @ApiProperty()
    forApprovalVersion?: Record<string, unknown>;

    @ApiProperty()
    approverMessage?: string | null;
}
