import { CreateTermsDto, TermsDto } from '../types/terms.types';
import { AxiosConfig } from './axiosConfig';

export interface PaginatedResponse<T> {
    statusCode: number;
    data: T[];
    nextCursorPointer?: string;
    prevCursorPointer?: string;
}

export type TermsResponse = PaginatedResponse<TermsDto>;

class TermsApi extends AxiosConfig {
    constructor() {
        super('API_CUSTOMER_URL', true, false);
    }

    public getTerms = async (
        limit = 10,
        status?: string,
        direction?: string,
        cursorPointer?: string,
        userRole?: string,
        name?: string
    ): Promise<TermsResponse> => {
        const params = new URLSearchParams({
            limit: limit.toString(),
        });

        if (status) {
            params.append('status', status);
            return this.getTermsByStatus(limit, status, direction, cursorPointer, userRole, name);
        }

        if (direction) {
            params.append('direction', direction);
        }

        if (cursorPointer) {
            params.append('cursorPointer', cursorPointer);
        }

        if (userRole) {
            params.append('userRole', userRole);
        }

        return await this.axiosInstance.get(`/terms?${params.toString()}`);
    };

    public getTermsByStatus = async (
        limit = 10,
        status: string,
        direction?: string,
        cursorPointer?: string,
        userRole?: string,
        name?: string
    ): Promise<TermsResponse> => {
        const params = new URLSearchParams({
            limit: limit.toString(),
            status: status,
        });

        if (direction) {
            params.append('direction', direction);
        }

        if (cursorPointer) {
            params.append('cursorPointer', cursorPointer);
        }

        if (userRole) {
            params.append('userRole', userRole);
        }

        if (name) {
            params.append('name', name);
        }

        return await this.axiosInstance.get(`/terms/status?${params.toString()}`);
    };

    public getTermsById = async (id: string, userRole?: string): Promise<TermsDto> => {
        const params = new URLSearchParams();

        if (userRole) {
            params.append('userRole', userRole);
        }

        const queryString = params.toString();
        const url = queryString ? `/terms/${id}?${queryString}` : `/terms/${id}`;

        return await this.axiosInstance.get(url);
    };

    public getTermsByName = async (
        name: string,
        limit = 10,
        direction?: string,
        cursorPointer?: string,
        userRole?: string
    ): Promise<TermsResponse> => {
        const params = new URLSearchParams({
            limit: limit.toString(),
        });

        if (direction) {
            params.append('direction', direction);
        }

        if (cursorPointer) {
            params.append('cursorPointer', cursorPointer);
        }

        if (userRole) {
            params.append('userRole', userRole);
        }

        return await this.axiosInstance.get(`/terms/name/${name}?${params.toString()}`);
    };

    public createTerms = async (terms: CreateTermsDto, userRole?: string): Promise<TermsDto> => {
        const params = new URLSearchParams();

        if (userRole) {
            params.append('userRole', userRole);
        }

        const queryString = params.toString();
        const url = queryString ? `/terms?${queryString}` : '/terms';

        return await this.axiosInstance.post(url, terms);
    };

    public updateTerms = async (id: string, terms: Partial<TermsDto>, userRole?: string): Promise<TermsDto> => {
        const params = new URLSearchParams();

        if (userRole) {
            params.append('userRole', userRole);
        }

        const queryString = params.toString();
        const url = queryString ? `/terms/${id}?${queryString}` : `/terms/${id}`;

        return await this.axiosInstance.put(url, terms);
    };

    public deleteTerms = async (id: string, deletionReason: string, userRole?: string): Promise<void> => {
        const params = new URLSearchParams();

        if (userRole) {
            params.append('userRole', userRole);
        }

        if (deletionReason) {
            params.append('deletionReason', deletionReason);
        }

        const queryString = params.toString();
        const url = queryString ? `/terms/${id}?${queryString}` : `/terms/${id}`;

        return await this.axiosInstance.delete(url);
    };

    public approveTerms = async (id: string, userRole?: string): Promise<TermsDto> => {
        const params = new URLSearchParams();

        if (userRole) {
            params.append('userRole', userRole);
        }

        const queryString = params.toString();
        const url = queryString ? `/terms/${id}/approve?${queryString}` : `/terms/${id}/approve`;

        return await this.axiosInstance.post(url);
    };

    public denyTerms = async (id: string, approverMessage: string, userRole?: string): Promise<TermsDto> => {
        const params = new URLSearchParams();

        if (userRole) {
            params.append('userRole', userRole);
        }

        const queryString = params.toString();
        const url = queryString ? `/terms/${id}/deny?${queryString}` : `/terms/${id}/deny`;

        return await this.axiosInstance.post(url, { approverMessage });
    };
}

export default new TermsApi();
