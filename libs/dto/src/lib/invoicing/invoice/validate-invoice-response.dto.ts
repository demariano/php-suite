export interface ContractAmountError {
    contractAmount: number;
    alreadyInvoiced: number;
    newAmount: number;
    remaining: number;
    message: string;
}

export interface StockValidationItem {
    stockId: string;
    stockName?: string;
    productName: string;
    requested: number;
    available: number;
}

export interface StockInsufficientError {
    invalidItems: StockValidationItem[];
}

export interface ValidationErrors {
    contractAmountExceeded?: ContractAmountError;
    stockInsufficient?: StockInsufficientError;
    missingFields?: string[];
    configurationError?: string;
    general?: string;
}

export interface ValidateInvoiceResponseDto {
    valid: boolean;
    errors?: ValidationErrors;
}
