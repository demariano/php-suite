import { ContractDto, CreateContractDto } from '../types/contract.types';
import { AxiosConfig } from './axiosConfig';

export interface PaginatedResponse<T> {
    statusCode: number;
    data: T[];
    nextCursorPointer?: string;
    prevCursorPointer?: string;
}

export type ContractsResponse = PaginatedResponse<ContractDto>;

class ContractApi extends AxiosConfig {
    constructor() {
        super('API_INVOICING_URL', true, false);
    }

    public getContracts = async (
        limit = 10,
        direction?: string,
        cursorPointer?: string
    ): Promise<ContractsResponse> => {
        const params = new URLSearchParams({
            limit: limit.toString(),
        });

        if (direction) {
            params.append('direction', direction);
        }

        if (cursorPointer) {
            params.append('cursorPointer', cursorPointer);
        }

        return await this.axiosInstance.get(`/contracts?${params.toString()}`);
    };

    public getContractsByStatus = async (
        limit = 10,
        status: string,
        direction?: string,
        cursorPointer?: string,
        customerId?: string
    ): Promise<ContractsResponse> => {
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

        if (customerId) {
            params.append('customerId', customerId);
        }

        return await this.axiosInstance.get(`/contracts/status?${params.toString()}`);
    };

    public getContractById = async (id: string): Promise<ContractDto> => {
        return await this.axiosInstance.get(`/contracts/${id}`);
    };

    public getContractByContractNo = async (contractNo: string): Promise<ContractDto> => {
        return await this.axiosInstance.get(`/contracts/no/${contractNo}`);
    };

    public getContractsContainingContractNo = async (
        contractNo: string,
        limit = 10,
        direction?: string,
        cursorPointer?: string
    ): Promise<ContractsResponse> => {
        const params = new URLSearchParams({
            limit: limit.toString(),
        });

        if (direction) {
            params.append('direction', direction);
        }

        if (cursorPointer) {
            params.append('cursorPointer', cursorPointer);
        }

        return await this.axiosInstance.get(`/contracts/search/${contractNo}?${params.toString()}`);
    };

    public getContractsByCustomerId = async (
        customerId: string,
        limit = 10,
        direction?: string,
        cursorPointer?: string
    ): Promise<ContractsResponse> => {
        const params = new URLSearchParams({
            limit: limit.toString(),
        });

        if (direction) {
            params.append('direction', direction);
        }

        if (cursorPointer) {
            params.append('cursorPointer', cursorPointer);
        }

        return await this.axiosInstance.get(`/contracts/customer/${customerId}?${params.toString()}`);
    };

    public getPendingPaymentContracts = async (customerId: string): Promise<ContractDto[]> => {
        return await this.axiosInstance.get(`/contracts/customer/${customerId}/pending-payment`);
    };

    public createContract = async (contract: CreateContractDto, userRole?: string): Promise<ContractDto> => {
        const params = new URLSearchParams();

        if (userRole) {
            params.append('userRole', userRole);
        }

        const queryString = params.toString();
        const url = queryString ? `/contracts?${queryString}` : '/contracts';

        return await this.axiosInstance.post(url, contract);
    };

    public updateContract = async (
        id: string,
        contract: Partial<ContractDto>,
        userRole?: string
    ): Promise<ContractDto> => {
        const params = new URLSearchParams();

        if (userRole) {
            params.append('userRole', userRole);
        }

        const queryString = params.toString();
        const url = queryString ? `/contracts/${id}?${queryString}` : `/contracts/${id}`;

        return await this.axiosInstance.put(url, contract);
    };

    public deleteContract = async (contract: ContractDto, userRole?: string): Promise<void> => {
        const params = new URLSearchParams();

        if (userRole) {
            params.append('userRole', userRole);
        }

        const queryString = params.toString();
        const url = queryString
            ? `/contracts/${contract.contractId}?${queryString}`
            : `/contracts/${contract.contractId}`;

        return await this.axiosInstance.delete(url, { data: contract });
    };

    public approveContract = async (id: string, userRole?: string): Promise<ContractDto> => {
        const params = new URLSearchParams();

        if (userRole) {
            params.append('userRole', userRole);
        }

        const queryString = params.toString();
        const url = queryString ? `/contracts/${id}/approve?${queryString}` : `/contracts/${id}/approve`;

        return await this.axiosInstance.post(url);
    };

    public denyContract = async (id: string, approverMessage: string, userRole?: string): Promise<ContractDto> => {
        const params = new URLSearchParams();

        if (userRole) {
            params.append('userRole', userRole);
        }

        const queryString = params.toString();
        const url = queryString ? `/contracts/${id}/deny?${queryString}` : `/contracts/${id}/deny`;

        return await this.axiosInstance.post(url, { approverMessage });
    };
}

export default new ContractApi();
