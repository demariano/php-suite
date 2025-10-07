import { CreateCustomerClassificationDto, CustomerClassificationDto } from '../types/customer-classification.types';
import { AxiosConfig } from './axiosConfig';

export interface PaginatedResponse<T> {
    statusCode: number;
    data: T[];
    nextCursorPointer?: string;
    prevCursorPointer?: string;
}

export type CustomerClassificationsResponse = PaginatedResponse<CustomerClassificationDto>;

class CustomerClassificationApi extends AxiosConfig {
    constructor() {
        super('API_CUSTOMER_URL', true, false);
    }

    public getCustomerClassifications = async (
        limit = 10,
        status?: string,
        direction?: string,
        cursorPointer?: string,
        userRole?: string
    ): Promise<CustomerClassificationsResponse> => {
        const params = new URLSearchParams({
            limit: limit.toString(),
        });

        if (status) {
            params.append('status', status);
            return this.getCustomerClassificationsByStatus(limit, status, direction, cursorPointer, userRole);
        }

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

        return await this.axiosInstance.get(`/customer-classifications?${params.toString()}`);
    };

    public getCustomerClassificationsByStatus = async (
        limit = 10,
        status: string,
        direction?: string,
        cursorPointer?: string,
        userRole?: string,
        name?: string
    ): Promise<CustomerClassificationsResponse> => {
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

        // SECURITY: Only add userRole query parameter if BYPASS_AUTH is enabled
        // This prevents role parameter leakage when bypass auth is disabled
        if (userRole) {
            params.append('userRole', userRole);
        }

        if (name) {
            params.append('name', name);
        }

        return await this.axiosInstance.get(`/customer-classifications/status?${params.toString()}`);
    };

    public getCustomerClassificationById = async (
        id: string,
        userRole?: string
    ): Promise<CustomerClassificationDto> => {
        const params = new URLSearchParams();

        // SECURITY: Only add userRole query parameter if BYPASS_AUTH is enabled
        // This prevents role parameter leakage when bypass auth is disabled
        if (userRole) {
            params.append('userRole', userRole);
        }

        const queryString = params.toString();
        const url = queryString ? `/customer-classifications/${id}?${queryString}` : `/customer-classifications/${id}`;

        return await this.axiosInstance.get(url);
    };

    public getCustomerClassificationsByName = async (
        name: string,
        limit = 10,
        direction?: string,
        cursorPointer?: string,
        userRole?: string
    ): Promise<CustomerClassificationsResponse> => {
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

        return await this.axiosInstance.get(`/customer-classifications/name/${name}?${params.toString()}`);
    };

    public createCustomerClassification = async (
        classification: CreateCustomerClassificationDto,
        userRole?: string
    ): Promise<CustomerClassificationDto> => {
        const params = new URLSearchParams();

        // SECURITY: Only add userRole query parameter if BYPASS_AUTH is enabled
        // This prevents role parameter leakage when bypass auth is disabled
        if (userRole) {
            params.append('userRole', userRole);
        }

        const queryString = params.toString();
        const url = queryString ? `/customer-classifications?${queryString}` : '/customer-classifications';

        return await this.axiosInstance.post(url, classification);
    };

    public updateCustomerClassification = async (
        id: string,
        classification: Partial<CustomerClassificationDto>,
        userRole?: string
    ): Promise<CustomerClassificationDto> => {
        console.log('updateCustomerClassification', id, classification);

        const params = new URLSearchParams();

        // SECURITY: Only add userRole query parameter if BYPASS_AUTH is enabled
        // This prevents role parameter leakage when bypass auth is disabled
        if (userRole) {
            params.append('userRole', userRole);
        }

        const queryString = params.toString();
        const url = queryString ? `/customer-classifications/${id}?${queryString}` : `/customer-classifications/${id}`;

        return await this.axiosInstance.put(url, classification);
    };

    public deleteCustomerClassification = async (
        classification: CustomerClassificationDto,
        userRole?: string
    ): Promise<void> => {
        const params = new URLSearchParams();

        // SECURITY: Only add userRole query parameter if BYPASS_AUTH is enabled
        // This prevents role parameter leakage when bypass auth is disabled
        if (userRole) {
            params.append('userRole', userRole);
        }

        const queryString = params.toString();
        const url = queryString
            ? `/customer-classifications/${classification.customerClassificationId}?${queryString}`
            : `/customer-classifications/${classification.customerClassificationId}`;

        // Send the entire classification object in the request body
        return await this.axiosInstance.delete(url, { data: classification });
    };

    public approveCustomerClassification = async (
        id: string,
        userRole?: string
    ): Promise<CustomerClassificationDto> => {
        const params = new URLSearchParams();

        // SECURITY: Only add userRole query parameter if BYPASS_AUTH is enabled
        // This prevents role parameter leakage when bypass auth is disabled
        if (userRole) {
            params.append('userRole', userRole);
        }

        const queryString = params.toString();
        const url = queryString
            ? `/customer-classifications/${id}/approve?${queryString}`
            : `/customer-classifications/${id}/approve`;

        return await this.axiosInstance.post(url);
    };

    public denyCustomerClassification = async (id: string, userRole?: string): Promise<CustomerClassificationDto> => {
        const params = new URLSearchParams();

        // SECURITY: Only add userRole query parameter if BYPASS_AUTH is enabled
        // This prevents role parameter leakage when bypass auth is disabled
        if (userRole) {
            params.append('userRole', userRole);
        }

        const queryString = params.toString();
        const url = queryString
            ? `/customer-classifications/${id}/deny?${queryString}`
            : `/customer-classifications/${id}/deny`;

        return await this.axiosInstance.post(url);
    };
}

export default new CustomerClassificationApi();
