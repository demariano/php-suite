import {
    CancelReceiptNumberRequestDto,
    CollectionReceiptRangeDto,
    CreateCollectionReceiptRangeDto,
} from '../types/collection-receipt-range.types';
import { AxiosConfig } from './axiosConfig';

export interface PaginatedResponse<T> {
    statusCode: number;
    data: T[];
    nextCursorPointer?: string;
    prevCursorPointer?: string;
}

export type CollectionReceiptRangesResponse = PaginatedResponse<CollectionReceiptRangeDto>;

class CollectionReceiptRangeApi extends AxiosConfig {
    constructor() {
        super('API_INVOICING_URL', true, false);
    }

    public getCollectionReceiptRanges = async (
        limit = 10,
        direction?: string,
        cursorPointer?: string,
        userRole?: string
    ): Promise<CollectionReceiptRangesResponse> => {
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

        return await this.axiosInstance.get(`/collection-receipt-range?${params.toString()}`);
    };

    public getCollectionReceiptRangeById = async (id: string): Promise<CollectionReceiptRangeDto> => {
        return await this.axiosInstance.get(`/collection-receipt-range/${id}`);
    };

    public getCollectionReceiptRangesByAreaId = async (
        areaId: string,
        limit = 10,
        direction?: string,
        cursorPointer?: string
    ): Promise<CollectionReceiptRangesResponse> => {
        const params = new URLSearchParams({
            limit: limit.toString(),
        });

        if (direction) {
            params.append('direction', direction);
        }

        if (cursorPointer) {
            params.append('cursorPointer', cursorPointer);
        }

        return await this.axiosInstance.get(`/collection-receipt-range/area/${areaId}?${params.toString()}`);
    };

    public getCollectionReceiptRangesByRangeStatus = async (
        rangeStatus: string,
        limit = 10,
        direction?: string,
        cursorPointer?: string
    ): Promise<CollectionReceiptRangesResponse> => {
        const params = new URLSearchParams({
            limit: limit.toString(),
        });

        if (direction) {
            params.append('direction', direction);
        }

        if (cursorPointer) {
            params.append('cursorPointer', cursorPointer);
        }

        return await this.axiosInstance.get(`/collection-receipt-range/status/${rangeStatus}?${params.toString()}`);
    };

    public createCollectionReceiptRange = async (
        range: CreateCollectionReceiptRangeDto,
        userRole?: string
    ): Promise<CollectionReceiptRangeDto> => {
        const params = new URLSearchParams();

        if (userRole) {
            params.append('userRole', userRole);
        }

        const queryString = params.toString();
        const url = queryString ? `/collection-receipt-range?${queryString}` : '/collection-receipt-range';

        return await this.axiosInstance.post(url, range);
    };

    public updateCollectionReceiptRange = async (
        id: string,
        range: Partial<CollectionReceiptRangeDto>,
        userRole?: string
    ): Promise<CollectionReceiptRangeDto> => {
        const params = new URLSearchParams();

        if (userRole) {
            params.append('userRole', userRole);
        }

        const queryString = params.toString();
        const url = queryString ? `/collection-receipt-range/${id}?${queryString}` : `/collection-receipt-range/${id}`;

        return await this.axiosInstance.put(url, range);
    };

    public deleteCollectionReceiptRange = async (
        id: string,
        range: CollectionReceiptRangeDto,
        userRole?: string
    ): Promise<void> => {
        const params = new URLSearchParams();

        if (userRole) {
            params.append('userRole', userRole);
        }

        const queryString = params.toString();
        const url = queryString ? `/collection-receipt-range/${id}?${queryString}` : `/collection-receipt-range/${id}`;

        return await this.axiosInstance.delete(url, { data: range });
    };

    public cancelReceiptNumber = async (
        request: CancelReceiptNumberRequestDto,
        userRole?: string
    ): Promise<{ message: string }> => {
        const params = new URLSearchParams();

        if (userRole) {
            params.append('userRole', userRole);
        }

        const queryString = params.toString();
        const url = queryString
            ? `/collection-receipt-range/cancel-receipt?${queryString}`
            : '/collection-receipt-range/cancel-receipt';

        const response = await this.axiosInstance.post(url, request);
        // Response is wrapped in ResponseDto, extract data
        return response.data?.data || response.data;
    };

    public getNextAvailableReceiptNumber = async (areaId: string): Promise<number> => {
        const response = await this.axiosInstance.get(`/collection-receipt-range/next-receipt/${areaId}`);

        // The Axios interceptor transforms ResponseDto {"statusCode":200,"body":{"receiptNumber":1007}}
        // When response.data.body is an object (not array), interceptor returns response.data.body directly
        // So response.data should be {receiptNumber: 1007} after interceptor
        // But we need to handle all possible response structures for robustness

        let receiptNumber: number | undefined;

        // The interceptor may return the object directly, so response itself might be the data
        // Or response.data might be the transformed data
        const responseData = response?.data ?? response;

        if (!responseData) {
            console.error('Response data is undefined:', { response, responseData });
            throw new Error('Invalid response: response data is undefined');
        }

        // Try direct access first (after interceptor transformation - should be {receiptNumber: 1007})
        if (typeof responseData === 'object' && 'receiptNumber' in responseData) {
            receiptNumber = responseData.receiptNumber;
        }

        // Fallback: try nested structures in case interceptor didn't transform it correctly
        if (typeof receiptNumber !== 'number') {
            // Try responseData.data.receiptNumber (if interceptor wrapped it)
            if (responseData.data && typeof responseData.data === 'object' && 'receiptNumber' in responseData.data) {
                receiptNumber = responseData.data.receiptNumber;
            }
            // Try responseData.body.receiptNumber (original ResponseDto structure)
            else if (
                responseData.body &&
                typeof responseData.body === 'object' &&
                'receiptNumber' in responseData.body
            ) {
                receiptNumber = responseData.body.receiptNumber;
            }
        }

        if (typeof receiptNumber === 'number') {
            return receiptNumber;
        }

        // Debug logging with full response details
        console.error('Unexpected response structure for getNextAvailableReceiptNumber:', {
            fullResponse: response,
            responseData: responseData,
            responseDataType: typeof responseData,
            responseDataKeys: responseData ? Object.keys(responseData) : [],
            responseDataStringified: JSON.stringify(responseData, null, 2),
            rawResponse: JSON.stringify(response, null, 2),
        });

        throw new Error(`Invalid response format: receipt number not found. Response: ${JSON.stringify(responseData)}`);
    };
}

export default new CollectionReceiptRangeApi();
