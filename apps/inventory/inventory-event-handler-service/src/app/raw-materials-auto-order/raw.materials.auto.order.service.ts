import {
    InventoryEventDto,
    RawMaterialsPurchaseOrderDetailDto,
    RawMaterialsPurchaseOrderDto,
    RawMaterialsPurchaseOrderStatusEnum,
} from '@dto';
import {
    RawMaterialsPurchaseOrderDatabaseServiceAbstract,
    RawMaterialsStockDatabaseServiceAbstract,
} from '@inventory-database-service';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { ProductUnitRawMaterialDatabaseServiceAbstract } from '@product-database-service';

@Injectable()
export class RawMaterialsAutoOrderService {
    private readonly logger = new Logger(RawMaterialsAutoOrderService.name);

    constructor(
        @Inject('RawMaterialsPurchaseOrderDatabaseService')
        private readonly rawMaterialsPurchaseOrderDatabaseService: RawMaterialsPurchaseOrderDatabaseServiceAbstract,
        @Inject('ProductUnitRawMaterialDatabaseService')
        private readonly productUnitRawMaterialDatabaseService: ProductUnitRawMaterialDatabaseServiceAbstract,
        @Inject('RawMaterialsStockDatabaseService')
        private readonly rawMaterialsStockDatabaseService: RawMaterialsStockDatabaseServiceAbstract
    ) {}

    async handle(inventoryEvent: InventoryEventDto): Promise<void> {
        //iterate the purchase order details and check if the raw material is below the threshold, if yes create a purchase order for the raw material
        const rawMaterialToOrder: RawMaterialsPurchaseOrderDetailDto[] = [];
        for (const detail of inventoryEvent.stockPurchaseOrderDto?.purchaseOrderDetails || []) {
            //for each detail check if there are available stock for the raw material, if not create a purchase order for the raw material

            const productUnitRawMaterial = await this.productUnitRawMaterialDatabaseService.findRecordByProductId(
                detail.productId
            );

            if (!productUnitRawMaterial) {
                this.logger.warn(`No raw material mapping found for product ID: ${detail.productId}`);
                continue;
            }

            //find the unit from the productUnitRawMaterial that matches the unit in the purchase order detail
            const rawMaterialsPerUnit = productUnitRawMaterial.rawMaterialsPerUnit.find(
                (unit) => unit.productUnitId === detail.productUnitId
            );

            if (!rawMaterialsPerUnit) {
                this.logger.warn(
                    `No raw material mapping found for product ID: ${detail.productId} with unit ID: ${detail.productUnitId}`
                );
                continue;
            }

            for (const rawMaterial of rawMaterialsPerUnit.rawMaterials) {
                const rawMaterialStock = await this.rawMaterialsStockDatabaseService.findRecordById(
                    rawMaterial.rawMaterialId
                );
                if (!rawMaterialStock || (rawMaterialStock.qty || 0) < rawMaterial.quantity) {
                    this.logger.log(
                        `Raw material ${rawMaterial.rawMaterialName} is below threshold. Creating purchase order.`
                    );
                    const rawMaterialPurchaseOrder: RawMaterialsPurchaseOrderDetailDto =
                        new RawMaterialsPurchaseOrderDetailDto();
                    rawMaterialPurchaseOrder.rawMaterialId = rawMaterial.rawMaterialId;
                    rawMaterialPurchaseOrder.rawMaterialName = rawMaterial.rawMaterialName;
                    rawMaterialPurchaseOrder.rawMaterialUnitId = rawMaterial.rawMaterialUnitId;
                    rawMaterialPurchaseOrder.rawMaterialUnitName = rawMaterial.rawMaterialUnitName;
                    rawMaterialPurchaseOrder.qty = rawMaterial.quantity * (detail.qty || 0);
                    rawMaterialToOrder.push(rawMaterialPurchaseOrder);
                } else {
                    this.logger.log(
                        `Raw material ${rawMaterial.rawMaterialName} has sufficient stock. No purchase order needed.`
                    );
                }
            }
        }

        if (rawMaterialToOrder.length > 0) {
            const rawMaterialsPurchaseOrderDto: RawMaterialsPurchaseOrderDto = {
                poDate: new Date().toISOString(),
                poStatus: RawMaterialsPurchaseOrderStatusEnum.SYSTEM_GENERATED,
                purchaseOrderDetails: rawMaterialToOrder,
            };

            //create the purchase order for the raw material
            await this.rawMaterialsPurchaseOrderDatabaseService.createRecord(rawMaterialsPurchaseOrderDto);
            this.logger.log(
                `Created purchase order for raw materials: ${rawMaterialToOrder
                    .map((rm) => rm.rawMaterialName)
                    .join(', ')}`
            );
        }
    }
}
