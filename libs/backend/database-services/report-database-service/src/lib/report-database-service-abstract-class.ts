import { PageDto, ReportDto } from '@dto';

export abstract class ReportDatabaseServiceAbstract {
    abstract createRecord(reportDto: ReportDto): Promise<ReportDto>;

    abstract deleteRecord(reportDto: ReportDto): Promise<ReportDto>;

    abstract updateRecordStatus(data: ReportDto): Promise<ReportDto>;

    abstract findRecordsByPagination(
        limit: number,
        direction: string,
        cursorPointer: string
    ): Promise<PageDto<ReportDto>>;

    abstract findRecordsByReportTypePagination(
        reportType: string,
        limit: number,
        direction: string,
        cursorPointer: string
    ): Promise<PageDto<ReportDto>>;

    abstract findRecordById(id: string): Promise<ReportDto | null>;
}
