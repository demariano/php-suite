import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { Test, TestingModule } from '@nestjs/testing';
import { RawMaterialUnitController } from './raw-material-unit.controller';

describe('RawMaterialUnitController', () => {
    let controller: RawMaterialUnitController;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [RawMaterialUnitController],
            providers: [CommandBus, QueryBus],
        }).compile();

        controller = module.get<RawMaterialUnitController>(RawMaterialUnitController);
    });

    it('should be defined', () => {
        expect(controller).toBeDefined();
    });
});
