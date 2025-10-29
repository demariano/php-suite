import { OmitType } from '@nestjs/swagger';
import { AccountsDto } from './account.dto';

export class CreateAccountsDto extends OmitType(AccountsDto, ['accountingId'] as const) {}
