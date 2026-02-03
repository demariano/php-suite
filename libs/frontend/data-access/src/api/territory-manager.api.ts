import { CreateTerritoryManagerDto, TerritoryManagerDto } from '../types/territory-manager.types';
import { AxiosConfig } from './axiosConfig';

export interface PaginatedResponse<T> {
    statusCode: number;
    data: T[];
    nextCursorPointer?: string;
    prevCursorPointer?: string;
}

export type TerritoryManagersResponse = PaginatedResponse<TerritoryManagerDto>;

class TerritoryManagerApi extends AxiosConfig {
    constructor() {
        super('API_INVOICING_URL', true, false);
    }

    public getTerritoryManagers = async (
        limit = 10,
        status?: string,
        direction?: string,
        cursorPointer?: string,
        userRole?: string
    ): Promise<TerritoryManagersResponse> => {
        const params = new URLSearchParams({
            limit: limit.toString(),
        });

        if (status) {
            params.append('status', status);
            return this.getTerritoryManagersByStatus(limit, status, direction, cursorPointer, userRole);
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

        return await this.axiosInstance.get(`/territory-manager?${params.toString()}`);
    };

    public getTerritoryManagersByStatus = async (
        limit = 10,
        status: string,
        direction?: string,
        cursorPointer?: string,
        userRole?: string,
        name?: string
    ): Promise<TerritoryManagersResponse> => {
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

        return await this.axiosInstance.get(`/territory-manager/status?${params.toString()}`);
    };

    public getTerritoryManagerById = async (id: string, userRole?: string): Promise<TerritoryManagerDto> => {
        const params = new URLSearchParams();

        if (userRole) {
            params.append('userRole', userRole);
        }

        const queryString = params.toString();
        const url = queryString ? `/territory-manager/${id}?${queryString}` : `/territory-manager/${id}`;

        return await this.axiosInstance.get(url);
    };

    public getTerritoryManagersByName = async (
        name: string,
        limit = 10,
        direction?: string,
        cursorPointer?: string,
        userRole?: string
    ): Promise<TerritoryManagersResponse> => {
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

        return await this.axiosInstance.get(`/territory-manager/name/${name}?${params.toString()}`);
    };

    public createTerritoryManager = async (
        territoryManager: CreateTerritoryManagerDto,
        userRole?: string
    ): Promise<TerritoryManagerDto> => {
        const params = new URLSearchParams();

        if (userRole) {
            params.append('userRole', userRole);
        }

        const queryString = params.toString();
        const url = queryString ? `/territory-manager?${queryString}` : '/territory-manager';

        return await this.axiosInstance.post(url, territoryManager);
    };

    public updateTerritoryManager = async (
        id: string,
        territoryManager: Partial<TerritoryManagerDto>,
        userRole?: string
    ): Promise<TerritoryManagerDto> => {
        const params = new URLSearchParams();

        if (userRole) {
            params.append('userRole', userRole);
        }

        const queryString = params.toString();
        const url = queryString ? `/territory-manager/${id}?${queryString}` : `/territory-manager/${id}`;

        return await this.axiosInstance.put(url, territoryManager);
    };

    public deleteTerritoryManager = async (
        territoryManager: TerritoryManagerDto,
        deletionReason?: string,
        userRole?: string
    ): Promise<void> => {
        const params = new URLSearchParams();

        if (deletionReason) {
            params.append('deletionReason', deletionReason);
        }

        if (userRole) {
            params.append('userRole', userRole);
        }

        const queryString = params.toString();
        const url = queryString
            ? `/territory-manager/${territoryManager.territoryManagerId}?${queryString}`
            : `/territory-manager/${territoryManager.territoryManagerId}`;

        return await this.axiosInstance.delete(url, { data: territoryManager });
    };

    public approveTerritoryManager = async (id: string, userRole?: string): Promise<TerritoryManagerDto> => {
        const params = new URLSearchParams();

        if (userRole) {
            params.append('userRole', userRole);
        }

        const queryString = params.toString();
        const url = queryString
            ? `/territory-manager/${id}/approve?${queryString}`
            : `/territory-manager/${id}/approve`;

        return await this.axiosInstance.post(url);
    };

    public denyTerritoryManager = async (
        id: string,
        approverMessage: string,
        userRole?: string
    ): Promise<TerritoryManagerDto> => {
        const params = new URLSearchParams();

        if (userRole) {
            params.append('userRole', userRole);
        }

        const queryString = params.toString();
        const url = queryString ? `/territory-manager/${id}/deny?${queryString}` : `/territory-manager/${id}/deny`;

        return await this.axiosInstance.post(url, { approverMessage });
    };
}

export default new TerritoryManagerApi();
