import {
    CreateStockPurchaseOrderDto,
    PageDto,
    StatusEnum,
    StockPurchaseOrderDto,
    StockPurchaseOrderStatusEnum,
} from '@dto';
import {
    createDynamoDbOptionWithPKSKIndex,
    DynamoDbLibService,
    InventorySchema,
    pageRecordHandler,
    StockPurchaseOrderDataType,
} from '@dynamo-db-lib';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Model } from 'dynamodb-onetable';
import { StockPurchaseOrderDatabaseServiceAbstract } from './stock-purchase-order-database-service-abstract-class';

@Injectable()
export class StockPurchaseOrderDatabaseService implements StockPurchaseOrderDatabaseServiceAbstract {
    protected readonly logger = new Logger(StockPurchaseOrderDatabaseService.name);

    private readonly stockPurchaseOrderTable: Model<StockPurchaseOrderDataType>;

    constructor(private readonly configService: ConfigService) {
        const DYNAMO_DB_INVENTORY_TABLE = configService.get<string>('DYNAMO_DB_INVENTORY_TABLE');
        if (!DYNAMO_DB_INVENTORY_TABLE) {
            throw new Error('DYNAMO_DB_INVENTORY_TABLE is not defined in the configuration');
        }
        const dynamoDbService = new DynamoDbLibService(configService);
        this.stockPurchaseOrderTable = dynamoDbService
            .dynamoDbMainTable(DYNAMO_DB_INVENTORY_TABLE, InventorySchema)
            .getModel('StockPurchaseOrder');
    }

    async createRecord(stockPurchaseOrderDto: CreateStockPurchaseOrderDto): Promise<StockPurchaseOrderDto> {
        // Ensure docNo is set, use poDate as fallback if not provided
        const docNo = stockPurchaseOrderDto.docNo || stockPurchaseOrderDto.poDate || '';

        const stockPurchaseOrderData: StockPurchaseOrderDataType = {
            status: stockPurchaseOrderDto.status,
            poStatus: stockPurchaseOrderDto.poStatus,
            supplierId: stockPurchaseOrderDto.supplierId,
            supplierName: stockPurchaseOrderDto.supplierName,
            poDate: stockPurchaseOrderDto.poDate,
            docNo: docNo,
            purchaseOrderDetails: stockPurchaseOrderDto.purchaseOrderDetails,
            deliveredPurchaseOrderDetails: stockPurchaseOrderDto.deliveredPurchaseOrderDetails,
            activityLogs: stockPurchaseOrderDto.activityLogs,
            forApprovalVersion: stockPurchaseOrderDto.forApprovalVersion,
            changeReason: stockPurchaseOrderDto.changeReason,
            approverMessage: stockPurchaseOrderDto.approverMessage,
            GSI1PK: 'STOCK_PURCHASE_ORDER',
            GSI1SK: stockPurchaseOrderDto.poDate,
            GSI2PK: `STOCK_PURCHASE_ORDER#${stockPurchaseOrderDto.status}`,
            GSI2SK: stockPurchaseOrderDto.poDate,
            GSI3PK: `STOCK_PURCHASE_ORDER#PO_STATUS#${stockPurchaseOrderDto.poStatus}`,
            GSI3SK: stockPurchaseOrderDto.poDate,
            GSI4PK: `STOCK_PURCHASE_ORDER#SUPPLIER#${stockPurchaseOrderDto.supplierId}`,
            GSI4SK: stockPurchaseOrderDto.poDate,
            GSI5PK: 'STOCK_PURCHASE_ORDER',
            GSI5SK: docNo,
        };

        const record: StockPurchaseOrderDataType = await this.stockPurchaseOrderTable.create(stockPurchaseOrderData);

        return await this.convertToDto(record);
    }

    async updateRecord(record: StockPurchaseOrderDto): Promise<StockPurchaseOrderDto> {
        const data: StockPurchaseOrderDataType = await this.convertToDataType(record);

        // Ensure docNo is not undefined/null
        const docNo = record.docNo || record.poDate || '';

        data.poStatus = record.poStatus;
        data.supplierId = record.supplierId;
        data.supplierName = record.supplierName;
        data.poDate = record.poDate;
        data.docNo = docNo;
        data.purchaseOrderDetails = record.purchaseOrderDetails;
        data.deliveredPurchaseOrderDetails = record.deliveredPurchaseOrderDetails;
        data.status = record.status;
        data.GSI1PK = 'STOCK_PURCHASE_ORDER';
        data.GSI1SK = record.poDate;
        data.GSI2PK = `STOCK_PURCHASE_ORDER#${record.status}`;
        data.GSI2SK = record.poDate;
        data.GSI3PK = `STOCK_PURCHASE_ORDER#PO_STATUS#${record.poStatus}`;
        data.GSI3SK = record.poDate;
        data.GSI4PK = `STOCK_PURCHASE_ORDER#SUPPLIER#${record.supplierId}`;
        data.GSI4SK = record.poDate;
        data.GSI5PK = 'STOCK_PURCHASE_ORDER';
        data.GSI5SK = docNo;
        data.forApprovalVersion = record.forApprovalVersion;
        data.changeReason = record.changeReason;
        data.approverMessage = record.approverMessage;

        const updated: StockPurchaseOrderDataType = await this.stockPurchaseOrderTable.update(data);
        return await this.convertToDto(updated);
    }

    async findRecordById(id: string): Promise<StockPurchaseOrderDto | null> {
        const record = await this.stockPurchaseOrderTable.get({
            PK: 'STOCK_PURCHASE_ORDER',
            SK: `${id}`,
        });

        if (!record) {
            return null;
        }

        return await this.convertToDto(record);
    }

    async findRecordByDocNo(docNo: string): Promise<StockPurchaseOrderDto | null> {
        const records = await this.stockPurchaseOrderTable.find(
            {
                GSI5PK: 'STOCK_PURCHASE_ORDER',
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
    ): Promise<PageDto<StockPurchaseOrderDto>> {
        limit = Number(limit);
        const dynamoDbOption = createDynamoDbOptionWithPKSKIndex(limit, 'GSI3', direction, cursorPointer);

        const records = await this.stockPurchaseOrderTable.find(
            {
                GSI3PK: `STOCK_PURCHASE_ORDER#PO_STATUS#${poStatus}`,
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
    ): Promise<PageDto<StockPurchaseOrderDto>> {
        limit = Number(limit);
        const dynamoDbOption = createDynamoDbOptionWithPKSKIndex(limit, 'GSI4', direction, cursorPointer);

        const records = await this.stockPurchaseOrderTable.find(
            {
                GSI4PK: `STOCK_PURCHASE_ORDER#SUPPLIER#${supplierId}`,
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
    ): Promise<PageDto<StockPurchaseOrderDto>> {
        limit = Number(limit);
        const dynamoDbOption = createDynamoDbOptionWithPKSKIndex(limit, 'GSI1', direction, cursorPointer);

        const records = await this.stockPurchaseOrderTable.find(
            {
                GSI1PK: 'STOCK_PURCHASE_ORDER',
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

    async deleteRecord(dto: StockPurchaseOrderDto): Promise<StockPurchaseOrderDto> {
        const record: StockPurchaseOrderDataType = await this.convertToDataType(dto);
        await this.stockPurchaseOrderTable.remove(record);
        this.logger.log(`StockPurchaseOrder Record hard deleted: ${JSON.stringify(record)}`);
        return await this.convertToDto(record);
    }

    async deleteAllRecords(): Promise<void> {
        const records = await this.stockPurchaseOrderTable.find(
            {
                GSI1PK: 'STOCK_PURCHASE_ORDER',
            },
            {
                index: 'GSI1',
            }
        );

        for (const record of records) {
            await this.stockPurchaseOrderTable.remove(record);
            this.logger.log(`Stock Purchase Order Record deleted: ${JSON.stringify(record)}`);
        }
    }

    async convertToDto(record: StockPurchaseOrderDataType): Promise<StockPurchaseOrderDto> {
        const dto = new StockPurchaseOrderDto();
        dto.stockPurchaseOrderId = record.stockPurchaseOrderId ? record.stockPurchaseOrderId : '';
        dto.poStatus = record.poStatus
            ? (record.poStatus as StockPurchaseOrderStatusEnum)
            : StockPurchaseOrderStatusEnum.PENDING;
        dto.status = record.status ? (record.status as StatusEnum) : StatusEnum.ACTIVE;
        dto.supplierId = record.supplierId ? record.supplierId : '';
        dto.supplierName = record.supplierName ? record.supplierName : '';
        dto.poDate = record.poDate ? record.poDate : '';
        dto.docNo = record.docNo ? record.docNo : '';
        dto.purchaseOrderDetails = record.purchaseOrderDetails ? record.purchaseOrderDetails : [];
        dto.deliveredPurchaseOrderDetails = record.deliveredPurchaseOrderDetails
            ? record.deliveredPurchaseOrderDetails
            : [];
        dto.activityLogs = record.activityLogs ? record.activityLogs : [];
        dto.forApprovalVersion = record.forApprovalVersion ? record.forApprovalVersion : {};
        dto.changeReason = (record as StockPurchaseOrderDataType & { changeReason?: string }).changeReason;
        dto.approverMessage = record.approverMessage ? record.approverMessage : undefined;
        return dto;
    }

    async convertToDtoList(records: StockPurchaseOrderDataType[]): Promise<StockPurchaseOrderDto[]> {
        const dtoList: StockPurchaseOrderDto[] = [];

        for (const record of records) {
            const dto: StockPurchaseOrderDto = await this.convertToDto(record);
            dtoList.push(dto);
        }

        return dtoList;
    }

    async convertToDataType(dto: StockPurchaseOrderDto): Promise<StockPurchaseOrderDataType> {
        const stockPurchaseOrderData: StockPurchaseOrderDataType = {
            stockPurchaseOrderId: dto.stockPurchaseOrderId,
            poStatus: dto.poStatus,
            supplierId: dto.supplierId,
            supplierName: dto.supplierName,
            poDate: dto.poDate,
            docNo: dto.docNo,
            purchaseOrderDetails: dto.purchaseOrderDetails,
            deliveredPurchaseOrderDetails: dto.deliveredPurchaseOrderDetails,
            status: dto.status,
            GSI1PK: 'STOCK_PURCHASE_ORDER',
            GSI1SK: dto.poDate,
            GSI2PK: `STOCK_PURCHASE_ORDER#${dto.status}`,
            GSI2SK: dto.poDate,
            GSI3PK: `STOCK_PURCHASE_ORDER#PO_STATUS#${dto.poStatus}`,
            GSI3SK: dto.poDate,
            GSI4PK: `STOCK_PURCHASE_ORDER#SUPPLIER#${dto.supplierId}`,
            GSI4SK: dto.poDate,
            GSI5PK: 'STOCK_PURCHASE_ORDER',
            GSI5SK: dto.docNo,
            activityLogs: dto.activityLogs,
            forApprovalVersion: dto.forApprovalVersion,
            changeReason: dto.changeReason,
            approverMessage: dto.approverMessage,
        };
        return stockPurchaseOrderData;
    }
}
