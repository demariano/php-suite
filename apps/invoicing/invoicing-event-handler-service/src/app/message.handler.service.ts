import {
    AreaEventDto,
    AreaEventEnum,
    ContractEventDto,
    ContractEventEnum,
    ContractInvoiceEventEnum,
    ContractPaymentDto,
    ContractPaymentEventEnum,
    CustomerEventDto,
    CustomerEventEnum,
    InvoiceAmountChangedDto,
    InvoicePaymentDto,
    InvoicePaymentEventEnum,
    ProductPriceTypeEventDto,
    ProductPriceTypeEventEnum,
    SalesTypeEventDto,
    SalesTypeEventEnum,
    TermsEventDto,
    TermsEventEnum,
    TerritoryManagerEventDto,
    TerritoryManagerEventEnum,
} from '@dto';
import { Injectable, Logger } from '@nestjs/common';
import { AreaSyncHandlerService } from './area-sync-handler/area-sync.handler.service';
import { ContractInvoiceHandlerService } from './contract-invoice-handler/contract.invoice.handler.service';
import { ContractPaymentHandlerService } from './contract-payment-handler/contract.payment.handler.service';
import { ContractSyncHandlerService } from './contract-sync-handler/contract-sync.handler.service';
import { CustomerSyncHandlerService } from './customer-sync-handler/customer-sync.handler.service';
import { InvoicePaymentHandlerService } from './invoice-payment-handler/invoice.payment.handler.service';
import { ProductPriceTypeSyncHandlerService } from './product-price-type-sync-handler/product-price-type-sync.handler.service';
import { SalesTypeSyncHandlerService } from './sales-type-sync-handler/sales-type-sync.handler.service';
import { TermsSyncHandlerService } from './terms-sync-handler/terms-sync.handler.service';
import { TerritoryManagerSyncHandlerService } from './territory-manager-sync-handler/territory-manager-sync.handler.service';

@Injectable()
export class MessageHandlerService {
    private readonly logger = new Logger(MessageHandlerService.name);

    constructor(
        private readonly contractInvoiceHandlerService: ContractInvoiceHandlerService,
        private readonly contractPaymentHandlerService: ContractPaymentHandlerService,
        private readonly invoicePaymentHandlerService: InvoicePaymentHandlerService,
        private readonly customerSyncHandlerService: CustomerSyncHandlerService,
        private readonly areaSyncHandlerService: AreaSyncHandlerService,
        private readonly territoryManagerSyncHandlerService: TerritoryManagerSyncHandlerService,
        private readonly salesTypeSyncHandlerService: SalesTypeSyncHandlerService,
        private readonly contractSyncHandlerService: ContractSyncHandlerService,
        private readonly termsSyncHandlerService: TermsSyncHandlerService,
        private readonly productPriceTypeSyncHandlerService: ProductPriceTypeSyncHandlerService
    ) {}

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async handleMessage(message: any) {
        const messageBody = JSON.parse(message);

        // Check if this is a contract event
        if (messageBody.eventType && Object.values(ContractEventEnum).includes(messageBody.eventType)) {
            const contractEvent = messageBody as ContractEventDto;
            this.logger.log(
                `Handling contract event: ${contractEvent.eventType} for contractId: ${contractEvent.contractId}`
            );

            await this.contractSyncHandlerService.handleContractUpdatedEvent({
                contractId: contractEvent.contractId,
                newContractName: contractEvent.newContractName,
            });
            return;
        }

        // Check if this is a terms event
        if (messageBody.eventType && Object.values(TermsEventEnum).includes(messageBody.eventType)) {
            const termsEvent = messageBody as TermsEventDto;
            this.logger.log(`Handling terms event: ${termsEvent.eventType} for termsId: ${termsEvent.termsId}`);

            await this.termsSyncHandlerService.handleTermsUpdatedEvent({
                termsId: termsEvent.termsId,
                newTermsName: termsEvent.newTermsName,
            });
            return;
        }

        // Check if this is a product price type event
        if (messageBody.eventType && Object.values(ProductPriceTypeEventEnum).includes(messageBody.eventType)) {
            const productPriceTypeEvent = messageBody as ProductPriceTypeEventDto;
            this.logger.log(
                `Handling product price type event: ${productPriceTypeEvent.eventType} for productPriceTypeId: ${productPriceTypeEvent.productPriceTypeId}`
            );

            await this.productPriceTypeSyncHandlerService.handleProductPriceTypeUpdatedEvent(productPriceTypeEvent);
            return;
        }

        // Check if this is a sales type event
        if (messageBody.eventType && Object.values(SalesTypeEventEnum).includes(messageBody.eventType)) {
            const salesTypeEvent = messageBody as SalesTypeEventDto;
            this.logger.log(
                `Handling sales type event: ${salesTypeEvent.eventType} for salesTypeId: ${salesTypeEvent.salesTypeId}`
            );

            await this.salesTypeSyncHandlerService.handleSalesTypeUpdatedEvent({
                salesTypeId: salesTypeEvent.salesTypeId,
                newSalesTypeName: salesTypeEvent.newSalesTypeName,
            });
            return;
        }

        // Check if this is a territory manager event
        if (messageBody.eventType && Object.values(TerritoryManagerEventEnum).includes(messageBody.eventType)) {
            const territoryManagerEvent = messageBody as TerritoryManagerEventDto;
            this.logger.log(
                `Handling territory manager event: ${territoryManagerEvent.eventType} for territoryManagerId: ${territoryManagerEvent.territoryManagerId}`
            );

            if (territoryManagerEvent.eventType === TerritoryManagerEventEnum.TERRITORY_MANAGER_UPDATED) {
                await this.territoryManagerSyncHandlerService.handleTerritoryManagerUpdatedEvent({
                    territoryManagerId: territoryManagerEvent.territoryManagerId,
                    newTerritoryManagerName: territoryManagerEvent.newTerritoryManagerName,
                });
            } else if (territoryManagerEvent.eventType === TerritoryManagerEventEnum.TERRITORY_MANAGER_REACTIVATED) {
                this.logger.log(
                    `Territory manager reactivated - no invoice updates needed for territoryManagerId: ${territoryManagerEvent.territoryManagerId}`
                );
                // No action required - invoices don't directly reference territory manager
            }
            return;
        }

        // Check if this is an area event
        if (messageBody.eventType && Object.values(AreaEventEnum).includes(messageBody.eventType)) {
            const areaEvent = messageBody as AreaEventDto;
            this.logger.log(`Handling area event: ${areaEvent.eventType} for areaId: ${areaEvent.areaId}`);

            await this.areaSyncHandlerService.handleAreaUpdatedEvent({
                areaId: areaEvent.areaId,
                newAreaName: areaEvent.newAreaName,
            });
            return;
        }

        // Check if this is a customer event
        if (messageBody.eventType && Object.values(CustomerEventEnum).includes(messageBody.eventType)) {
            const customerEvent = messageBody as CustomerEventDto;
            this.logger.log(
                `Handling customer event: ${customerEvent.eventType} for customerId: ${customerEvent.customerId}`
            );

            await this.customerSyncHandlerService.handleCustomerUpdatedEvent({
                customerId: customerEvent.customerId,
                newCustomerName: customerEvent.newCustomerName,
            });
            return;
        }

        // Check if this is a contract invoice event
        if (messageBody.event && Object.values(ContractInvoiceEventEnum).includes(messageBody.event)) {
            await this.contractInvoiceHandlerService.handleContractInvoiceEvent(
                messageBody.event as ContractInvoiceEventEnum,
                messageBody.data as string
            );
            return;
        }

        // Check if this is a contract payment event
        if (messageBody.eventType && Object.values(ContractPaymentEventEnum).includes(messageBody.eventType)) {
            const contractPaymentEvent = messageBody as {
                eventType: ContractPaymentEventEnum;
                paymentData: ContractPaymentDto;
            };

            switch (contractPaymentEvent.eventType) {
                case ContractPaymentEventEnum.PAYMENT_ADDED:
                    this.logger.log(
                        `Handling contract payment added for Contract ID: ${contractPaymentEvent.paymentData.contractId}, Payment ID: ${contractPaymentEvent.paymentData.paymentId}`
                    );
                    await this.contractPaymentHandlerService.handle(
                        contractPaymentEvent.paymentData,
                        ContractPaymentEventEnum.PAYMENT_ADDED
                    );
                    break;

                case ContractPaymentEventEnum.PAYMENT_DELETED:
                    this.logger.log(
                        `Handling contract payment deleted for Contract ID: ${contractPaymentEvent.paymentData.contractId}, Payment ID: ${contractPaymentEvent.paymentData.paymentId}`
                    );
                    await this.contractPaymentHandlerService.handle(
                        contractPaymentEvent.paymentData,
                        ContractPaymentEventEnum.PAYMENT_DELETED
                    );
                    break;

                case ContractPaymentEventEnum.PAYMENT_UPDATED:
                    this.logger.log(
                        `Handling contract payment updated for Contract ID: ${contractPaymentEvent.paymentData.contractId}, Payment ID: ${contractPaymentEvent.paymentData.paymentId}`
                    );
                    await this.contractPaymentHandlerService.handle(
                        contractPaymentEvent.paymentData,
                        ContractPaymentEventEnum.PAYMENT_UPDATED
                    );
                    break;

                default:
                    this.logger.warn(`Unhandled contract payment event type: ${contractPaymentEvent.eventType}`);
            }
            return;
        }

        // Handle invoice payment events
        const invoicePaymentEvent = messageBody as {
            eventType: InvoicePaymentEventEnum;
            paymentData: InvoicePaymentDto;
        };

        switch (invoicePaymentEvent.eventType) {
            case InvoicePaymentEventEnum.PAYMENT_ADDED:
                this.logger.log(
                    `Handling payment added for Invoice ID: ${invoicePaymentEvent.paymentData.invoiceId}, Payment ID: ${invoicePaymentEvent.paymentData.paymentId}`
                );
                await this.invoicePaymentHandlerService.handle(
                    invoicePaymentEvent.paymentData,
                    InvoicePaymentEventEnum.PAYMENT_ADDED
                );
                break;

            case InvoicePaymentEventEnum.PAYMENT_DELETED:
                this.logger.log(
                    `Handling payment deleted for Invoice ID: ${invoicePaymentEvent.paymentData.invoiceId}, Payment ID: ${invoicePaymentEvent.paymentData.paymentId}`
                );
                await this.invoicePaymentHandlerService.handle(
                    invoicePaymentEvent.paymentData,
                    InvoicePaymentEventEnum.PAYMENT_DELETED
                );
                break;

            case InvoicePaymentEventEnum.PAYMENT_UPDATED:
                this.logger.log(
                    `Handling payment updated for Invoice ID: ${invoicePaymentEvent.paymentData.invoiceId}, Payment ID: ${invoicePaymentEvent.paymentData.paymentId}`
                );
                await this.invoicePaymentHandlerService.handle(
                    invoicePaymentEvent.paymentData,
                    InvoicePaymentEventEnum.PAYMENT_UPDATED
                );
                break;

            case InvoicePaymentEventEnum.INVOICE_AMOUNT_CHANGED:
                // Handle invoice amount changed event - data is in different format
                const amountChangedData = messageBody as {
                    eventType: InvoicePaymentEventEnum;
                    invoiceData: InvoiceAmountChangedDto;
                };
                this.logger.log(
                    `Handling invoice amount changed for Invoice ID: ${amountChangedData.invoiceData.invoiceId}, old: ${amountChangedData.invoiceData.oldFinalAmount}, new: ${amountChangedData.invoiceData.newFinalAmount}`
                );
                await this.invoicePaymentHandlerService.handleInvoiceAmountChanged(
                    amountChangedData.invoiceData
                );
                break;

            default:
                this.logger.warn(`Unhandled invoice payment event type: ${invoicePaymentEvent.eventType}`);
        }
    }
}
