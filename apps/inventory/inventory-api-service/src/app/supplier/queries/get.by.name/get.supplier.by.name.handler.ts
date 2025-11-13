import { PageDto, ResponseDto, SupplierDto } from '@dto';
import { SupplierDatabaseServiceAbstract } from '@inventory-database-service';
import { BadRequestException, Inject, Logger } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetSupplierByNameQuery } from './get.supplier.by.name.query';

// Constants
const HTTP_STATUS_OK = 200;
const MIN_NAME_LENGTH = 1;
const MAX_NAME_LENGTH = 255;

@QueryHandler(GetSupplierByNameQuery)
export class GetSupplierByNameHandler implements IQueryHandler<GetSupplierByNameQuery> {
    private readonly logger = new Logger(GetSupplierByNameHandler.name);

    constructor(
        @Inject('SupplierDatabaseService')
        private readonly supplierDatabaseService: SupplierDatabaseServiceAbstract
    ) {}

    async execute(query: GetSupplierByNameQuery): Promise<ResponseDto<PageDto<SupplierDto>>> {
        this.logger.log(`Processing get suppliers by name request: ${query.name}`);

        try {
            // Validate name parameter
            this.validateNameParameter(query.name);

            // Fetch suppliers by name
            const suppliers = await this.fetchSuppliersByName(
                query.name,
                query.limit,
                query.direction,
                query.cursorPointer
            );

            this.logger.log(`Suppliers retrieved successfully: ${suppliers.data.length} found`);
            return new ResponseDto<PageDto<SupplierDto>>(suppliers, HTTP_STATUS_OK);
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
     * Fetches suppliers by name
     */
    private async fetchSuppliersByName(
        name: string,
        limit: number,
        direction: string,
        cursorPointer: string
    ): Promise<PageDto<SupplierDto>> {
        const suppliers = await this.supplierDatabaseService.findRecordsByNamePagination(
            limit,
            direction,
            cursorPointer,
            name
        );

        if (!suppliers || suppliers.data.length === 0) {
            return new PageDto<SupplierDto>([], null, null);
        }

        return suppliers;
    }

    /**
     * Centralized error handling
     */
    private handleError(error: unknown, name: string): never {
        this.logger.error(`Error fetching suppliers by name ${name}:`, error);

        // Re-throw known exceptions
        if (error instanceof BadRequestException) {
            throw error;
        }

        // Handle unknown errors
        throw new BadRequestException('Failed to fetch suppliers by name');
    }
}
