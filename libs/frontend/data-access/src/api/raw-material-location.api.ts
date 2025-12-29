import { CreateRawMaterialsLocationDto, RawMaterialsLocationDto } from '../types/raw-material-location.types';
import { AxiosConfig } from './axiosConfig';

export interface PaginatedResponse<T> {
    statusCode: number;
    data: T[];
    nextCursorPointer?: string;
    prevCursorPointer?: string;
}

export type RawMaterialsLocationsResponse = PaginatedResponse<RawMaterialsLocationDto>;

class RawMaterialsLocationApi extends AxiosConfig {
    constructor() {
        super('API_INVENTORY_URL', true, false);
    }

    public getRawMaterialsLocations = async (
        limit = 10,
        direction?: string,
        cursorPointer?: string,
        userRole?: string
    ): Promise<RawMaterialsLocationsResponse> => {
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

        return await this.axiosInstance.get(`/raw-materials-location?${params.toString()}`);
    };

    public getRawMaterialsLocationsByStatus = async (
        limit = 10,
        status: string,
        direction?: string,
        cursorPointer?: string,
        name?: string,
        userRole?: string
    ): Promise<RawMaterialsLocationsResponse> => {
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

        return await this.axiosInstance.get(`/raw-materials-location/by-status?${params.toString()}`);
    };

    public searchRawMaterialsLocationsByName = async (
        name: string,
        limit = 10,
        direction?: string,
        cursorPointer?: string,
        userRole?: string
    ): Promise<RawMaterialsLocationsResponse> => {
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

        return await this.axiosInstance.get(`/raw-materials-location/search/by-name?${params.toString()}`);
    };

    public getRawMaterialsLocationById = async (id: string, userRole?: string): Promise<RawMaterialsLocationDto> => {
        const params = new URLSearchParams();

        if (userRole) {
            params.append('userRole', userRole);
        }

        const queryString = params.toString();
        const url = queryString ? `/raw-materials-location/${id}?${queryString}` : `/raw-materials-location/${id}`;

        return await this.axiosInstance.get(url);
    };

    public getRawMaterialsLocationByName = async (
        name: string,
        userRole?: string
    ): Promise<RawMaterialsLocationDto> => {
        const params = new URLSearchParams();

        if (userRole) {
            params.append('userRole', userRole);
        }

        const queryString = params.toString();
        const url = queryString
            ? `/raw-materials-location/by-name/${name}?${queryString}`
            : `/raw-materials-location/by-name/${name}`;

        return await this.axiosInstance.get(url);
    };

    public createRawMaterialsLocation = async (
        dto: CreateRawMaterialsLocationDto,
        userRole?: string
    ): Promise<RawMaterialsLocationDto> => {
        const params = new URLSearchParams();

        if (userRole) {
            params.append('userRole', userRole);
        }

        const queryString = params.toString();
        const url = queryString ? `/raw-materials-location?${queryString}` : '/raw-materials-location';

        return await this.axiosInstance.post(url, dto);
    };

    public updateRawMaterialsLocation = async (
        id: string,
        dto: Partial<RawMaterialsLocationDto>,
        userRole?: string
    ): Promise<RawMaterialsLocationDto> => {
        const params = new URLSearchParams();

        if (userRole) {
            params.append('userRole', userRole);
        }

        const queryString = params.toString();
        const url = queryString ? `/raw-materials-location/${id}?${queryString}` : `/raw-materials-location/${id}`;

        return await this.axiosInstance.put(url, dto);
    };

    public deleteRawMaterialsLocation = async (dto: RawMaterialsLocationDto, userRole?: string): Promise<void> => {
        const params = new URLSearchParams();

        if (userRole) {
            params.append('userRole', userRole);
        }

        const queryString = params.toString();
        const url = queryString
            ? `/raw-materials-location/${dto.rawMaterialsLocationId}?${queryString}`
            : `/raw-materials-location/${dto.rawMaterialsLocationId}`;

        return await this.axiosInstance.delete(url, { data: dto });
    };

    public approveRawMaterialsLocation = async (id: string, userRole?: string): Promise<RawMaterialsLocationDto> => {
        const params = new URLSearchParams();

        if (userRole) {
            params.append('userRole', userRole);
        }

        const queryString = params.toString();
        const url = queryString
            ? `/raw-materials-location/${id}/approve?${queryString}`
            : `/raw-materials-location/${id}/approve`;

        return await this.axiosInstance.post(url);
    };

    public denyRawMaterialsLocation = async (
        id: string,
        approverMessage: string,
        userRole?: string
    ): Promise<RawMaterialsLocationDto> => {
        const params = new URLSearchParams();

        if (userRole) {
            params.append('userRole', userRole);
        }

        const queryString = params.toString();
        const url = queryString
            ? `/raw-materials-location/${id}/deny?${queryString}`
            : `/raw-materials-location/${id}/deny`;

        return await this.axiosInstance.post(url, { approverMessage });
    };
}

export default new RawMaterialsLocationApi();
