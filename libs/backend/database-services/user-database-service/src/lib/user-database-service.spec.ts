import { Test } from '@nestjs/testing';
import { UserDatabaseServiceService } from './user-database-service';

describe('UserDatabaseServiceService', () => {
  let service: UserDatabaseServiceService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [UserDatabaseServiceService],
    }).compile();

    service = module.get(UserDatabaseServiceService);
  });

  it('should be defined', () => {
    expect(service).toBeTruthy();
  });
});
