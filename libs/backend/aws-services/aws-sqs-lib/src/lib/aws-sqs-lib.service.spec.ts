import { Test } from '@nestjs/testing';
import { AwsSqsLibService } from './aws-sqs-lib.service';

describe('AwsSqsLibService', () => {
  let service: AwsSqsLibService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [AwsSqsLibService],
    }).compile();

    service = module.get(AwsSqsLibService);
  });

  it('should be defined', () => {
    expect(service).toBeTruthy();
  });
});
