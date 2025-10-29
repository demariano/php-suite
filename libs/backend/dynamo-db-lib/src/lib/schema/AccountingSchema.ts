import { Entity } from 'dynamodb-onetable';

export const AccountingSchema = {
    version: '0.0.1',
    indexes: {
        primary: { hash: 'PK', sort: 'SK' },
        GSI1: { hash: 'GSI1PK', sort: 'GSI1SK' },
        GSI2: { hash: 'GSI2PK', sort: 'GSI2SK' },
        GSI3: { hash: 'GSI3PK', sort: 'GSI3SK' },
        GSI4: { hash: 'GSI4PK', sort: 'GSI4SK' },
        GSI5: { hash: 'GSI5PK', sort: 'GSI5SK' },
        GSI6: { hash: 'GSI6PK', sort: 'GSI6SK' },
    },
    models: {
        Accounts: {
            PK: { type: String, value: 'ACCOUNTS', hidden: false },
            SK: { type: String, value: '${accountingId}', hidden: false },
            accountName: { type: String },
            accountType: {
                type: String,
                enum: ['AREA', 'CUSTOMER', 'OTHERS'],
                required: false,
            },
            status: {
                type: String,
                enum: ['ACTIVE', 'FOR_APPROVAL', 'FOR_DELETION', 'NEW_RECORD', 'DRAFT'],
                required: false,
            },
            activityLogs: { type: Array },
            forApprovalVersion: { type: Object },
            subAccounts: { type: Array },
            accountingId: { type: String, generate: 'ulid' },
            changeReason: { type: String, required: false },
            GSI1PK: { type: String, value: 'ACCOUNTS', hidden: false },
            GSI1SK: { type: String, value: '${accountName}', hidden: false },
            GSI2PK: { type: String, value: 'ACCOUNTS#${status}', hidden: false },
            GSI2SK: { type: String, value: '${accountName}', hidden: false },
            GSI3PK: { type: String, value: 'ACCOUNTS#${accountType}', hidden: false },
            GSI3SK: { type: String, value: '${accountName}', hidden: false },
            GSI4PK: { type: String, value: 'ACCOUNTS#${accountType}#${status}', hidden: false },
            GSI4SK: { type: String, value: '${accountName}', hidden: false },
        },
    } as const,
    params: {
        isoDates: true,
        timestamps: true,
    },
};

export type AccountsDataType = Entity<typeof AccountingSchema.models.Accounts>;
