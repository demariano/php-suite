import { ResponseDto } from '@dto';


export abstract class MessageQueueServiceAbstract {


    abstract sendMessageToSQS(destination: string, message: string): Promise<ResponseDto<string>>;

}