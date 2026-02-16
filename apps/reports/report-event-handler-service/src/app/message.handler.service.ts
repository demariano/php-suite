import { ReportEventDto, ReportEventEnum, ReportTypeEnum } from '@dto';
import { Injectable, Logger } from '@nestjs/common';
import { CustomerListReportHandlerService } from './customer-list-report-handler/customer-list-report-handler.service';
import { InvoicePerDatePerAreaReportHandlerService } from './invoice-per-date-per-area-report-handler/invoice-per-date-per-area-report-handler.service';
import { InvoicePerDatePerProductReportHandlerService } from './invoice-per-date-per-product-report-handler/invoice-per-date-per-product-report-handler.service';
import { InvoicePerDateReportHandlerService } from './invoice-per-date-report-handler/invoice-per-date-report-handler.service';

@Injectable()
export class MessageHandlerService {
    private readonly logger = new Logger(MessageHandlerService.name);

    constructor(
        private readonly customerListReportHandler: CustomerListReportHandlerService,
        private readonly invoicePerDateReportHandler: InvoicePerDateReportHandlerService,
        private readonly invoicePerDatePerAreaReportHandler: InvoicePerDatePerAreaReportHandlerService,
        private readonly invoicePerDatePerProductReportHandler: InvoicePerDatePerProductReportHandlerService
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
            default:
                this.logger.warn(`Unknown report type: ${reportType}`);
        }
    }
}
