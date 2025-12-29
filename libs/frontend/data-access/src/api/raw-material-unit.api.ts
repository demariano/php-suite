import { CreateRawMaterialUnitDto, RawMaterialUnitDto } from '../types/raw-material-unit.types';
import { AxiosConfig } from './axiosConfig';

export interface PaginatedResponse<T> {
    statusCode: number;
    data: T[];
    nextCursorPointer?: string;
    prevCursorPointer?: string;
}

export type RawMaterialUnitsResponse = PaginatedResponse<RawMaterialUnitDto>;

class RawMaterialUnitApi extends AxiosConfig {
    constructor() {
        super('API_INVENTORY_URL', true, false);
    }

    public getRawMaterialUnits = async (
        limit = 10,
        direction?: string,
        cursorPointer?: string,
        userRole?: string
    ): Promise<RawMaterialUnitsResponse> => {
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

        return await this.axiosInstance.get(`/raw-material-unit?${params.toString()}`);
    };

    public getRawMaterialUnitsByStatus = async (
        limit = 10,
        status: string,
        direction?: string,
        cursorPointer?: string,
        name?: string,
        userRole?: string
    ): Promise<RawMaterialUnitsResponse> => {
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

        return await this.axiosInstance.get(`/raw-material-unit/by-status?${params.toString()}`);
    };

    public searchRawMaterialUnitsByName = async (
        name: string,
        limit = 10,
        direction?: string,
        cursorPointer?: string,
        userRole?: string
    ): Promise<RawMaterialUnitsResponse> => {
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

        return await this.axiosInstance.get(`/raw-material-unit/search/by-name?${params.toString()}`);
    };

    public getRawMaterialUnitById = async (id: string, userRole?: string): Promise<RawMaterialUnitDto> => {
        const params = new URLSearchParams();

        if (userRole) {
            params.append('userRole', userRole);
        }

        const queryString = params.toString();
        const url = queryString ? `/raw-material-unit/${id}?${queryString}` : `/raw-material-unit/${id}`;

        return await this.axiosInstance.get(url);
    };

    public getRawMaterialUnitByName = async (name: string, userRole?: string): Promise<RawMaterialUnitDto> => {
        const params = new URLSearchParams();

        if (userRole) {
            params.append('userRole', userRole);
        }

        const queryString = params.toString();
        const url = queryString
            ? `/raw-material-unit/by-name/${name}?${queryString}`
            : `/raw-material-unit/by-name/${name}`;

        return await this.axiosInstance.get(url);
    };

    public createRawMaterialUnit = async (
        dto: CreateRawMaterialUnitDto,
        userRole?: string
    ): Promise<RawMaterialUnitDto> => {
        const params = new URLSearchParams();

        if (userRole) {
            params.append('userRole', userRole);
        }

        const queryString = params.toString();
        const url = queryString ? `/raw-material-unit?${queryString}` : '/raw-material-unit';

        return await this.axiosInstance.post(url, dto);
    };

    public updateRawMaterialUnit = async (
        id: string,
        dto: Partial<RawMaterialUnitDto>,
        userRole?: string
    ): Promise<RawMaterialUnitDto> => {
        const params = new URLSearchParams();

        if (userRole) {
            params.append('userRole', userRole);
        }

        const queryString = params.toString();
        const url = queryString ? `/raw-material-unit/${id}?${queryString}` : `/raw-material-unit/${id}`;

        return await this.axiosInstance.put(url, dto);
    };

    public deleteRawMaterialUnit = async (dto: RawMaterialUnitDto, userRole?: string): Promise<void> => {
        const params = new URLSearchParams();

        if (userRole) {
            params.append('userRole', userRole);
        }

        const queryString = params.toString();
        const url = queryString
            ? `/raw-material-unit/${dto.rawMaterialUnitId}?${queryString}`
            : `/raw-material-unit/${dto.rawMaterialUnitId}`;

        return await this.axiosInstance.delete(url, { data: dto });
    };

    public approveRawMaterialUnit = async (id: string, userRole?: string): Promise<RawMaterialUnitDto> => {
        const params = new URLSearchParams();

        if (userRole) {
            params.append('userRole', userRole);
        }

        const queryString = params.toString();
        const url = queryString
            ? `/raw-material-unit/${id}/approve?${queryString}`
            : `/raw-material-unit/${id}/approve`;

        return await this.axiosInstance.post(url);
    };

    public denyRawMaterialUnit = async (
        id: string,
        approverMessage: string,
        userRole?: string
    ): Promise<RawMaterialUnitDto> => {
        const params = new URLSearchParams();

        if (userRole) {
            params.append('userRole', userRole);
        }

        const queryString = params.toString();
        const url = queryString ? `/raw-material-unit/${id}/deny?${queryString}` : `/raw-material-unit/${id}/deny`;

        return await this.axiosInstance.post(url, { approverMessage });
    };
}

export default new RawMaterialUnitApi();
