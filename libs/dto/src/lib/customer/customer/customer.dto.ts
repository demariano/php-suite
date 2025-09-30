import { ApiProperty } from '@nestjs/swagger';
import { StatusEnum } from '../../enums/status.enum';
import { ProductDealDto } from '../../product/product.deal/product.deal.dto';
import { TermsDto } from '../terms/terms.dto';

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
    townId?: string;

    @ApiProperty()
    townName?: string;

    @ApiProperty()
    creditLimit?: number;

    @ApiProperty()
    customerCreditLimit?: number;

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
    activityLogs?: string[];

    @ApiProperty()
    customerTerms?: TermsDto[];

    @ApiProperty()
    customerDeals?: ProductDealDto[];
}
