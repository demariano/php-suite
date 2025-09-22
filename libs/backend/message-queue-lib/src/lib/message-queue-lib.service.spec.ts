import { Test } from '@nestjs/testing';
import { MessageQueueLibService } from './message-queue-aws-lib.service';

describe('MessageQueueLibService', () => {
  let service: MessageQueueLibService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [MessageQueueLibService],
    }).compile();

    service = module.get(MessageQueueLibService);
  });

  it('should be defined', () => {
    expect(service).toBeTruthy();
  });
});
