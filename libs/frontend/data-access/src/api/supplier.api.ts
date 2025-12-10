import { CreateSupplierDto, SupplierDto, SupplierFilterDto } from '../types/supplier.types';
import { AxiosConfig } from './axiosConfig';

export interface PaginatedResponse<T> {
    statusCode: number;
    data: T[];
    nextCursorPointer?: string;
    prevCursorPointer?: string;
}

export type SuppliersResponse = PaginatedResponse<SupplierDto>;

class SupplierApi extends AxiosConfig {
    constructor() {
        super('API_INVENTORY_URL', true, false);
    }

    public getSuppliers = async (
        limit = 10,
        status?: string,
        direction?: string,
        cursorPointer?: string,
        userRole?: string
    ): Promise<SuppliersResponse> => {
        const params = new URLSearchParams({
            limit: limit.toString(),
        });

        if (status) {
            params.append('status', status);
            return this.getSuppliersByStatus(limit, status, direction, cursorPointer, userRole);
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

        return await this.axiosInstance.get(`/supplier?${params.toString()}`);
    };

    public getSuppliersByStatus = async (
        limit = 10,
        status: string,
        direction?: string,
        cursorPointer?: string,
        userRole?: string,
        name?: string
    ): Promise<SuppliersResponse> => {
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

        return await this.axiosInstance.get(`/supplier/status?${params.toString()}`);
    };

    public getSupplierById = async (id: string, userRole?: string): Promise<SupplierDto> => {
        const params = new URLSearchParams();

        if (userRole) {
            params.append('userRole', userRole);
        }

        const queryString = params.toString();
        const url = queryString ? `/supplier/${id}?${queryString}` : `/supplier/${id}`;

        return await this.axiosInstance.get(url);
    };

    public getSuppliersByName = async (
        name: string,
        limit = 10,
        direction?: string,
        cursorPointer?: string,
        userRole?: string
    ): Promise<SuppliersResponse> => {
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

        return await this.axiosInstance.get(`/supplier/name/${name}?${params.toString()}`);
    };

    public getSuppliersByFilterPagination = async (
        filter: SupplierFilterDto,
        limit = 10,
        direction?: string,
        cursorPointer?: string,
        userRole?: string
    ): Promise<SuppliersResponse> => {
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

        if (filter.status) {
            params.append('status', filter.status);
        }

        if (filter.supplierName) {
            params.append('supplierName', filter.supplierName);
        }

        if (filter.supplierAddress) {
            params.append('supplierAddress', filter.supplierAddress);
        }

        if (filter.supplierPhone) {
            params.append('supplierPhone', filter.supplierPhone);
        }

        if (filter.supplierEmail) {
            params.append('supplierEmail', filter.supplierEmail);
        }

        if (filter.supplierContactPerson) {
            params.append('supplierContactPerson', filter.supplierContactPerson);
        }

        if (filter.reverse !== undefined) {
            params.append('reverse', filter.reverse.toString());
        }

        return await this.axiosInstance.get(`/supplier/filter?${params.toString()}`);
    };

    public createSupplier = async (supplier: CreateSupplierDto, userRole?: string): Promise<SupplierDto> => {
        const params = new URLSearchParams();

        if (userRole) {
            params.append('userRole', userRole);
        }

        const queryString = params.toString();
        const url = queryString ? `/supplier?${queryString}` : '/supplier';

        return await this.axiosInstance.post(url, supplier);
    };

    public updateSupplier = async (
        id: string,
        supplier: Partial<SupplierDto>,
        userRole?: string
    ): Promise<SupplierDto> => {
        const params = new URLSearchParams();

        if (userRole) {
            params.append('userRole', userRole);
        }

        const queryString = params.toString();
        const url = queryString ? `/supplier/${id}?${queryString}` : `/supplier/${id}`;

        return await this.axiosInstance.put(url, supplier);
    };

    public deleteSupplier = async (supplier: SupplierDto, userRole?: string): Promise<void> => {
        const params = new URLSearchParams();

        if (userRole) {
            params.append('userRole', userRole);
        }

        const queryString = params.toString();
        const url = queryString
            ? `/supplier/${supplier.supplierId}?${queryString}`
            : `/supplier/${supplier.supplierId}`;

        return await this.axiosInstance.delete(url, { data: supplier });
    };

    public approveSupplier = async (id: string, userRole?: string): Promise<SupplierDto> => {
        const params = new URLSearchParams();

        if (userRole) {
            params.append('userRole', userRole);
        }

        const queryString = params.toString();
        const url = queryString ? `/supplier/${id}/approve?${queryString}` : `/supplier/${id}/approve`;

        return await this.axiosInstance.post(url);
    };

    public denySupplier = async (id: string, approverMessage: string, userRole?: string): Promise<SupplierDto> => {
        const params = new URLSearchParams();

        if (userRole) {
            params.append('userRole', userRole);
        }

        const queryString = params.toString();
        const url = queryString ? `/supplier/${id}/deny?${queryString}` : `/supplier/${id}/deny`;

        return await this.axiosInstance.post(url, { approverMessage });
    };
}

export default new SupplierApi();
