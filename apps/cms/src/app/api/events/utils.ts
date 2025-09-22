// eventHandler.ts
const clients: Array<ReadableStreamDefaultController<string>> = [];

export function addClient(controller: ReadableStreamDefaultController<string>) {
    clients.push(controller);
}

export function removeClient(controller: ReadableStreamDefaultController<string>) {
    const index = clients.indexOf(controller);
    if (index > -1) {
        clients.splice(index, 1);
    }
}

export function pushEvent(data: MessageEvent) {
    clients.forEach((client) => {
        try {
            client.enqueue(`data: ${JSON.stringify(data)}\n\n`);
        } catch (error) {
            console.error('Error pushing event to client:', error);
        }
    });
}

export function broadcastMessage(message: string) {
    // console.log("🚀 ~ broadcastMessage ~ message:", message)
    clients.forEach((client) => {
        try {
            client.enqueue(`data: ${message}\n\n`);
        } catch (error) {
            console.error('Error pushing event to client:', error);
        }
    });
}