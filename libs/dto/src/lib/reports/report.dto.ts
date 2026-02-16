import { ReportStatusEnum } from '../enums/report.status.enum';
import { ReportTypeEnum } from '../enums/report.type.enum';
import { ReportFilterParams } from './report.event.dto';
import { ReportFileDetailDto } from './report.file.detail.dto';

export class ReportDto {
    reportId?: string;
    reportName?: string;
    reportFilename?: string;
    reportType?: ReportTypeEnum;
    status?: ReportStatusEnum;
    createdBy?: string;
    dateCreated?: string;
    dateRange?: string;
    fileDetails?: ReportFileDetailDto;
    filters?: ReportFilterParams;
    errorMessage?: string;
    headers?: { description: string; metaData?: Record<string, unknown> }[];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    rows?: Record<string, any>[];

    workbook?: {
        sheets: Array<{
            name: string;
            headers: { description: string; metaData?: Record<string, unknown> }[];
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            rows: Record<string, any>[];
        }>;
    };
}
