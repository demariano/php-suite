import { ReportEventDto, ReportEventEnum, ReportTypeEnum } from '@dto';
import { Injectable, Logger } from '@nestjs/common';
import { CustomerListReportHandlerService } from './customer-list-report-handler/customer-list-report-handler.service';
import { InvoicePerDatePerAreaReportHandlerService } from './invoice-per-date-per-area-report-handler/invoice-per-date-per-area-report-handler.service';
import { InvoicePerDatePerProductReportHandlerService } from './invoice-per-date-per-product-report-handler/invoice-per-date-per-product-report-handler.service';
import { InvoicePerDateReportHandlerService } from './invoice-per-date-report-handler/invoice-per-date-report-handler.service';
import { PaymentsReceivedReportHandlerService } from './payments-received-report-handler/payments-received-report-handler.service';
import { ProductListReportHandlerService } from './product-list-report-handler/product-list-report-handler.service';
import { RgsPerDateReportHandlerService } from './rgs-per-date-report-handler/rgs-per-date-report-handler.service';
import { StockListReportHandlerService } from './stock-list-report-handler/stock-list-report-handler.service';
import { VoucherPerDateReportHandlerService } from './voucher-per-date-report-handler/voucher-per-date-report-handler.service';

@Injectable()
export class MessageHandlerService {
    private readonly logger = new Logger(MessageHandlerService.name);

    constructor(
        private readonly customerListReportHandler: CustomerListReportHandlerService,
        private readonly invoicePerDateReportHandler: InvoicePerDateReportHandlerService,
        private readonly invoicePerDatePerAreaReportHandler: InvoicePerDatePerAreaReportHandlerService,
        private readonly invoicePerDatePerProductReportHandler: InvoicePerDatePerProductReportHandlerService,
        private readonly paymentsReceivedReportHandler: PaymentsReceivedReportHandlerService,
        private readonly rgsPerDateReportHandler: RgsPerDateReportHandlerService,
        private readonly stockListReportHandler: StockListReportHandlerService,
        private readonly productListReportHandler: ProductListReportHandlerService,
        private readonly voucherPerDateReportHandler: VoucherPerDateReportHandlerService
    ) {}

    async handleMessage(message: string | ReportEventDto | unknown) {
        this.logger.log(`Received message: ${JSON.stringify(message)}`);

        try {
            // Parse message if it's a string (from SQS Body)
            const parsedMessage: ReportEventDto =
                typeof message === 'string' ? JSON.parse(message) : (message as ReportEventDto);
            const eventType = parsedMessage.eventType;

            switch (eventType) {
                case ReportEventEnum.GENERATE_REPORT:
                    await this.handleGenerateReport(parsedMessage);
                    break;
                default:
                    this.logger.warn(`Unknown event type: ${eventType}`);
            }
        } catch (error: unknown) {
            if (error instanceof Error) {
                this.logger.error(`Error handling message: ${error.message}`, error.stack);
            } else {
                this.logger.error(`Error handling message: ${String(error)}`);
            }
            throw error;
        }
    }

    private async handleGenerateReport(event: ReportEventDto): Promise<void> {
        const reportType = event.reportType;

        switch (reportType) {
            case ReportTypeEnum.CUSTOMER_LIST:
                await this.customerListReportHandler.handleCustomerListReport(event);
                break;
            case ReportTypeEnum.INVOICE_PER_DATE:
                await this.invoicePerDateReportHandler.handleInvoicePerDateReport(event);
                break;
            case ReportTypeEnum.INVOICE_PER_DATE_PER_CUSTOMER:
                // Legacy type (hidden in UI) - generate the same invoice-per-date output using provided filters
                await this.invoicePerDateReportHandler.handleInvoicePerDateReport(event);
                break;
            case ReportTypeEnum.INVOICE_PER_DATE_PER_AREA:
                await this.invoicePerDatePerAreaReportHandler.handleInvoicePerDatePerAreaReport(event);
                break;
            case ReportTypeEnum.INVOICE_PER_DATE_PER_PRODUCT:
                await this.invoicePerDatePerProductReportHandler.handleInvoicePerDatePerProductReport(event);
                break;
            case ReportTypeEnum.PAYMENTS_RECEIVED:
                await this.paymentsReceivedReportHandler.handlePaymentsReceivedReport(event);
                break;
            case ReportTypeEnum.RGS_PER_DATE:
            case ReportTypeEnum.RGS_PER_DATE_PER_CUSTOMER:
                await this.rgsPerDateReportHandler.handleRgsPerDateReport(event);
                break;
            case ReportTypeEnum.STOCK_LIST:
                await this.stockListReportHandler.handleStockListReport(event);
                break;
            case ReportTypeEnum.PRODUCT_LIST:
                await this.productListReportHandler.handleProductListReport(event);
                break;
            case ReportTypeEnum.VOUCHER_PER_DATE:
            case ReportTypeEnum.VOUCHER_PER_DATE_PER_CUSTOMER:
                await this.voucherPerDateReportHandler.handleVoucherReport(event);
                break;
            default:
                this.logger.warn(`Unknown report type: ${reportType}`);
        }
    }
}
