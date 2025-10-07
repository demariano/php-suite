import { AreaDto, CreateAreaDto } from '../types/area.types';
import { AxiosConfig } from './axiosConfig';

export interface PaginatedResponse<T> {
    statusCode: number;
    data: T[];
    nextCursorPointer?: string;
    prevCursorPointer?: string;
}

export type AreasResponse = PaginatedResponse<AreaDto>;

class AreaApi extends AxiosConfig {
    constructor() {
        super('API_CUSTOMER_URL', true, false);
    }

    public getAreas = async (
        limit = 10,
        status?: string,
        direction?: string,
        cursorPointer?: string,
        userRole?: string
    ): Promise<AreasResponse> => {
        const params = new URLSearchParams({
            limit: limit.toString(),
        });

        if (status) {
            return this.getAreasByStatus(limit, status, direction, cursorPointer, userRole);
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

        return await this.axiosInstance.get(`/area?${params.toString()}`);
    };

    public getAreasByStatus = async (
        limit = 10,
        status: string,
        direction?: string,
        cursorPointer?: string,
        userRole?: string,
        name?: string
    ): Promise<AreasResponse> => {
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

        return await this.axiosInstance.get(`/area/status?${params.toString()}`);
    };

    public getAreaById = async (id: string, userRole?: string): Promise<AreaDto> => {
        const params = new URLSearchParams();
        if (userRole) {
            params.append('userRole', userRole);
        }
        const queryString = params.toString();
        const url = queryString ? `/area/${id}?${queryString}` : `/area/${id}`;
        return await this.axiosInstance.get(url);
    };

    public getAreasByName = async (
        name: string,
        limit = 10,
        direction?: string,
        cursorPointer?: string,
        userRole?: string
    ): Promise<AreasResponse> => {
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

        return await this.axiosInstance.get(`/area/name/${name}?${params.toString()}`);
    };

    public createArea = async (area: CreateAreaDto, userRole?: string): Promise<AreaDto> => {
        const params = new URLSearchParams();
        if (userRole) {
            params.append('userRole', userRole);
        }
        const queryString = params.toString();
        const url = queryString ? `/area?${queryString}` : '/area';
        return await this.axiosInstance.post(url, area);
    };

    public updateArea = async (id: string, area: Partial<AreaDto>, userRole?: string): Promise<AreaDto> => {
        const params = new URLSearchParams();
        if (userRole) {
            params.append('userRole', userRole);
        }
        const queryString = params.toString();
        const url = queryString ? `/area/${id}?${queryString}` : `/area/${id}`;
        return await this.axiosInstance.put(url, area);
    };

    public deleteArea = async (area: AreaDto, userRole?: string): Promise<void> => {
        const params = new URLSearchParams();
        if (userRole) {
            params.append('userRole', userRole);
        }
        const queryString = params.toString();
        const url = queryString ? `/area/${area.areaId}?${queryString}` : `/area/${area.areaId}`;
        return await this.axiosInstance.delete(url, { data: area });
    };

    public approveArea = async (id: string, userRole?: string): Promise<AreaDto> => {
        const params = new URLSearchParams();
        if (userRole) {
            params.append('userRole', userRole);
        }
        const queryString = params.toString();
        const url = queryString ? `/area/${id}/approve?${queryString}` : `/area/${id}/approve`;
        return await this.axiosInstance.post(url);
    };

    public denyArea = async (id: string, userRole?: string): Promise<AreaDto> => {
        const params = new URLSearchParams();
        if (userRole) {
            params.append('userRole', userRole);
        }
        const queryString = params.toString();
        const url = queryString ? `/area/${id}/deny?${queryString}` : `/area/${id}/deny`;
        return await this.axiosInstance.post(url);
    };
}

export default new AreaApi();
