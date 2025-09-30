import { TermsDatabaseServiceAbstract } from '@customer-database-service';
import { TermsDto, ResponseDto } from '@dto';
import { BadRequestException, Inject, Logger } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetTermsByNameQuery } from './get.terms.by.name.query';

// Constants
const HTTP_STATUS_OK = 200;
const MIN_NAME_LENGTH = 1;
const MAX_NAME_LENGTH = 255;

@QueryHandler(GetTermsByNameQuery)
export class GetTermsByNameHandler implements IQueryHandler<GetTermsByNameQuery> {
    private readonly logger = new Logger(GetTermsByNameHandler.name);

    constructor(
        @Inject('TermsDatabaseService')
        private readonly termsDatabaseService: TermsDatabaseServiceAbstract
    ) {}

    async execute(query: GetTermsByNameQuery): Promise<ResponseDto<TermsDto[]>> {
        this.logger.log(`Processing get terms by name request: ${query.name}`);

        try {
            // Validate name parameter
            this.validateNameParameter(query.name);

            // Fetch terms by name
            const terms = await this.fetchTermsByName(query.name);

            this.logger.log(`Terms retrieved successfully: ${terms.length} found`);
            return new ResponseDto<TermsDto[]>(terms, HTTP_STATUS_OK);
        } catch (error) {
            return this.handleError(error, query.name);
        }
    }

    /**
     * Validates the name parameter
     */
    private validateNameParameter(name: string): void {
        if (!name || typeof name !== 'string') {
            throw new BadRequestException('Name parameter is required and must be a string');
        }

        if (name.length < MIN_NAME_LENGTH || name.length > MAX_NAME_LENGTH) {
            throw new BadRequestException(`Name must be between ${MIN_NAME_LENGTH} and ${MAX_NAME_LENGTH} characters`);
        }
    }

    /**
     * Fetches terms by name
     */
    private async fetchTermsByName(name: string): Promise<TermsDto[]> {
        const terms = await this.termsDatabaseService.findRecordContainingName(name);
        return terms || [];
    }

    /**
     * Centralized error handling
     */
    private handleError(error: unknown, name: string): never {
        this.logger.error(`Error fetching terms by name ${name}:`, error);

        // Re-throw known exceptions
        if (error instanceof BadRequestException) {
            throw error;
        }

        // Handle unknown errors
        throw new BadRequestException('Failed to fetch terms by name');
    }
}
