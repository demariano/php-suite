import { ApiProperty, OmitType } from '@nestjs/swagger';
import { ContractDto } from './contract.dto';

export class CreateContractDto extends OmitType(ContractDto, ['contractId'] as const) {
    @ApiProperty({ required: false, description: 'Area prefix ID for contract number generation' })
    areaPrefixId?: string;
}
