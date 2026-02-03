import { ApiProperty } from '@nestjs/swagger';
import { StatusEnum } from '../../enums/status.enum';
import { TermsDto } from '../terms/terms.dto';
import { CustomerProductDealDto } from './customer.product.deal.dto';

export class CustomerDto {
    @ApiProperty()
    customerId!: string;

    @ApiProperty()
    customerName?: string;

    @ApiProperty()
    email?: string;

    @ApiProperty()
    address1?: string;

    @ApiProperty()
    address2?: string;

    @ApiProperty()
    balance?: number;

    @ApiProperty()
    contactNo?: string;

    @ApiProperty()
    contactPerson?: string;

    @ApiProperty()
    townName?: string;

    @ApiProperty()
    creditLimit?: number;

    @ApiProperty()
    customerCredit?: number;

    @ApiProperty()
    tinNumber?: string;

    @ApiProperty()
    areaId?: string;

    @ApiProperty()
    areaName?: string;

    @ApiProperty()
    customerClassificationId?: string;

    @ApiProperty()
    customerClassificationName?: string;

    @ApiProperty()
    customerTypeId?: string;

    @ApiProperty()
    customerTypeName?: string;

    @ApiProperty({ enum: StatusEnum })
    status?: StatusEnum;

    @ApiProperty()
    forApprovalVersion?: Record<string, unknown>;

    @ApiProperty()
    changeReason?: string;

    @ApiProperty()
    deletionReason?: string;

    @ApiProperty()
    reactivationReason?: string;

    @ApiProperty()
    activityLogs?: string[];

    @ApiProperty()
    customerTerms?: TermsDto[];

    @ApiProperty()
    customerProductDeals?: CustomerProductDealDto[];

    @ApiProperty()
    approverMessage?: string;
}
