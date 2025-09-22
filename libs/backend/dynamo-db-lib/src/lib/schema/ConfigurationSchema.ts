import { Entity } from "dynamodb-onetable";


export const ConfigurationSchema = {
    version: '0.0.1',
    indexes: {
        primary: { hash: 'PK', sort: 'SK' },
        GSI1: { hash: 'GSI1PK', sort: 'GSI1SK' },
    },
    models: {
        Configuration: {
            PK: { type: String, value: 'CONFIGURATION' },
            SK: { type: String, value: '${configurationId}' },
            configurationId: { type: String, generate: 'ulid' },
            GSI1PK: { type: String, value: '${CONFIGURATION}' },
            GSI1SK: { type: String, value: '${configurationName}' },
            configurationName: { type: String },
            configurationValue: { type: String }

        },

    } as const,
    params: {
        isoDates: true,
        timestamps: true,
    },
};

export type ConfigurationDataType = Entity<typeof ConfigurationSchema.models.Configuration>;
