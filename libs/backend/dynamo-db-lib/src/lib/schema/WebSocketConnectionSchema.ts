import { Entity } from "dynamodb-onetable";


export const WebSocketConnectionSchema = {
    version: '0.0.1',
    indexes: {
        primary: { hash: 'PK', sort: 'SK' },
        GSI1: { hash: 'GSI1PK', sort: 'GSI1SK' },
    },
    models: {
        WebSocketConnection: {
            PK: { type: String, value: 'WS_CONNECTION', hidden: false },
            SK: { type: String, value: '${connectionId}', hidden: false },
            connectionId: { type: String, required: true },
            userEmail: { type: String }, 
            connectedAt: { type: String, required: true },
            GSI1PK: { type: String, value: 'ACTIVE_CONNECTIONS', hidden: false },
            GSI1SK: { type: String, value: '${connectedAt}', hidden: false },
        },
    } as const,
    params: {
        isoDates: true,
        timestamps: true,
    },
};

export type WebSocketConnectionDataType = Entity<typeof WebSocketConnectionSchema.models.WebSocketConnection>;
