import { OmitType } from '@nestjs/swagger';
import { TermsDto } from './terms.dto';

export class CreateTermsDto extends OmitType(TermsDto, ['termsId'] as const) {}
