import { CreateReportDto, ReportDto } from '../types/report.types';
import { AxiosConfig } from './axiosConfig';

export interface PaginatedResponse<T> {
    statusCode: number;
    data: T[];
    nextCursorPointer?: string;
    prevCursorPointer?: string;
}

export type ReportsResponse = PaginatedResponse<ReportDto>;

class ReportApi extends AxiosConfig {
    constructor() {
        super('API_REPORT_URL', true, false);
    }

    public createReport = async (
        createReportDto: CreateReportDto
    ): Promise<{ statusCode: number; data: ReportDto }> => {
        return await this.axiosInstance.post('/reports', createReportDto);
    };

    public deleteReport = async (id: string): Promise<{ statusCode: number; data: ReportDto }> => {
        return await this.axiosInstance.delete(`/reports/${id}`);
    };

    public getReportById = async (id: string): Promise<{ statusCode: number; data: ReportDto }> => {
        return await this.axiosInstance.get(`/reports/${id}`);
    };

    public getReports = async (limit = 10, direction?: string, cursorPointer?: string): Promise<ReportsResponse> => {
        const params = new URLSearchParams({
            limit: limit.toString(),
        });

        if (direction) {
            params.append('direction', direction);
        }

        if (cursorPointer) {
            params.append('cursorPointer', cursorPointer);
        }

        return await this.axiosInstance.get(`/reports?${params.toString()}`);
    };

    public getReportsByType = async (
        reportType: string,
        limit = 10,
        direction?: string,
        cursorPointer?: string
    ): Promise<ReportsResponse> => {
        const params = new URLSearchParams({
            limit: limit.toString(),
        });

        if (direction) {
            params.append('direction', direction);
        }

        if (cursorPointer) {
            params.append('cursorPointer', cursorPointer);
        }

        return await this.axiosInstance.get(`/reports/type/${reportType}?${params.toString()}`);
    };

    public getDownloadUrl = async (reportId: string): Promise<{ statusCode: number; data: string }> => {
        return await this.axiosInstance.get(`/reports/${reportId}/download-url`);
    };
}

export default new ReportApi();
