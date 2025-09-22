import { Injectable } from "@nestjs/common";

@Injectable()
export class MessageHandlerService {

    // eslint-disable-next-line @typescript-eslint/no-empty-function
    constructor() { }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async handleMessage(message: any) {
        console.log(message);

        //process ung message from the client 

        //raise and event depending on message type / content

        //send message to client via SQS to broadcast-message-service
    }
}
