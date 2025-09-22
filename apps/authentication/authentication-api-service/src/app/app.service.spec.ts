import { Test } from '@nestjs/testing';

import { AppService } from './app.service';

describe('AppService', () => {
  let service: AppService;

  beforeAll(async () => {
    const app = await Test.createTestingModule({
      providers: [AppService],
    }).compile();

    service = app.get<AppService>(AppService);
  });

  describe('healthCheck', () => {
    it('should return health check data with status and version', () => {
      const result = service.healthCheck();
      expect(result).toHaveProperty('status', 'ok');
      expect(result).toHaveProperty('version');
      expect(typeof result.version).toBe('string');
    });
  });

  describe('getVersion', () => {
    it('should return version data', () => {
      const result = service.getVersion();
      expect(result).toHaveProperty('version');
      expect(typeof result.version).toBe('string');
    });
  });
});
