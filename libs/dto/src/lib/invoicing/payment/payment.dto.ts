import { ApiProperty } from '@nestjs/swagger';
import { ChequeClearStatusEnum } from '../../enums/cheque.clear.status.enum';
import { StatusEnum } from '../../enums/status.enum';
import { PaymentContractDetailsDto } from './payment.contract.details.dto';
import { PaymentDetailsDto } from './payment.details.dto';
import { PaymentInvoiceDetailsDto } from './payment.invoice.details.dto';

export class PaymentDto {
    @ApiProperty()
    paymentId!: string;

    @ApiProperty()
    paymentDate!: string;

    @ApiProperty()
    paymentAmount!: number;

    @ApiProperty()
    customerId!: string;

    @ApiProperty()
    customerName!: string;

    @ApiProperty()
    areaId!: string;

    @ApiProperty()
    areaName!: string;

    @ApiProperty()
    customerCreditPayment = false;

    @ApiProperty()
    receiptNo!: string;

    @ApiProperty()
    activityLogs!: string[];

    @ApiProperty()
    forApprovalVersion!: Record<string, unknown>;

    @ApiProperty()
    contractPayment!: boolean;

    @ApiProperty({
        enum: StatusEnum,
    })
    status?: StatusEnum;

    @ApiProperty()
    contractId!: string;

    @ApiProperty()
    contractName!: string;

    @ApiProperty()
    contractNo!: string;

    @ApiProperty()
    changeReason!: string;

    @ApiProperty({
        enum: ChequeClearStatusEnum,
    })
    chequeClearStatus!: ChequeClearStatusEnum;

    @ApiProperty({ type: [PaymentDetailsDto], isArray: true })
    paymentDetails!: PaymentDetailsDto[];

    @ApiProperty({ type: [PaymentInvoiceDetailsDto], isArray: true })
    paymentInvoiceDetails!: PaymentInvoiceDetailsDto[];

    @ApiProperty({ type: [PaymentContractDetailsDto], isArray: true })
    paymentContractDetails!: PaymentContractDetailsDto[];

    @ApiProperty()
    approverMessage?: string;
}
