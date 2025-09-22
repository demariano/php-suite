import { Test, TestingModule } from '@nestjs/testing';

import { AppController } from './app.controller';
import { AppService } from './app.service';

describe('AppController', () => {
  let app: TestingModule;

  beforeAll(async () => {
    app = await Test.createTestingModule({
      controllers: [AppController],
      providers: [AppService],
    }).compile();
  });

  describe('healthCheck', () => {
    it('should return health status with version', () => {
      const appController = app.get<AppController>(AppController);
      const result = appController.healthCheck();
      expect(result).toHaveProperty('status');
      expect(result).toHaveProperty('version');
      expect(result.status).toBe('ok');
    });
  });

  describe('getVersion', () => {
    it('should return version info', () => {
      const appController = app.get<AppController>(AppController);
      const result = appController.getVersion();
      expect(result).toHaveProperty('version');
      expect(typeof result.version).toBe('string');
    });
  });
});
