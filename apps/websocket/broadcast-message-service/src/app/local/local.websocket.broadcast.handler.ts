import { BroadcastMessageDto } from "@dto";
import { Injectable } from "@nestjs/common";

@Injectable()
export class LocalWebsocketBroadcastHandler {


    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async handleMessage(message: any) {
        const broadcastMessageDto: BroadcastMessageDto = JSON.parse(message);

        console.log(broadcastMessageDto);

        //sending the message to the connect-service as this is the websocket server where the client is connected

        const connectServiceUrl = process.env.LOCALSTACK_WEBSOCKET_CONNECT_SERVICE_URL;

        if (connectServiceUrl) {
            const response = await fetch(connectServiceUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(broadcastMessageDto),
            });
            console.log(response);
        } else {
            console.log('No connect service url found');
        }

    }
}
