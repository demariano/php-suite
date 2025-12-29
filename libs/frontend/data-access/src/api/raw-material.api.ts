import { CreateRawMaterialDto, RawMaterialDto } from '../types/raw-material.types';
import { AxiosConfig } from './axiosConfig';

export interface PaginatedResponse<T> {
    statusCode: number;
    data: T[];
    nextCursorPointer?: string;
    prevCursorPointer?: string;
}

export type RawMaterialsResponse = PaginatedResponse<RawMaterialDto>;

class RawMaterialApi extends AxiosConfig {
    constructor() {
        super('API_INVENTORY_URL', true, false);
    }

    public getRawMaterials = async (
        limit = 10,
        direction?: string,
        cursorPointer?: string,
        userRole?: string
    ): Promise<RawMaterialsResponse> => {
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

        return await this.axiosInstance.get(`/raw-material?${params.toString()}`);
    };

    public getRawMaterialsByStatus = async (
        limit = 10,
        status: string,
        direction?: string,
        cursorPointer?: string,
        name?: string,
        userRole?: string
    ): Promise<RawMaterialsResponse> => {
        const params = new URLSearchParams({
            limit: limit.toString(),
            status,
        });

        if (direction) {
            params.append('direction', direction);
        }

        if (cursorPointer) {
            params.append('cursorPointer', cursorPointer);
        }

        if (name) {
            params.append('name', name);
        }

        if (userRole) {
            params.append('userRole', userRole);
        }

        return await this.axiosInstance.get(`/raw-material/by-status?${params.toString()}`);
    };

    public searchRawMaterialsByName = async (
        name: string,
        limit = 10,
        direction?: string,
        cursorPointer?: string,
        userRole?: string
    ): Promise<RawMaterialsResponse> => {
        const params = new URLSearchParams({
            name,
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

        return await this.axiosInstance.get(`/raw-material/search/by-name?${params.toString()}`);
    };

    public getRawMaterialById = async (id: string, userRole?: string): Promise<RawMaterialDto> => {
        const params = new URLSearchParams();

        if (userRole) {
            params.append('userRole', userRole);
        }

        const queryString = params.toString();
        const url = queryString ? `/raw-material/${id}?${queryString}` : `/raw-material/${id}`;

        return await this.axiosInstance.get(url);
    };

    public getRawMaterialByName = async (name: string, userRole?: string): Promise<RawMaterialDto> => {
        const params = new URLSearchParams();

        if (userRole) {
            params.append('userRole', userRole);
        }

        const queryString = params.toString();
        const url = queryString ? `/raw-material/by-name/${name}?${queryString}` : `/raw-material/by-name/${name}`;

        return await this.axiosInstance.get(url);
    };

    public createRawMaterial = async (dto: CreateRawMaterialDto, userRole?: string): Promise<RawMaterialDto> => {
        const params = new URLSearchParams();

        if (userRole) {
            params.append('userRole', userRole);
        }

        const queryString = params.toString();
        const url = queryString ? `/raw-material?${queryString}` : '/raw-material';

        return await this.axiosInstance.post(url, dto);
    };

    public updateRawMaterial = async (
        id: string,
        dto: Partial<RawMaterialDto>,
        userRole?: string
    ): Promise<RawMaterialDto> => {
        const params = new URLSearchParams();

        if (userRole) {
            params.append('userRole', userRole);
        }

        const queryString = params.toString();
        const url = queryString ? `/raw-material/${id}?${queryString}` : `/raw-material/${id}`;

        return await this.axiosInstance.put(url, dto);
    };

    public approveRawMaterial = async (id: string, userRole?: string): Promise<RawMaterialDto> => {
        const params = new URLSearchParams();

        if (userRole) {
            params.append('userRole', userRole);
        }

        const queryString = params.toString();
        const url = queryString ? `/raw-material/${id}/approve?${queryString}` : `/raw-material/${id}/approve`;

        return await this.axiosInstance.post(url);
    };

    public denyRawMaterial = async (
        id: string,
        approverMessage?: string,
        userRole?: string
    ): Promise<RawMaterialDto> => {
        const params = new URLSearchParams();

        if (userRole) {
            params.append('userRole', userRole);
        }

        const payload = approverMessage ? { approverMessage } : undefined;
        const queryString = params.toString();
        const url = queryString ? `/raw-material/${id}/deny?${queryString}` : `/raw-material/${id}/deny`;

        return await this.axiosInstance.post(url, payload);
    };

    public deleteRawMaterial = async (id: string, userRole?: string): Promise<RawMaterialDto> => {
        const params = new URLSearchParams();

        if (userRole) {
            params.append('userRole', userRole);
        }

        const queryString = params.toString();
        const url = queryString ? `/raw-material/${id}?${queryString}` : `/raw-material/${id}`;

        return await this.axiosInstance.delete(url);
    };
}

export default new RawMaterialApi();
