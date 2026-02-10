import { ContractPaymentDto, ContractPaymentEventEnum, PaymentStatusEnum } from '@dto';
import { ContractDatabaseServiceAbstract } from '@invoicing-database-service';
import { Inject, Injectable, Logger } from '@nestjs/common';

@Injectable()
export class ContractPaymentHandlerService {
    private readonly logger = new Logger(ContractPaymentHandlerService.name);

    constructor(
        @Inject('ContractDatabaseService')
        private readonly contractDatabaseService: ContractDatabaseServiceAbstract
    ) {}

    async handle(contractPaymentDto: ContractPaymentDto, eventType: ContractPaymentEventEnum): Promise<void> {
        try {
            this.logger.log(
                `Processing ${eventType} for contract: ${contractPaymentDto.contractId}, paymentId: ${contractPaymentDto.paymentId}`
            );

            // Fetch the existing contract record
            const contract = await this.contractDatabaseService.findRecordById(contractPaymentDto.contractId);

            if (!contract) {
                this.logger.error(`Contract not found for ID: ${contractPaymentDto.contractId}`);
                return;
            }

            // Route to appropriate operation based on event type
            switch (eventType) {
                case ContractPaymentEventEnum.PAYMENT_ADDED:
                    await this.addPayment(contractPaymentDto.contractId, contractPaymentDto);
                    break;

                case ContractPaymentEventEnum.PAYMENT_DELETED:
                    await this.deletePayment(contractPaymentDto.contractId, contractPaymentDto.paymentId);
                    break;

                case ContractPaymentEventEnum.PAYMENT_UPDATED:
                    // Simple approach: delete old payment and add new one
                    await this.deletePayment(contractPaymentDto.contractId, contractPaymentDto.paymentId);
                    await this.addPayment(contractPaymentDto.contractId, contractPaymentDto);
                    break;

                default:
                    this.logger.error(`Unknown event type: ${eventType}`);
                    return;
            }

            // Refetch contract to ensure we have the updated payments array
            const updatedContract = await this.contractDatabaseService.findRecordById(contractPaymentDto.contractId);
            if (!updatedContract) {
                this.logger.error(`Contract not found after update: ${contractPaymentDto.contractId}`);
                return;
            }

            // Recalculate totalAmountPaid and payment status based on updated payments array
            await this.recalculateTotalAmountPaid(updatedContract);

            this.logger.log(`Successfully processed ${eventType} for contract: ${contractPaymentDto.contractId}`);
        } catch (error) {
            this.logger.error(`Error processing contract payment: ${error.message}`, error.stack);
            throw error;
        }
    }

    private async addPayment(contractId: string, paymentDto: ContractPaymentDto): Promise<void> {
        this.logger.log(`Adding payment ${paymentDto.paymentId} to contract ${contractId}`);
        await this.contractDatabaseService.addPaymentToContract(contractId, paymentDto);
    }

    private async deletePayment(contractId: string, paymentId: string): Promise<void> {
        this.logger.log(`Deleting payment ${paymentId} from contract ${contractId}`);
        await this.contractDatabaseService.removePaymentFromContract(contractId, paymentId);
    }

    private async recalculateTotalAmountPaid(contract: any): Promise<void> {
        this.logger.log(`Recalculating totalAmountPaid for contract ${contract.contractId}`);

        // Calculate total amount paid from all payments in the array
        const totalAmountPaid = (contract.payments || []).reduce(
            (sum: number, payment: any) => sum + (payment.paymentAmount || 0),
            0
        );

        // Update the totalAmountPaid field
        contract.totalAmountPaid = totalAmountPaid;

        // Determine payment status based on contractAmount vs totalAmountPaid
        const contractAmount = contract.contractAmount || 0;
        if (totalAmountPaid === 0) {
            contract.paymentStatus = PaymentStatusEnum.PENDING;
        } else if (totalAmountPaid >= contractAmount) {
            contract.paymentStatus = PaymentStatusEnum.PAID;
        } else {
            contract.paymentStatus = PaymentStatusEnum.PARTIAL;
        }

        // Save updated contract
        await this.contractDatabaseService.updateRecord(contract);

        this.logger.log(
            `Updated contract ${contract.contractId}: totalAmountPaid=${totalAmountPaid}, paymentStatus=${contract.paymentStatus}`
        );
    }
}
