import { OmitType } from '@nestjs/swagger';
import { ReportDto } from './report.dto';

export class CreateReportDto extends OmitType(ReportDto, ['reportId'] as const) {}
