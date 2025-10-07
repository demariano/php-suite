import { CreateCustomerTypeDto, CustomerTypeDto } from '../types/customer-type.types';
import { AxiosConfig } from './axiosConfig';

export interface PaginatedResponse<T> {
    statusCode: number;
    data: T[];
    nextCursorPointer?: string;
    prevCursorPointer?: string;
}

export type CustomerTypesResponse = PaginatedResponse<CustomerTypeDto>;

class CustomerTypeApi extends AxiosConfig {
    constructor() {
        super('API_CUSTOMER_URL', true, false);
    }

    public getCustomerTypes = async (
        limit = 10,
        status?: string,
        direction?: string,
        cursorPointer?: string,
        userRole?: string
    ): Promise<CustomerTypesResponse> => {
        const params = new URLSearchParams({
            limit: limit.toString(),
        });

        if (status) {
            params.append('status', status);
            return this.getCustomerTypesByStatus(limit, status, direction, cursorPointer, userRole);
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

        return await this.axiosInstance.get(`/customer-type?${params.toString()}`);
    };

    public getCustomerTypesByStatus = async (
        limit = 10,
        status: string,
        direction?: string,
        cursorPointer?: string,
        userRole?: string,
        name?: string
    ): Promise<CustomerTypesResponse> => {
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

        return await this.axiosInstance.get(`/customer-type/status?${params.toString()}`);
    };

    public getCustomerTypeById = async (id: string, userRole?: string): Promise<CustomerTypeDto> => {
        const params = new URLSearchParams();

        if (userRole) {
            params.append('userRole', userRole);
        }

        const queryString = params.toString();
        const url = queryString ? `/customer-type/${id}?${queryString}` : `/customer-type/${id}`;

        return await this.axiosInstance.get(url);
    };

    public getCustomerTypesByName = async (
        name: string,
        limit = 10,
        direction?: string,
        cursorPointer?: string,
        userRole?: string
    ): Promise<CustomerTypesResponse> => {
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

        return await this.axiosInstance.get(`/customer-type/name/${name}?${params.toString()}`);
    };

    public createCustomerType = async (
        customerType: CreateCustomerTypeDto,
        userRole?: string
    ): Promise<CustomerTypeDto> => {
        const params = new URLSearchParams();

        if (userRole) {
            params.append('userRole', userRole);
        }

        const queryString = params.toString();
        const url = queryString ? `/customer-type?${queryString}` : '/customer-type';

        return await this.axiosInstance.post(url, customerType);
    };

    public updateCustomerType = async (
        id: string,
        customerType: Partial<CustomerTypeDto>,
        userRole?: string
    ): Promise<CustomerTypeDto> => {
        const params = new URLSearchParams();

        if (userRole) {
            params.append('userRole', userRole);
        }

        const queryString = params.toString();
        const url = queryString ? `/customer-type/${id}?${queryString}` : `/customer-type/${id}`;

        return await this.axiosInstance.put(url, customerType);
    };

    public deleteCustomerType = async (customerType: CustomerTypeDto, userRole?: string): Promise<void> => {
        const params = new URLSearchParams();

        if (userRole) {
            params.append('userRole', userRole);
        }

        const queryString = params.toString();
        const url = queryString
            ? `/customer-type/${customerType.customerTypeId}?${queryString}`
            : `/customer-type/${customerType.customerTypeId}`;

        return await this.axiosInstance.delete(url, { data: customerType });
    };

    public approveCustomerType = async (id: string, userRole?: string): Promise<CustomerTypeDto> => {
        const params = new URLSearchParams();

        if (userRole) {
            params.append('userRole', userRole);
        }

        const queryString = params.toString();
        const url = queryString ? `/customer-type/${id}/approve?${queryString}` : `/customer-type/${id}/approve`;

        return await this.axiosInstance.post(url);
    };

    public denyCustomerType = async (id: string, userRole?: string): Promise<CustomerTypeDto> => {
        const params = new URLSearchParams();

        if (userRole) {
            params.append('userRole', userRole);
        }

        const queryString = params.toString();
        const url = queryString ? `/customer-type/${id}/deny?${queryString}` : `/customer-type/${id}/deny`;

        return await this.axiosInstance.post(url);
    };
}

export default new CustomerTypeApi();
