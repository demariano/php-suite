import { OmitType } from '@nestjs/swagger';
import { RawMaterialSupplierDto } from './raw.material.supplier.dto';

export class CreateRawMaterialSupplierDto extends OmitType(RawMaterialSupplierDto, [
    'rawMaterialSupplierId',
] as const) {}
