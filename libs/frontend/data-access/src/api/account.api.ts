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

    public getAccounts = async (
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

        if (userRole) {
            params.append('userRole', userRole);
        }

        return this.axiosInstance.get(`/accounts?${params.toString()}`);
    };

    public getAccountsByStatus = async (
        status: string,
        limit = 10,
        direction?: string,
        cursorPointer?: string,
        name?: string,
        userRole?: string
    ): Promise<AccountsResponse> => {
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

        return this.axiosInstance.get(`/accounts/status?${params.toString()}`);
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
            accountType,
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

        return this.axiosInstance.get(`/accounts/account-type?${params.toString()}`);
    };

    public getAccountsByName = async (
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

        if (userRole) {
            params.append('userRole', userRole);
        }

        return this.axiosInstance.get(`/accounts/name/${name}?${params.toString()}`);
    };

    public getAccountById = async (id: string, userRole?: string): Promise<AccountsDto> => {
        const params = new URLSearchParams();

        if (userRole) {
            params.append('userRole', userRole);
        }

        const queryString = params.toString();
        const url = queryString ? `/accounts/${id}?${queryString}` : `/accounts/${id}`;

        return this.axiosInstance.get(url);
    };

    public createAccount = async (account: CreateAccountsDto, userRole?: string): Promise<AccountsDto> => {
        const params = new URLSearchParams();

        if (userRole) {
            params.append('userRole', userRole);
        }

        const queryString = params.toString();
        const url = queryString ? `/accounts?${queryString}` : '/accounts';

        return this.axiosInstance.post(url, account);
    };

    public updateAccount = async (
        id: string,
        account: Partial<AccountsDto>,
        userRole?: string
    ): Promise<AccountsDto> => {
        const params = new URLSearchParams();

        if (userRole) {
            params.append('userRole', userRole);
        }

        const queryString = params.toString();
        const url = queryString ? `/accounts/${id}?${queryString}` : `/accounts/${id}`;

        return this.axiosInstance.put(url, account);
    };

    public deleteAccount = async (account: AccountsDto, userRole?: string): Promise<void> => {
        const params = new URLSearchParams();

        if (userRole) {
            params.append('userRole', userRole);
        }

        const queryString = params.toString();
        const url = queryString
            ? `/accounts/${account.accountingId}?${queryString}`
            : `/accounts/${account.accountingId}`;

        return this.axiosInstance.delete(url, { data: account });
    };

    public approveAccount = async (id: string, userRole?: string): Promise<AccountsDto> => {
        const params = new URLSearchParams();

        if (userRole) {
            params.append('userRole', userRole);
        }

        const queryString = params.toString();
        const url = queryString ? `/accounts/${id}/approve?${queryString}` : `/accounts/${id}/approve`;

        return this.axiosInstance.post(url);
    };

    public denyAccount = async (id: string, approverMessage: string, userRole?: string): Promise<AccountsDto> => {
        const params = new URLSearchParams();

        if (userRole) {
            params.append('userRole', userRole);
        }

        const queryString = params.toString();
        const url = queryString ? `/accounts/${id}/deny?${queryString}` : `/accounts/${id}/deny`;

        return this.axiosInstance.post(url, { approverMessage });
    };
}

export default new AccountsApi();
