import { ContractExpirationDto, ContractExpirationItemDto, ErrorResponseDto, ResponseDto } from '@dto';
import { ContractDatabaseServiceAbstract } from '@invoicing-database-service';
import { Inject, Logger } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetContractExpirationQuery } from './get.contract.expiration.query';

const HTTP_STATUS_OK = 200;

@QueryHandler(GetContractExpirationQuery)
export class GetContractExpirationHandler implements IQueryHandler<GetContractExpirationQuery> {
    protected readonly logger = new Logger(GetContractExpirationHandler.name);

    constructor(
        @Inject('ContractDatabaseService')
        private readonly contractDatabaseService: ContractDatabaseServiceAbstract
    ) {}

    async execute(query: GetContractExpirationQuery): Promise<ResponseDto<ContractExpirationDto | ErrorResponseDto>> {
        this.logger.log(`Processing contract expiration request`);

        try {
            const activeContracts = await this.contractDatabaseService.getActiveContracts(
                query.startDate,
                query.endDate
            );
            const now = new Date();

            const expiringContracts: ContractExpirationItemDto[] = activeContracts
                .filter((contract) => {
                    if (!contract.endDate) return false;
                    const endDateStr = contract.endDate.substring(0, 10);
                    // Show contracts whose endDate falls within the selected date range
                    return endDateStr >= query.startDate && endDateStr <= query.endDate;
                })
                .map((contract) => {
                    const contractEndDate = contract.endDate as string;
                    const endDate = new Date(contractEndDate);
                    const timeDiff = endDate.getTime() - now.getTime();
                    const daysLeft = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));

                    let urgency: 'active' | '30days' | 'expiring_soon';
                    if (daysLeft <= 14) {
                        urgency = 'expiring_soon';
                    } else if (daysLeft <= 30) {
                        urgency = '30days';
                    } else {
                        urgency = 'active';
                    }

                    return {
                        contractId: contract.contractId,
                        contractName: contract.contractName || '',
                        contractNo: contract.contractNo || '',
                        customerName: contract.customerName || '',
                        endDate: contractEndDate,
                        daysLeft,
                        urgency,
                    };
                })
                .sort((a, b) => a.daysLeft - b.daysLeft);

            const result: ContractExpirationDto = {
                contracts: expiringContracts,
            };

            this.logger.log(`Contract expiration retrieved successfully: ${expiringContracts.length} contracts`);
            return new ResponseDto<ContractExpirationDto>(result, HTTP_STATUS_OK);
        } catch (error) {
            return this.handleError(error);
        }
    }

    private handleError(error: unknown): never {
        this.logger.error(`Error processing contract expiration request:`, error);
        const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
        throw new Error(errorMessage);
    }
}
