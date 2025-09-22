import { Entity } from "dynamodb-onetable";


export const EmailTemplateSchema = {
    version: '0.0.1',
    indexes: {
        primary: { hash: 'PK', sort: 'SK' },
        GSI1: { hash: 'GSI1PK'},
    },
    models: {
        EmailTemplate: {
            PK: { type: String, value: 'EMAIL_TEMPLATE' },
            SK: { type: String, value: '${emailTemplateId}' },
            emailTemplateId: { type: String, generate: 'ulid' },
            GSI1PK: { type: String, value: '${emailTemplateType}#${language}' }, //email type and language
            subject: { type: String },
            emailTemplateType: { type: String },
            language: { type: String },
            data: {
                type: Object,
                default: {},
                schema: {
                    htmlData: { type: String },
                    textData: { type: String }
                },
            }
        },
        
    } as const,
    params: {
        isoDates: true,
        timestamps: true,
    },
};

export type EmailTemplateDataType = Entity<typeof EmailTemplateSchema.models.EmailTemplate>;
