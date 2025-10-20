import { OmitType } from '@nestjs/swagger';
import { ContractDto } from './contract.dto';

export class CreateContractDto extends OmitType(ContractDto, ['contractId'] as const) {}
