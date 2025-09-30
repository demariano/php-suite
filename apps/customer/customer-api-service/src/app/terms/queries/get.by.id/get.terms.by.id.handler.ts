import { TermsDatabaseServiceAbstract } from '@customer-database-service';
import { TermsDto, ResponseDto } from '@dto';
import { Inject, Logger, NotFoundException } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetTermsByIdQuery } from './get.terms.by.id.query';

// Constants
const HTTP_STATUS_OK = 200;

@QueryHandler(GetTermsByIdQuery)
export class GetTermsByIdHandler implements IQueryHandler<GetTermsByIdQuery> {
    private readonly logger = new Logger(GetTermsByIdHandler.name);

    constructor(
        @Inject('TermsDatabaseService')
        private readonly termsDatabaseService: TermsDatabaseServiceAbstract
    ) {}

    async execute(query: GetTermsByIdQuery): Promise<ResponseDto<TermsDto>> {
        this.logger.log(`Processing get terms request for ID: ${query.recordId}`);

        try {
            // Fetch and validate terms record
            const termsRecord = await this.fetchTermsById(query.recordId);

            this.logger.log(`Terms retrieved successfully: ${query.recordId}`);
            return new ResponseDto<TermsDto>(termsRecord, HTTP_STATUS_OK);
        } catch (error) {
            return this.handleError(error, query.recordId);
        }
    }

    /**
     * Fetches and validates a terms record by ID
     */
    private async fetchTermsById(recordId: string): Promise<TermsDto> {
        const termsRecord = await this.termsDatabaseService.findRecordById(recordId);

        if (!termsRecord) {
            this.logger.warn(`Terms not found for ID: ${recordId}`);
            throw new NotFoundException(`Terms not found for ID: ${recordId}`);
        }

        return termsRecord;
    }

    /**
     * Centralized error handling
     */
    private handleError(error: unknown, recordId: string): never {
        this.logger.error(`Error fetching terms by ID ${recordId}:`, error);

        // Re-throw known exceptions
        if (error instanceof NotFoundException) {
            throw error;
        }

        // Handle unknown errors by throwing NotFoundException
        throw new NotFoundException(`Terms not found for ID: ${recordId}`);
    }
}
