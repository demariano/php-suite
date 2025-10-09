import { CreateCustomerDto, CustomerDto } from '../types/customer.types';
import { AxiosConfig } from './axiosConfig';

export interface PaginatedResponse<T> {
    statusCode: number;
    data: T[];
    nextCursorPointer?: string;
    prevCursorPointer?: string;
}

export type CustomersResponse = PaginatedResponse<CustomerDto>;

class CustomerMainApi extends AxiosConfig {
    constructor() {
        super('API_CUSTOMER_URL', true, false);
    }

    public getCustomers = async (
        limit = 10,
        direction?: string,
        cursorPointer?: string,
        userRole?: string
    ): Promise<CustomersResponse> => {
        const params = new URLSearchParams({
            limit: limit.toString(),
        });

        if (direction) {
            params.append('direction', direction);
        }

        if (cursorPointer) {
            params.append('cursorPointer', cursorPointer);
        }

        // SECURITY: Only add userRole query parameter if BYPASS_AUTH is enabled
        // This prevents role parameter leakage when bypass auth is disabled
        if (userRole) {
            params.append('userRole', userRole);
        }

        return await this.axiosInstance.get(`/customers?${params.toString()}`);
    };

    public getCustomersByStatus = async (
        limit = 10,
        status: string,
        direction?: string,
        cursorPointer?: string,
        name?: string,
        userRole?: string
    ): Promise<CustomersResponse> => {
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

        if (name) {
            params.append('name', name);
        }

        // SECURITY: Only add userRole query parameter if BYPASS_AUTH is enabled
        // This prevents role parameter leakage when bypass auth is disabled
        if (userRole) {
            params.append('userRole', userRole);
        }

        return await this.axiosInstance.get(`/customers/status?${params.toString()}`);
    };

    public getCustomerById = async (id: string, userRole?: string): Promise<CustomerDto> => {
        const params = new URLSearchParams();

        // SECURITY: Only add userRole query parameter if BYPASS_AUTH is enabled
        // This prevents role parameter leakage when bypass auth is disabled
        if (userRole) {
            params.append('userRole', userRole);
        }

        const queryString = params.toString();
        const url = queryString ? `/customers/${id}?${queryString}` : `/customers/${id}`;

        return await this.axiosInstance.get(url);
    };

    public getCustomersByName = async (
        name: string,
        limit = 10,
        direction?: string,
        cursorPointer?: string,
        userRole?: string
    ): Promise<CustomersResponse> => {
        const params = new URLSearchParams({
            limit: limit.toString(),
        });

        if (direction) {
            params.append('direction', direction);
        }

        if (cursorPointer) {
            params.append('cursorPointer', cursorPointer);
        }

        // SECURITY: Only add userRole query parameter if BYPASS_AUTH is enabled
        // This prevents role parameter leakage when bypass auth is disabled
        if (userRole) {
            params.append('userRole', userRole);
        }

        return await this.axiosInstance.get(`/customers/name/${name}?${params.toString()}`);
    };

    public createCustomer = async (customer: CreateCustomerDto, userRole?: string): Promise<CustomerDto> => {
        const params = new URLSearchParams();

        // SECURITY: Only add userRole query parameter if BYPASS_AUTH is enabled
        // This prevents role parameter leakage when bypass auth is disabled
        if (userRole) {
            params.append('userRole', userRole);
        }

        const queryString = params.toString();
        const url = queryString ? `/customers?${queryString}` : '/customers';

        return await this.axiosInstance.post(url, customer);
    };

    public updateCustomer = async (
        id: string,
        customer: Partial<CustomerDto>,
        userRole?: string
    ): Promise<CustomerDto> => {
        const params = new URLSearchParams();

        // SECURITY: Only add userRole query parameter if BYPASS_AUTH is enabled
        // This prevents role parameter leakage when bypass auth is disabled
        if (userRole) {
            params.append('userRole', userRole);
        }

        console.log('customer', customer);

        const queryString = params.toString();
        const url = queryString ? `/customers/${id}?${queryString}` : `/customers/${id}`;

        return await this.axiosInstance.put(url, customer);
    };

    public deleteCustomer = async (customer: CustomerDto, userRole?: string): Promise<void> => {
        const params = new URLSearchParams();

        // SECURITY: Only add userRole query parameter if BYPASS_AUTH is enabled
        // This prevents role parameter leakage when bypass auth is disabled
        if (userRole) {
            params.append('userRole', userRole);
        }

        const queryString = params.toString();
        const url = queryString
            ? `/customers/${customer.customerId}?${queryString}`
            : `/customers/${customer.customerId}`;

        // Send the entire customer object in the request body
        return await this.axiosInstance.delete(url, { data: customer });
    };

    public approveCustomer = async (id: string, userRole?: string): Promise<CustomerDto> => {
        const params = new URLSearchParams();

        // SECURITY: Only add userRole query parameter if BYPASS_AUTH is enabled
        // This prevents role parameter leakage when bypass auth is disabled
        if (userRole) {
            params.append('userRole', userRole);
        }

        const queryString = params.toString();
        const url = queryString ? `/customers/${id}/approve?${queryString}` : `/customers/${id}/approve`;

        return await this.axiosInstance.post(url);
    };

    public denyCustomer = async (id: string, userRole?: string): Promise<CustomerDto> => {
        const params = new URLSearchParams();

        // SECURITY: Only add userRole query parameter if BYPASS_AUTH is enabled
        // This prevents role parameter leakage when bypass auth is disabled
        if (userRole) {
            params.append('userRole', userRole);
        }

        const queryString = params.toString();
        const url = queryString ? `/customers/${id}/deny?${queryString}` : `/customers/${id}/deny`;

        return await this.axiosInstance.post(url);
    };
}

export default new CustomerMainApi();
