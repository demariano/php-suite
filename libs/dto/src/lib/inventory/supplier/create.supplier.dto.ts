import { OmitType } from '@nestjs/swagger';
import { SupplierDto } from './supplier.dto';

export class CreateSupplierDto extends OmitType(SupplierDto, ['supplierId'] as const) {}
