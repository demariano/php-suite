import { Test } from '@nestjs/testing';
import { AwsCognitoLibService } from './aws-cognito-lib.service';

describe('AwsCognitoLibService', () => {
  let service: AwsCognitoLibService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [AwsCognitoLibService],
    }).compile();

    service = module.get(AwsCognitoLibService);
  });

  it('should be defined', () => {
    expect(service).toBeTruthy();
  });
});
