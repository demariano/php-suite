import { Test } from '@nestjs/testing';
import { AwsSnsLibService } from './aws-sns-lib.service';

describe('AwsSnsLibService', () => {
  let service: AwsSnsLibService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [AwsSnsLibService],
    }).compile();

    service = module.get(AwsSnsLibService);
  });

  it('should be defined', () => {
    expect(service).toBeTruthy();
  });
});
