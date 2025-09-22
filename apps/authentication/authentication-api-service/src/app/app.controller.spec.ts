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
    it('should return health check data', () => {
      const appController = app.get<AppController>(AppController);
      const result = appController.healthCheck();
      expect(result).toBeDefined();
    });
  });

  describe('getVersion', () => {
    it('should return version data', () => {
      const appController = app.get<AppController>(AppController);
      const result = appController.getVersion();
      expect(result).toBeDefined();
    });
  });
});
