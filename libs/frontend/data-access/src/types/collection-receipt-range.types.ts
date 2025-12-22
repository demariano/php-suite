// Frontend-specific types for Collection Receipt Range
// These mirror the backend DTOs but without NestJS decorators

export enum RangeStatusEnum {
    AVAILABLE = 'AVAILABLE',
    ALL_USED_UP = 'ALL_USED_UP',
    CANCELLED = 'CANCELLED',
}

export interface CancelledReceiptNumberDto {
    receiptNumber: number;
    cancellationReason: string;
    cancelledBy: string;
    cancelledAt: string;
    paymentId?: string;
}

export interface CollectionReceiptRangeDto {
    collectionReceiptRangeId: string;
    areaId: string;
    areaName: string;
    startNumber: number;
    endNumber: number;
    lastUsedNumber?: number;
    rangeStatus?: RangeStatusEnum;
    cancelledReceiptNumbers?: CancelledReceiptNumberDto[];
    activityLogs?: string[];
}

export interface CreateCollectionReceiptRangeDto {
    areaId: string;
    areaName: string;
    startNumber: number;
    endNumber: number;
    lastUsedNumber?: number;
    rangeStatus?: RangeStatusEnum;
    cancelledReceiptNumbers?: CancelledReceiptNumberDto[];
    activityLogs?: string[];
}

export interface CancelReceiptNumberRequestDto {
    collectionReceiptRangeId: string;
    receiptNumber: number;
    cancellationReason: string;
}

