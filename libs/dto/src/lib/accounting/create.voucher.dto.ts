import { OmitType } from '@nestjs/swagger';
import { VoucherDto } from './voucher.dto';

export class CreateVoucherDto extends OmitType(VoucherDto, ['voucherId'] as const) {}
