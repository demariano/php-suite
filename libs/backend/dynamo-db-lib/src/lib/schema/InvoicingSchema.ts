import { Entity } from 'dynamodb-onetable';

export const InvoicingSchema = {
    version: '0.0.1',
    indexes: {
        primary: { hash: 'PK', sort: 'SK' },
        GSI1: { hash: 'GSI1PK', sort: 'GSI1SK' },
        GSI2: { hash: 'GSI2PK', sort: 'GSI2SK' },
    },
    models: {
        SalesType: {
            PK: { type: String, value: 'SALES_TYPE', hidden: false },
            SK: { type: String, value: '${salesTypeId}', hidden: false },
            status: {
                type: String,
                enum: ['ACTIVE', 'FOR_APPROVAL', 'FOR_DELETION', 'NEW_RECORD'],
                required: false,
            },
            salesTypeId: { type: String, generate: 'ulid' },
            salesTypeName: { type: String },
            allowDiscount: { type: Boolean, required: false },
            contractSales: { type: Boolean, required: false },
            defaultDiscount: { type: Number, required: false, default: 0 },
            defaultTax: { type: Number, required: false, default: 0 },
            incomeGenerating: { type: Boolean, required: false },
            taxable: { type: Boolean, required: false },
            activityLogs: { type: Array },
            forApprovalVersion: { type: Object },
            GSI1PK: { type: String, value: 'SALES_TYPE', hidden: false },
            GSI1SK: { type: String, value: '${salesTypeName}', hidden: false },
            GSI2PK: { type: String, value: 'SALES_TYPE#${status}', hidden: false },
            GSI2SK: { type: String, value: '${salesTypeName}', hidden: false },
        },
        TerritoryManager: {
            PK: { type: String, value: 'TerritoryManager', hidden: false },
            SK: { type: String, value: '${territoryManagerId}', hidden: false },
            territoryManagerId: { type: String, generate: 'ulid' },
            territoryManagerName: { type: String },
            activityLogs: { type: Array },
            forApprovalVersion: { type: Object },
            contactNo: { type: String, required: false },
            status: {
                type: String,
                enum: ['ACTIVE', 'FOR_APPROVAL', 'FOR_DELETION', 'NEW_RECORD'],
                required: false,
            },
            GSI1PK: { type: String, value: 'TerritoryManager', hidden: false },
            GSI1SK: { type: String, value: '${territoryManagerName}', hidden: false },
            GSI2PK: { type: String, value: 'TerritoryManager#${status}', hidden: false },
            GSI2SK: { type: String, value: '${territoryManagerName}', hidden: false },
        },
    } as const,
    params: {
        isoDates: true,
        timestamps: true,
    },
};

export type SalesTypeDataType = Entity<typeof InvoicingSchema.models.SalesType>;
export type TerritoryManagerDataType = Entity<typeof InvoicingSchema.models.TerritoryManager>;
