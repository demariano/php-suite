import { ContractDto, ErrorResponseDto, ResponseDto } from '@dto';
import { ContractDatabaseServiceAbstract } from '@invoicing-database-service';
import { MessageQueueServiceAbstract } from '@message-queue-lib';
import { BadRequestException, Inject, Logger, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { RebateComputeContractCommand } from './rebate.compute.command';

// Constants
const HTTP_STATUS_OK = 200;

@CommandHandler(RebateComputeContractCommand)
export class RebateComputeContractHandler implements ICommandHandler<RebateComputeContractCommand> {
    protected readonly logger = new Logger(RebateComputeContractHandler.name);

    constructor(
        @Inject('ContractDatabaseService')
        private readonly contractDatabaseService: ContractDatabaseServiceAbstract,
        @Inject('MessageQueueAwsLibService')
        private readonly messageQueueService: MessageQueueServiceAbstract
    ) {}

    async execute(command: RebateComputeContractCommand): Promise<ResponseDto<ContractDto | ErrorResponseDto>> {
        this.logger.log(`Processing rebate compute request for contract: ${command.contractId}`);

        try {
            // Validate contract exists
            const contract = await this.validateContractExists(command.contractId);

            // TODO: Send SQS message to trigger rebate computation
            // Example implementation:
            // const rebateComputeMessage = {
            //     contractId: contract.contractId,
            //     contractNo: contract.contractNo,
            //     rebateType: contract.rebateType,
            //     rebatePercentage: contract.rebatePercentage,
            //     contractAmount: contract.contractAmount,
            //     invoicedAmount: contract.invoicedAmount,
            //     action: 'COMPUTE_REBATE',
            // };
            // const queueUrl = this.configService.get<string>('REBATE_COMPUTE_QUEUE_URL');
            // if (queueUrl) {
            //     await this.messageQueueService.sendMessageToSQS(
            //         queueUrl,
            //         JSON.stringify(rebateComputeMessage)
            //     );
            //     this.logger.log(`Rebate compute message sent to SQS for contract: ${contract.contractId}`);
            // } else {
            //     this.logger.warn('REBATE_COMPUTE_QUEUE_URL not configured, skipping SQS message');
            // }

            this.logger.log(`Rebate compute request processed successfully for contract: ${contract.contractId}`);
            return new ResponseDto<ContractDto>(contract, HTTP_STATUS_OK);
        } catch (error) {
            return this.handleError(error, command.contractId);
        }
    }

    /**
     * Validates that the contract record exists
     */
    private async validateContractExists(contractId: string): Promise<ContractDto> {
        const contract = await this.contractDatabaseService.findRecordById(contractId);

        if (!contract) {
            this.logger.warn(`Contract not found: ${contractId}`);
            throw new NotFoundException(`Contract record not found for id ${contractId}`);
        }

        return contract;
    }

    /**
     * Centralized error handling
     */
    private handleError(error: unknown, contractId: string): never {
        this.logger.error(`Error processing rebate compute request for ${contractId}:`, error);

        // Re-throw known exceptions
        if (error instanceof NotFoundException) {
            throw error;
        }

        // Handle unknown errors
        const errorMessage = this.extractErrorMessage(error);
        throw new BadRequestException(errorMessage);
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


