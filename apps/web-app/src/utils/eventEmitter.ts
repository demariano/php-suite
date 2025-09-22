/* eslint-disable @typescript-eslint/no-explicit-any */
type EventName = string;
type EventCallback = (data?: any) => void;

export const EventEmitter = {
    events: {
        RemoveEventReference: 'onRemoveEventReference',
    } as const,
    eventCallbacks: {} as Record<EventName, EventCallback[]>,
    subscribe(event: EventName, callback: EventCallback) {
        if (!this.eventCallbacks[event]) this.eventCallbacks[event] = [];
        this.eventCallbacks[event].push(callback);
    },
    dispatch(event: EventName, data?: any) {
        if (!this.eventCallbacks[event]) return;
        this.eventCallbacks[event].forEach((callback) => callback(data));
    },
    unsubscribe(event: EventName) {
        if (!this.eventCallbacks[event]) return;
        this.eventCallbacks[event] = [];
    },
};