import { ContractEventEnum } from '../../enums/contract.event.enum';

export interface ContractEventDto {
    contractId: string;
    newContractName: string;
    eventType: ContractEventEnum;
    timestamp: string;
}

export interface ContractUpdatedEvent {
    contractId: string;
    newContractName: string;
}
