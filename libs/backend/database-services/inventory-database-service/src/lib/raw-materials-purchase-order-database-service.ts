import {
    CreateRawMaterialsPurchaseOrderDto,
    PageDto,
    RawMaterialsPurchaseOrderDto,
    RawMaterialsPurchaseOrderStatusEnum,
    StatusEnum,
} from '@dto';
import {
    createDynamoDbOptionWithPKSKIndex,
    DynamoDbLibService,
    InventorySchema,
    pageRecordHandler,
    RawMaterialsPurchaseOrderDataType,
} from '@dynamo-db-lib';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Model } from 'dynamodb-onetable';
import { RawMaterialsPurchaseOrderDatabaseServiceAbstract } from './raw-materials-purchase-order-database-service-abstract-class';

@Injectable()
export class RawMaterialsPurchaseOrderDatabaseService implements RawMaterialsPurchaseOrderDatabaseServiceAbstract {
    protected readonly logger = new Logger(RawMaterialsPurchaseOrderDatabaseService.name);

    private readonly rawMaterialsPurchaseOrderTable: Model<RawMaterialsPurchaseOrderDataType>;

    constructor(private readonly configService: ConfigService) {
        const DYNAMO_DB_INVENTORY_TABLE = configService.get<string>('DYNAMO_DB_INVENTORY_TABLE');
        if (!DYNAMO_DB_INVENTORY_TABLE) {
            throw new Error('DYNAMO_DB_INVENTORY_TABLE is not defined in the configuration');
        }
        const dynamoDbService = new DynamoDbLibService(configService);
        this.rawMaterialsPurchaseOrderTable = dynamoDbService
            .dynamoDbMainTable(DYNAMO_DB_INVENTORY_TABLE, InventorySchema)
            .getModel('RawMaterialsPurchaseOrder');
    }

    async createRecord(
        rawMaterialsPurchaseOrderDto: CreateRawMaterialsPurchaseOrderDto
    ): Promise<RawMaterialsPurchaseOrderDto> {
        const rawMaterialsPurchaseOrderData: RawMaterialsPurchaseOrderDataType = {
            status: rawMaterialsPurchaseOrderDto.status,
            poStatus: rawMaterialsPurchaseOrderDto.poStatus,
            rawMaterialSupplierId: rawMaterialsPurchaseOrderDto.rawMaterialSupplierId,
            rawMaterialSupplierName: rawMaterialsPurchaseOrderDto.rawMaterialSupplierName,
            poDate: rawMaterialsPurchaseOrderDto.poDate,
            docNo: rawMaterialsPurchaseOrderDto.docNo,
            purchaseOrderDetails: rawMaterialsPurchaseOrderDto.purchaseOrderDetails,
            deliveredPurchaseOrderDetails: rawMaterialsPurchaseOrderDto.deliveredPurchaseOrderDetails,
            activityLogs: rawMaterialsPurchaseOrderDto.activityLogs,
            forApprovalVersion: rawMaterialsPurchaseOrderDto.forApprovalVersion,
            changeReason: rawMaterialsPurchaseOrderDto.changeReason,
            approverMessage: rawMaterialsPurchaseOrderDto.approverMessage,
            GSI1PK: 'RAW_MATERIALS_PURCHASE_ORDER',
            GSI1SK: rawMaterialsPurchaseOrderDto.poDate,
            GSI2PK: `RAW_MATERIALS_PURCHASE_ORDER#${rawMaterialsPurchaseOrderDto.status}`,
            GSI2SK: rawMaterialsPurchaseOrderDto.poDate,
            GSI3PK: `RAW_MATERIALS_PURCHASE_ORDER#PO_STATUS#${rawMaterialsPurchaseOrderDto.poStatus}`,
            GSI3SK: rawMaterialsPurchaseOrderDto.poDate,
            GSI4PK: `RAW_MATERIALS_PURCHASE_ORDER#SUPPLIER#${rawMaterialsPurchaseOrderDto.rawMaterialSupplierId}`,
            GSI4SK: rawMaterialsPurchaseOrderDto.poDate,
            GSI5PK: 'RAW_MATERIALS_PURCHASE_ORDER',
            GSI5SK: rawMaterialsPurchaseOrderDto.docNo,
        };

        const record: RawMaterialsPurchaseOrderDataType = await this.rawMaterialsPurchaseOrderTable.create(
            rawMaterialsPurchaseOrderData
        );

        return await this.convertToDto(record);
    }

    async updateRecord(record: RawMaterialsPurchaseOrderDto): Promise<RawMaterialsPurchaseOrderDto> {
        const data: RawMaterialsPurchaseOrderDataType = await this.convertToDataType(record);

        data.poStatus = record.poStatus;
        data.rawMaterialSupplierId = record.rawMaterialSupplierId;
        data.rawMaterialSupplierName = record.rawMaterialSupplierName;
        data.poDate = record.poDate;
        data.docNo = record.docNo;
        data.purchaseOrderDetails = record.purchaseOrderDetails;
        data.deliveredPurchaseOrderDetails = record.deliveredPurchaseOrderDetails;
        data.status = record.status;
        data.GSI1PK = 'RAW_MATERIALS_PURCHASE_ORDER';
        data.GSI1SK = record.poDate;
        data.GSI2PK = `RAW_MATERIALS_PURCHASE_ORDER#${record.status}`;
        data.GSI2SK = record.poDate;
        data.GSI3PK = `RAW_MATERIALS_PURCHASE_ORDER#PO_STATUS#${record.poStatus}`;
        data.GSI3SK = record.poDate;
        data.GSI4PK = `RAW_MATERIALS_PURCHASE_ORDER#SUPPLIER#${record.rawMaterialSupplierId}`;
        data.GSI4SK = record.poDate;
        data.GSI5PK = 'RAW_MATERIALS_PURCHASE_ORDER';
        data.GSI5SK = record.docNo;
        data.forApprovalVersion = record.forApprovalVersion;
        data.changeReason = record.changeReason;
        data.approverMessage = record.approverMessage;

        const updated: RawMaterialsPurchaseOrderDataType = await this.rawMaterialsPurchaseOrderTable.update(data);
        return await this.convertToDto(updated);
    }

    async findRecordById(id: string): Promise<RawMaterialsPurchaseOrderDto | null> {
        const record = await this.rawMaterialsPurchaseOrderTable.get({
            PK: 'RAW_MATERIALS_PURCHASE_ORDER',
            SK: `${id}`,
        });

        if (!record) {
            return null;
        }

        return await this.convertToDto(record);
    }

    async findRecordByDocNo(docNo: string): Promise<RawMaterialsPurchaseOrderDto | null> {
        const records = await this.rawMaterialsPurchaseOrderTable.find(
            {
                GSI5PK: 'RAW_MATERIALS_PURCHASE_ORDER',
                GSI5SK: docNo,
            },
            { index: 'GSI5' }
        );

        if (!records || records.length === 0) {
            return null;
        }

        return await this.convertToDto(records[0]);
    }

    async findRecordsByStatusPagination(
        limit: number,
        poStatus: string,
        direction: string,
        cursorPointer: string
    ): Promise<PageDto<RawMaterialsPurchaseOrderDto>> {
        limit = Number(limit);
        const dynamoDbOption = createDynamoDbOptionWithPKSKIndex(limit, 'GSI3', direction, cursorPointer);

        const records = await this.rawMaterialsPurchaseOrderTable.find(
            {
                GSI3PK: `RAW_MATERIALS_PURCHASE_ORDER#PO_STATUS#${poStatus}`,
            },
            dynamoDbOption
        );

        const pageRecordCursorPointers = pageRecordHandler(
            records,
            limit,
            direction,
            'GSI3PK',
            'GSI3SK',
            'PK',
            'SK',
            JSON.stringify(records.next),
            JSON.stringify(records.prev)
        );

        return new PageDto(
            await this.convertToDtoList(records),
            pageRecordCursorPointers.nextCursorPointer,
            pageRecordCursorPointers.prevCursorPointer
        );
    }

    async findRecordsBySupplierPagination(
        limit: number,
        supplierId: string,
        direction: string,
        cursorPointer: string
    ): Promise<PageDto<RawMaterialsPurchaseOrderDto>> {
        limit = Number(limit);
        const dynamoDbOption = createDynamoDbOptionWithPKSKIndex(limit, 'GSI4', direction, cursorPointer);

        const records = await this.rawMaterialsPurchaseOrderTable.find(
            {
                GSI4PK: `RAW_MATERIALS_PURCHASE_ORDER#SUPPLIER#${supplierId}`,
            },
            dynamoDbOption
        );

        const pageRecordCursorPointers = pageRecordHandler(
            records,
            limit,
            direction,
            'GSI4PK',
            'GSI4SK',
            'PK',
            'SK',
            JSON.stringify(records.next),
            JSON.stringify(records.prev)
        );

        return new PageDto(
            await this.convertToDtoList(records),
            pageRecordCursorPointers.nextCursorPointer,
            pageRecordCursorPointers.prevCursorPointer
        );
    }

    async findRecordsByPagination(
        limit: number,
        direction: string,
        cursorPointer: string
    ): Promise<PageDto<RawMaterialsPurchaseOrderDto>> {
        limit = Number(limit);
        const dynamoDbOption = createDynamoDbOptionWithPKSKIndex(limit, 'GSI1', direction, cursorPointer);

        const records = await this.rawMaterialsPurchaseOrderTable.find(
            {
                GSI1PK: 'RAW_MATERIALS_PURCHASE_ORDER',
            },
            dynamoDbOption
        );

        const pageRecordCursorPointers = pageRecordHandler(
            records,
            limit,
            direction,
            'GSI1PK',
            'GSI1SK',
            'PK',
            'SK',
            JSON.stringify(records.next),
            JSON.stringify(records.prev)
        );

        return new PageDto(
            await this.convertToDtoList(records),
            pageRecordCursorPointers.nextCursorPointer,
            pageRecordCursorPointers.prevCursorPointer
        );
    }

    async deleteRecord(dto: RawMaterialsPurchaseOrderDto): Promise<RawMaterialsPurchaseOrderDto> {
        const record: RawMaterialsPurchaseOrderDataType = await this.convertToDataType(dto);
        await this.rawMaterialsPurchaseOrderTable.remove(record);
        this.logger.log(`RawMaterialsPurchaseOrder Record hard deleted: ${JSON.stringify(record)}`);
        return await this.convertToDto(record);
    }

    async deleteAllRecords(): Promise<void> {
        const records = await this.rawMaterialsPurchaseOrderTable.find(
            {
                GSI1PK: 'RAW_MATERIALS_PURCHASE_ORDER',
            },
            {
                index: 'GSI1',
            }
        );

        for (const record of records) {
            await this.rawMaterialsPurchaseOrderTable.remove(record);
            this.logger.log(`Raw Materials Purchase Order Record deleted: ${JSON.stringify(record)}`);
        }
    }

    async convertToDto(record: RawMaterialsPurchaseOrderDataType): Promise<RawMaterialsPurchaseOrderDto> {
        const dto = new RawMaterialsPurchaseOrderDto();
        dto.rawMaterialsPurchaseOrderId = record.rawMaterialsPurchaseOrderId ? record.rawMaterialsPurchaseOrderId : '';
        dto.poStatus = record.poStatus
            ? (record.poStatus as RawMaterialsPurchaseOrderStatusEnum)
            : RawMaterialsPurchaseOrderStatusEnum.PENDING;
        dto.status = record.status ? (record.status as StatusEnum) : StatusEnum.ACTIVE;
        dto.rawMaterialSupplierId = record.rawMaterialSupplierId ? record.rawMaterialSupplierId : '';
        dto.rawMaterialSupplierName = record.rawMaterialSupplierName ? record.rawMaterialSupplierName : '';
        dto.poDate = record.poDate ? record.poDate : '';
        dto.docNo = record.docNo ? record.docNo : '';
        dto.purchaseOrderDetails = record.purchaseOrderDetails ? record.purchaseOrderDetails : [];
        dto.deliveredPurchaseOrderDetails = record.deliveredPurchaseOrderDetails
            ? record.deliveredPurchaseOrderDetails
            : [];
        dto.activityLogs = record.activityLogs ? record.activityLogs : [];
        dto.forApprovalVersion = record.forApprovalVersion ? record.forApprovalVersion : {};
        dto.changeReason = (record as RawMaterialsPurchaseOrderDataType & { changeReason?: string }).changeReason;
        dto.approverMessage = record.approverMessage ? record.approverMessage : undefined;
        return dto;
    }

    async convertToDtoList(records: RawMaterialsPurchaseOrderDataType[]): Promise<RawMaterialsPurchaseOrderDto[]> {
        const dtoList: RawMaterialsPurchaseOrderDto[] = [];

        for (const record of records) {
            const dto: RawMaterialsPurchaseOrderDto = await this.convertToDto(record);
            dtoList.push(dto);
        }

        return dtoList;
    }

    async convertToDataType(dto: RawMaterialsPurchaseOrderDto): Promise<RawMaterialsPurchaseOrderDataType> {
        const rawMaterialsPurchaseOrderData: RawMaterialsPurchaseOrderDataType = {
            rawMaterialsPurchaseOrderId: dto.rawMaterialsPurchaseOrderId,
            poStatus: dto.poStatus,
            rawMaterialSupplierId: dto.rawMaterialSupplierId,
            rawMaterialSupplierName: dto.rawMaterialSupplierName,
            poDate: dto.poDate,
            purchaseOrderDetails: dto.purchaseOrderDetails,
            deliveredPurchaseOrderDetails: dto.deliveredPurchaseOrderDetails,
            status: dto.status,
            GSI1PK: 'RAW_MATERIALS_PURCHASE_ORDER',
            GSI1SK: dto.poDate,
            GSI2PK: `RAW_MATERIALS_PURCHASE_ORDER#${dto.status}`,
            GSI2SK: dto.poDate,
            GSI3PK: `RAW_MATERIALS_PURCHASE_ORDER#PO_STATUS#${dto.poStatus}`,
            GSI3SK: dto.poDate,
            GSI4PK: `RAW_MATERIALS_PURCHASE_ORDER#SUPPLIER#${dto.rawMaterialSupplierId}`,
            GSI4SK: dto.poDate,
            activityLogs: dto.activityLogs,
            forApprovalVersion: dto.forApprovalVersion,
            changeReason: dto.changeReason,
            approverMessage: dto.approverMessage,
        };
        return rawMaterialsPurchaseOrderData;
    }
}
