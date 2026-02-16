import { Entity } from 'dynamodb-onetable';

export const ReportSchema = {
    version: '0.0.1',
    indexes: {
        primary: { hash: 'PK', sort: 'SK' },
        GSI1: { hash: 'GSI1PK', sort: 'GSI1SK' },
        GSI2: { hash: 'GSI2PK', sort: 'GSI2SK' },
    },
    models: {
        Reports: {
            PK: { type: String, value: 'REPORTS', hidden: false },
            SK: { type: String, value: '${reportId}', hidden: false },
            reportId: { type: String, generate: 'ulid' },
            reportName: { type: String },
            reportFilename: { type: String },
            reportType: { type: String },
            createdBy: { type: String },
            dateCreated: { type: String },
            status: {
                type: String,
                enum: ['READY', 'IN_PROGRESS', 'FAILED'],
                required: false,
            },
            errorMessage: { type: String, required: false },
            fileDetails: {
                type: Object,
                properties: {
                    filename: { type: String },
                    bucket: { type: String },
                    key: { type: String },
                    fileType: { type: String },
                },
                required: false,
            },
            filters: {
                type: Object,
                required: false,
            },
            dateRange: { type: String },
            GSI1PK: { type: String, value: 'REPORTS', hidden: false },
            GSI1SK: { type: String, value: '${dateCreated}', hidden: false },
            GSI2PK: { type: String, value: 'REPORT_TYPE#${reportType}', hidden: false },
            GSI2SK: { type: String, value: '${dateCreated}', hidden: false },
        },
    } as const,
    params: {
        isoDates: true,
        timestamps: true,
    },
};

export type ReportsDataType = Entity<typeof ReportSchema.models.Reports>;
