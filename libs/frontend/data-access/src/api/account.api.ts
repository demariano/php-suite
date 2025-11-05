import { AccountsDto, CreateAccountsDto } from '../types/account.types';
import { AxiosConfig } from './axiosConfig';

export interface PaginatedResponse<T> {
    statusCode: number;
    data: T[];
    nextCursorPointer?: string;
    prevCursorPointer?: string;
}

export type AccountsResponse = PaginatedResponse<AccountsDto>;

class AccountsApi extends AxiosConfig {
    constructor() {
        super('API_ACCOUNTING_URL', true, false);
    }

    public getAccountsPagination = async (
        limit = 10,
        direction?: string,
        cursorPointer?: string,
        userRole?: string
    ): Promise<AccountsResponse> => {
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

        return await this.axiosInstance.get(`/accounts?${params.toString()}`);
    };

    public getAccountsPaginationByStatus = async (
        status: string,
        limit = 10,
        direction?: string,
        cursorPointer?: string,
        name?: string,
        userRole?: string
    ): Promise<AccountsResponse> => {
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

        return await this.axiosInstance.get(`/accounts/status?${params.toString()}`);
    };

    public getAccountById = async (id: string, userRole?: string): Promise<AccountsDto> => {
        const params = new URLSearchParams();

        // SECURITY: Only add userRole query parameter if BYPASS_AUTH is enabled
        // This prevents role parameter leakage when bypass auth is disabled
        if (userRole) {
            params.append('userRole', userRole);
        }

        const queryString = params.toString();
        const url = queryString ? `/accounts/${id}?${queryString}` : `/accounts/${id}`;

        return await this.axiosInstance.get(url);
    };

    public getAccountByName = async (
        name: string,
        limit = 10,
        direction?: string,
        cursorPointer?: string,
        userRole?: string
    ): Promise<AccountsResponse> => {
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

        return await this.axiosInstance.get(`/accounts/name/${name}?${params.toString()}`);
    };

    public getAccountsByAccountType = async (
        accountType: string,
        limit = 10,
        direction?: string,
        cursorPointer?: string,
        userRole?: string
    ): Promise<AccountsResponse> => {
        const params = new URLSearchParams({
            limit: limit.toString(),
            accountType: accountType,
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

        return await this.axiosInstance.get(`/accounts/account-type?${params.toString()}`);
    };

    public createAccount = async (account: CreateAccountsDto, userRole?: string): Promise<AccountsDto> => {
        const params = new URLSearchParams();

        // SECURITY: Only add userRole query parameter if BYPASS_AUTH is enabled
        // This prevents role parameter leakage when bypass auth is disabled
        if (userRole) {
            params.append('userRole', userRole);
        }

        const queryString = params.toString();
        const url = queryString ? `/accounts?${queryString}` : '/accounts';

        return await this.axiosInstance.post(url, account);
    };

    public updateAccount = async (
        id: string,
        account: Partial<AccountsDto>,
        userRole?: string
    ): Promise<AccountsDto> => {
        const params = new URLSearchParams();

        // SECURITY: Only add userRole query parameter if BYPASS_AUTH is enabled
        // This prevents role parameter leakage when bypass auth is disabled
        if (userRole) {
            params.append('userRole', userRole);
        }

        const queryString = params.toString();
        const url = queryString ? `/accounts/${id}?${queryString}` : `/accounts/${id}`;

        return await this.axiosInstance.put(url, account);
    };

    public deleteAccount = async (id: string, account: AccountsDto, userRole?: string): Promise<void> => {
        const params = new URLSearchParams();

        // SECURITY: Only add userRole query parameter if BYPASS_AUTH is enabled
        // This prevents role parameter leakage when bypass auth is disabled
        if (userRole) {
            params.append('userRole', userRole);
        }

        const queryString = params.toString();
        const url = queryString ? `/accounts/${id}?${queryString}` : `/accounts/${id}`;

        // Send the entire account object in the request body
        return await this.axiosInstance.delete(url, { data: account });
    };

    public approveAccount = async (id: string, userRole?: string): Promise<AccountsDto> => {
        const params = new URLSearchParams();

        // SECURITY: Only add userRole query parameter if BYPASS_AUTH is enabled
        // This prevents role parameter leakage when bypass auth is disabled
        if (userRole) {
            params.append('userRole', userRole);
        }

        const queryString = params.toString();
        const url = queryString ? `/accounts/${id}/approve?${queryString}` : `/accounts/${id}/approve`;

        return await this.axiosInstance.post(url);
    };

    public denyAccount = async (id: string, userRole?: string): Promise<AccountsDto> => {
        const params = new URLSearchParams();

        // SECURITY: Only add userRole query parameter if BYPASS_AUTH is enabled
        // This prevents role parameter leakage when bypass auth is disabled
        if (userRole) {
            params.append('userRole', userRole);
        }

        const queryString = params.toString();
        const url = queryString ? `/accounts/${id}/deny?${queryString}` : `/accounts/${id}/deny`;

        return await this.axiosInstance.post(url);
    };
}

export default new AccountsApi();
