import { Injectable } from "@nestjs/common";

@Injectable()
export class MessageHandlerService {

    // eslint-disable-next-line @typescript-eslint/no-empty-function
    constructor() { }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async handleMessage(message: any) {
        console.log(message);
    }
}
