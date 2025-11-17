import { CreateVoucherDto, VoucherDto } from '../types/voucher.types';
import { AxiosConfig } from './axiosConfig';

export interface PaginatedResponse<T> {
    statusCode: number;
    data: T[];
    nextCursorPointer?: string;
    prevCursorPointer?: string;
}

export type VouchersResponse = PaginatedResponse<VoucherDto>;

class VoucherApi extends AxiosConfig {
    constructor() {
        super('API_ACCOUNTING_URL', true, false);
    }

    public createVoucher = async (voucher: CreateVoucherDto, userRole?: string): Promise<VoucherDto> => {
        const params = new URLSearchParams();

        // SECURITY: Only add userRole query parameter if BYPASS_AUTH is enabled
        // This prevents role parameter leakage when bypass auth is disabled
        if (userRole) {
            params.append('userRole', userRole);
        }

        const queryString = params.toString();
        const url = queryString ? `/vouchers?${queryString}` : '/vouchers';

        return await this.axiosInstance.post(url, voucher);
    };

    public updateVoucher = async (id: string, voucher: Partial<VoucherDto>, userRole?: string): Promise<VoucherDto> => {
        const params = new URLSearchParams();

        // SECURITY: Only add userRole query parameter if BYPASS_AUTH is enabled
        // This prevents role parameter leakage when bypass auth is disabled
        if (userRole) {
            params.append('userRole', userRole);
        }

        const queryString = params.toString();
        const url = queryString ? `/vouchers/${id}?${queryString}` : `/vouchers/${id}`;

        return await this.axiosInstance.put(url, voucher);
    };

    public deleteVoucher = async (voucher: VoucherDto, userRole?: string): Promise<void> => {
        const params = new URLSearchParams();

        // SECURITY: Only add userRole query parameter if BYPASS_AUTH is enabled
        // This prevents role parameter leakage when bypass auth is disabled
        if (userRole) {
            params.append('userRole', userRole);
        }

        const queryString = params.toString();
        const url = queryString ? `/vouchers/${voucher.voucherId}?${queryString}` : `/vouchers/${voucher.voucherId}`;

        // Send the entire voucher object in the request body
        return await this.axiosInstance.delete(url, { data: voucher });
    };

    public approveVoucher = async (id: string, userRole?: string): Promise<VoucherDto> => {
        const params = new URLSearchParams();

        // SECURITY: Only add userRole query parameter if BYPASS_AUTH is enabled
        // This prevents role parameter leakage when bypass auth is disabled
        if (userRole) {
            params.append('userRole', userRole);
        }

        const queryString = params.toString();
        const url = queryString ? `/vouchers/${id}/approve?${queryString}` : `/vouchers/${id}/approve`;

        return await this.axiosInstance.post(url);
    };

    public denyVoucher = async (id: string, userRole?: string): Promise<VoucherDto> => {
        const params = new URLSearchParams();

        // SECURITY: Only add userRole query parameter if BYPASS_AUTH is enabled
        // This prevents role parameter leakage when bypass auth is disabled
        if (userRole) {
            params.append('userRole', userRole);
        }

        const queryString = params.toString();
        const url = queryString ? `/vouchers/${id}/deny?${queryString}` : `/vouchers/${id}/deny`;

        return await this.axiosInstance.post(url);
    };

    public getVoucherByVoucherNo = async (voucherNo: string, userRole?: string): Promise<VoucherDto> => {
        const params = new URLSearchParams();

        // SECURITY: Only add userRole query parameter if BYPASS_AUTH is enabled
        // This prevents role parameter leakage when bypass auth is disabled
        if (userRole) {
            params.append('userRole', userRole);
        }

        const queryString = params.toString();
        const url = queryString
            ? `/vouchers/voucher-no/${voucherNo}?${queryString}`
            : `/vouchers/voucher-no/${voucherNo}`;

        return await this.axiosInstance.get(url);
    };

    public getVouchersContainingVoucherNo = async (
        limit: number,
        voucherNo: string,
        direction?: string,
        cursorPointer?: string,
        userRole?: string
    ): Promise<VouchersResponse> => {
        const params = new URLSearchParams({
            limit: limit.toString(),
            voucherNo: voucherNo,
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

        return await this.axiosInstance.get(`/vouchers/containing-voucher-no?${params.toString()}`);
    };

    public getVouchersPagination = async (
        limit = 10,
        direction?: string,
        cursorPointer?: string,
        userRole?: string
    ): Promise<VouchersResponse> => {
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

        return await this.axiosInstance.get(`/vouchers?${params.toString()}`);
    };

    public getVouchersPaginationByStatus = async (
        status: string,
        limit = 10,
        direction?: string,
        cursorPointer?: string,
        voucherNo?: string,
        userRole?: string
    ): Promise<VouchersResponse> => {
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

        if (voucherNo) {
            params.append('voucherNo', voucherNo);
        }

        // SECURITY: Only add userRole query parameter if BYPASS_AUTH is enabled
        // This prevents role parameter leakage when bypass auth is disabled
        if (userRole) {
            params.append('userRole', userRole);
        }

        return await this.axiosInstance.get(`/vouchers/status?${params.toString()}`);
    };

    public getVouchersByVoucherDate = async (
        limit: number,
        startDate: string,
        endDate: string,
        direction?: string,
        cursorPointer?: string,
        userRole?: string
    ): Promise<VouchersResponse> => {
        const params = new URLSearchParams({
            limit: limit.toString(),
            startDate: startDate,
            endDate: endDate,
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

        return await this.axiosInstance.get(`/vouchers/voucher-date?${params.toString()}`);
    };

    public getVoucherById = async (id: string, userRole?: string): Promise<VoucherDto> => {
        const params = new URLSearchParams();

        // SECURITY: Only add userRole query parameter if BYPASS_AUTH is enabled
        // This prevents role parameter leakage when bypass auth is disabled
        if (userRole) {
            params.append('userRole', userRole);
        }

        const queryString = params.toString();
        const url = queryString ? `/vouchers/${id}?${queryString}` : `/vouchers/${id}`;

        return await this.axiosInstance.get(url);
    };
}

export default new VoucherApi();
