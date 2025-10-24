import { ErrorResponseDto, PageDto, ResponseDto, ReturnGoodSoldDto } from '@dto';
import { ReturnGoodSoldDatabaseServiceAbstractClass } from '@invoicing-database-service';
import { Inject, Logger } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetReturnGoodSoldByInvoiceIdQuery } from './get.return.good.sold.by.invoiceId.query';

// Constants
const HTTP_STATUS_OK = 200;

@QueryHandler(GetReturnGoodSoldByInvoiceIdQuery)
export class GetReturnGoodSoldByInvoiceIdHandler implements IQueryHandler<GetReturnGoodSoldByInvoiceIdQuery> {
    protected readonly logger = new Logger(GetReturnGoodSoldByInvoiceIdHandler.name);

    constructor(
        @Inject('ReturnGoodSoldDatabaseService')
        private readonly returnGoodSoldDatabaseService: ReturnGoodSoldDatabaseServiceAbstractClass
    ) {}

    async execute(
        query: GetReturnGoodSoldByInvoiceIdQuery
    ): Promise<ResponseDto<PageDto<ReturnGoodSoldDto> | ErrorResponseDto>> {
        this.logger.log(`Processing get by invoice id request for return good sold: ${query.invoiceId}`);

        try {
            const returnGoodSoldPage = await this.returnGoodSoldDatabaseService.findRecordsByInvoiceId(
                query.limit,
                query.invoiceId,
                query.direction,
                query.cursorPointer
            );

            this.logger.log(`Return Good Sold records retrieved successfully for invoice: ${query.invoiceId}`);
            return new ResponseDto<PageDto<ReturnGoodSoldDto>>(returnGoodSoldPage, HTTP_STATUS_OK);
        } catch (error) {
            return this.handleError(error, query.invoiceId);
        }
    }

    /**
     * Centralized error handling
     */
    private handleError(error: unknown, invoiceId: string): never {
        this.logger.error(`Error processing get by invoice id request for ${invoiceId}:`, error);

        // Handle unknown errors
        const errorMessage = this.extractErrorMessage(error);
        throw new Error(errorMessage);
    }

    /**
     * Extracts error message from various error types
     */
    private extractErrorMessage(error: unknown): string {
        if (error instanceof Error) {
            return error.message;
        }

        if (typeof error === 'object' && error !== null && 'response' in error) {
            const responseError = error as { response?: { body?: { errorMessage?: string } } };
            return responseError.response?.body?.errorMessage || 'Unknown error occurred';
        }

        return 'An unexpected error occurred';
    }
}
