import { ApiProperty } from '@nestjs/swagger';
import { PaymentStatusEnum } from '../../enums/payment.status.enum';
import { PrintStatusEnum } from '../../enums/print.status.enum';
import { StatusEnum } from '../../enums/status.enum';
import { InvoiceDetailsDto } from './invoice.details.dto';
import { InvoicePaymentDto } from './invoice.payment.dto';

export class InvoiceDto {
    @ApiProperty()
    invoiceId!: string;

    @ApiProperty()
    docno?: string;

    @ApiProperty()
    invoiceDate?: string;

    @ApiProperty()
    customerId?: string;

    @ApiProperty()
    customerName?: string;

    @ApiProperty()
    areaId?: string;

    @ApiProperty()
    areaName?: string;

    @ApiProperty()
    territoryManagerId?: string;

    @ApiProperty()
    territoryManagerName?: string;

    @ApiProperty()
    salesTypeId?: string;

    @ApiProperty()
    salesTypeName?: string;

    @ApiProperty()
    finalAmount?: number;

    @ApiProperty()
    invoiceAmount?: number;

    @ApiProperty()
    taxAmount?: number;

    @ApiProperty()
    totalAmountPaid?: number;

    @ApiProperty()
    contractId?: string;

    @ApiProperty()
    contractName?: string;

    @ApiProperty()
    termsId?: string;

    @ApiProperty()
    termsName?: string;

    @ApiProperty()
    productPriceTypeId?: string;

    @ApiProperty()
    productPriceTypeName?: string;

    @ApiProperty({ enum: StatusEnum })
    status?: StatusEnum;

    @ApiProperty({ enum: PaymentStatusEnum })
    paymentStatus?: PaymentStatusEnum;

    @ApiProperty({ enum: PrintStatusEnum })
    printStatus?: PrintStatusEnum;

    @ApiProperty({ type: [InvoiceDetailsDto], isArray: true })
    invoiceDetails?: InvoiceDetailsDto[];

    @ApiProperty({ type: [InvoicePaymentDto], isArray: true })
    payments?: InvoicePaymentDto[];

    @ApiProperty()
    activityLogs?: string[];

    @ApiProperty()
    forApprovalVersion?: Record<string, unknown>;

    @ApiProperty()
    changeReason?: string;

    @ApiProperty()
    contractSales?: boolean;

    @ApiProperty()
    approverMessage?: string;
}
