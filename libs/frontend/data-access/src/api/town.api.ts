import { CreateTownDto, TownDto } from '../types/town.types';
import { AxiosConfig } from './axiosConfig';

export interface PaginatedResponse<T> {
    statusCode: number;
    data: T[];
    nextCursorPointer?: string;
    prevCursorPointer?: string;
}

export type TownsResponse = PaginatedResponse<TownDto>;

class TownApi extends AxiosConfig {
    constructor() {
        super('API_CUSTOMER_URL', true, false);
    }

    public getTowns = async (
        limit = 10,
        status?: string,
        direction?: string,
        cursorPointer?: string,
        userRole?: string
    ): Promise<TownsResponse> => {
        const params = new URLSearchParams({
            limit: limit.toString(),
        });

        if (status) {
            return this.getTownsByStatus(limit, status, direction, cursorPointer, userRole);
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

        return await this.axiosInstance.get(`/town?${params.toString()}`);
    };

    public getTownsByStatus = async (
        limit = 10,
        status: string,
        direction?: string,
        cursorPointer?: string,
        userRole?: string,
        name?: string
    ): Promise<TownsResponse> => {
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

        return await this.axiosInstance.get(`/town/status?${params.toString()}`);
    };

    public getTownById = async (id: string, userRole?: string): Promise<TownDto> => {
        const params = new URLSearchParams();
        if (userRole) {
            params.append('userRole', userRole);
        }
        const queryString = params.toString();
        const url = queryString ? `/town/${id}?${queryString}` : `/town/${id}`;
        return await this.axiosInstance.get(url);
    };

    public getTownsByName = async (
        name: string,
        limit = 10,
        direction?: string,
        cursorPointer?: string,
        userRole?: string
    ): Promise<TownsResponse> => {
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

        return await this.axiosInstance.get(`/town/name/${name}?${params.toString()}`);
    };

    public createTown = async (town: CreateTownDto, userRole?: string): Promise<TownDto> => {
        const params = new URLSearchParams();
        if (userRole) {
            params.append('userRole', userRole);
        }
        const queryString = params.toString();
        const url = queryString ? `/town?${queryString}` : '/town';
        return await this.axiosInstance.post(url, town);
    };

    public updateTown = async (id: string, town: Partial<TownDto>, userRole?: string): Promise<TownDto> => {
        const params = new URLSearchParams();
        if (userRole) {
            params.append('userRole', userRole);
        }
        const queryString = params.toString();
        const url = queryString ? `/town/${id}?${queryString}` : `/town/${id}`;
        return await this.axiosInstance.put(url, town);
    };

    public deleteTown = async (town: TownDto, userRole?: string): Promise<void> => {
        const params = new URLSearchParams();
        if (userRole) {
            params.append('userRole', userRole);
        }
        const queryString = params.toString();
        const url = queryString ? `/town/${town.townId}?${queryString}` : `/town/${town.townId}`;
        return await this.axiosInstance.delete(url, { data: town });
    };

    public approveTown = async (id: string, userRole?: string): Promise<TownDto> => {
        const params = new URLSearchParams();
        if (userRole) {
            params.append('userRole', userRole);
        }
        const queryString = params.toString();
        const url = queryString ? `/town/${id}/approve?${queryString}` : `/town/${id}/approve`;
        return await this.axiosInstance.post(url);
    };

    public denyTown = async (id: string, userRole?: string): Promise<TownDto> => {
        const params = new URLSearchParams();
        if (userRole) {
            params.append('userRole', userRole);
        }
        const queryString = params.toString();
        const url = queryString ? `/town/${id}/deny?${queryString}` : `/town/${id}/deny`;
        return await this.axiosInstance.post(url);
    };

    public getTownsByAreaStatus = async (areaId: string, status: string, userRole?: string): Promise<TownDto[]> => {
        const params = new URLSearchParams();
        if (userRole) {
            params.append('userRole', userRole);
        }
        const queryString = params.toString();
        const url = queryString
            ? `/town/area/${areaId}/status/${status}?${queryString}`
            : `/town/area/${areaId}/status/${status}`;
        return await this.axiosInstance.get(url);
    };

    public getTownsByArea = async (areaId: string, userRole?: string): Promise<TownsResponse> => {
        const params = new URLSearchParams();
        if (userRole) {
            params.append('userRole', userRole);
        }
        const queryString = params.toString();
        const url = queryString
            ? `/town/area/${areaId}/status/ACTIVE?${queryString}`
            : `/town/area/${areaId}/status/ACTIVE`;
        return await this.axiosInstance.get(url);
    };
}

export default new TownApi();
