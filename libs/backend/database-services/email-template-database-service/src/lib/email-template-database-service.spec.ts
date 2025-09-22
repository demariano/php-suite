import { Test } from '@nestjs/testing';
import { EmailTemplateDatabaseService } from './email-template-database-service';

describe('EmailTemplateDatabaseService', () => {
  let service: EmailTemplateDatabaseService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [EmailTemplateDatabaseService],
    }).compile();

    service = module.get(EmailTemplateDatabaseService);
  });

  it('should be defined', () => {
    expect(service).toBeTruthy();
  });
});
