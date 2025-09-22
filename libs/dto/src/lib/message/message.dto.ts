export class MessageQueueDto<T> {
    referenceId: string;
    entityReferenceId: string
    data: T;
    action: string;
    entity: string;
    sessionId: string;


    constructor(referenceId: string, userData: T, action: string, entity: string, sessionId: string, entityReferenceId: string) {
        this.referenceId = referenceId;
        this.data = userData;
        this.action = action;
        this.entity = entity;
        this.sessionId = sessionId;
        this.entityReferenceId = entityReferenceId;
    }
}