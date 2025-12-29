import { CreateRawMaterialSupplierDto, RawMaterialSupplierDto } from '../types/raw-material-supplier.types';
import { AxiosConfig } from './axiosConfig';

export interface PaginatedResponse<T> {
    statusCode: number;
    data: T[];
    nextCursorPointer?: string;
    prevCursorPointer?: string;
}

export type RawMaterialSuppliersResponse = PaginatedResponse<RawMaterialSupplierDto>;

class RawMaterialSupplierApi extends AxiosConfig {
    constructor() {
        super('API_INVENTORY_URL', true, false);
    }

    public getRawMaterialSuppliers = async (
        limit = 10,
        direction?: string,
        cursorPointer?: string,
        userRole?: string
    ): Promise<RawMaterialSuppliersResponse> => {
        const params = new URLSearchParams({
            limit: limit.toString(),
        });

        if (direction) {
            params.append('direction', direction);
        }

        if (cursorPointer) {
            params.append('cursorPointer', cursorPointer);
        }

        // SECURITY: Only add userRole when explicitly provided (e.g., BYPASS_AUTH)
        if (userRole) {
            params.append('userRole', userRole);
        }

        return await this.axiosInstance.get(`/raw-material-supplier?${params.toString()}`);
    };

    public getRawMaterialSuppliersByStatus = async (
        limit = 10,
        status: string,
        direction?: string,
        cursorPointer?: string,
        name?: string,
        userRole?: string
    ): Promise<RawMaterialSuppliersResponse> => {
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

        return await this.axiosInstance.get(`/raw-material-supplier/by-status?${params.toString()}`);
    };

    public searchRawMaterialSuppliersByName = async (
        name: string,
        limit = 10,
        direction?: string,
        cursorPointer?: string,
        userRole?: string
    ): Promise<RawMaterialSuppliersResponse> => {
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

        return await this.axiosInstance.get(`/raw-material-supplier/search/by-name?${params.toString()}`);
    };

    public getRawMaterialSupplierById = async (id: string, userRole?: string): Promise<RawMaterialSupplierDto> => {
        const params = new URLSearchParams();

        if (userRole) {
            params.append('userRole', userRole);
        }

        const queryString = params.toString();
        const url = queryString ? `/raw-material-supplier/${id}?${queryString}` : `/raw-material-supplier/${id}`;

        return await this.axiosInstance.get(url);
    };

    public getRawMaterialSupplierByName = async (name: string, userRole?: string): Promise<RawMaterialSupplierDto> => {
        const params = new URLSearchParams();

        if (userRole) {
            params.append('userRole', userRole);
        }

        const queryString = params.toString();
        const url = queryString
            ? `/raw-material-supplier/by-name/${name}?${queryString}`
            : `/raw-material-supplier/by-name/${name}`;

        return await this.axiosInstance.get(url);
    };

    public createRawMaterialSupplier = async (
        dto: CreateRawMaterialSupplierDto,
        userRole?: string
    ): Promise<RawMaterialSupplierDto> => {
        const params = new URLSearchParams();

        if (userRole) {
            params.append('userRole', userRole);
        }

        const queryString = params.toString();
        const url = queryString ? `/raw-material-supplier?${queryString}` : '/raw-material-supplier';

        return await this.axiosInstance.post(url, dto);
    };

    public updateRawMaterialSupplier = async (
        id: string,
        dto: Partial<RawMaterialSupplierDto>,
        userRole?: string
    ): Promise<RawMaterialSupplierDto> => {
        const params = new URLSearchParams();

        if (userRole) {
            params.append('userRole', userRole);
        }

        const queryString = params.toString();
        const url = queryString ? `/raw-material-supplier/${id}?${queryString}` : `/raw-material-supplier/${id}`;

        return await this.axiosInstance.put(url, dto);
    };

    public deleteRawMaterialSupplier = async (dto: RawMaterialSupplierDto, userRole?: string): Promise<void> => {
        const params = new URLSearchParams();

        if (userRole) {
            params.append('userRole', userRole);
        }

        const queryString = params.toString();
        const url = queryString
            ? `/raw-material-supplier/${dto.rawMaterialSupplierId}?${queryString}`
            : `/raw-material-supplier/${dto.rawMaterialSupplierId}`;

        return await this.axiosInstance.delete(url, { data: dto });
    };

    public approveRawMaterialSupplier = async (id: string, userRole?: string): Promise<RawMaterialSupplierDto> => {
        const params = new URLSearchParams();

        if (userRole) {
            params.append('userRole', userRole);
        }

        const queryString = params.toString();
        const url = queryString
            ? `/raw-material-supplier/${id}/approve?${queryString}`
            : `/raw-material-supplier/${id}/approve`;

        return await this.axiosInstance.post(url);
    };

    public denyRawMaterialSupplier = async (
        id: string,
        approverMessage: string,
        userRole?: string
    ): Promise<RawMaterialSupplierDto> => {
        const params = new URLSearchParams();

        if (userRole) {
            params.append('userRole', userRole);
        }

        const queryString = params.toString();
        const url = queryString
            ? `/raw-material-supplier/${id}/deny?${queryString}`
            : `/raw-material-supplier/${id}/deny`;

        return await this.axiosInstance.post(url, { approverMessage });
    };
}

export default new RawMaterialSupplierApi();
