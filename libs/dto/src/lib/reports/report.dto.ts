import { ReportStatusEnum } from '../enums/report.status.enum';
import { ReportFileDetailDto } from './report.file.detail.dto';

export interface ReportHeader {
    description: string;
    metaData: Record<string, string>;
}

export interface ReportField {
    description: string;
    dataType: string;
}

export class ReportDto {
    reportId?: string;
    reportName?: string;
    reportFilename?: string;
    status?: ReportStatusEnum;
    headers?: ReportHeader[];
    rows?: ReportRow[];
    createdBy?: string;
    dateCreated?: string;
    dateRange?: string;
    fileDetails?: ReportFileDetailDto;
}

export interface ReportRow {
    [key: string]: any;
}
