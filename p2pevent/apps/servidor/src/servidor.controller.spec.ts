import { Test, TestingModule } from '@nestjs/testing';
import { ServidorController } from './servidor.controller';
import { ServidorService } from './servidor.service';

describe('ServidorController', () => {
  let servidorController: ServidorController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [ServidorController],
      providers: [ServidorService],
    }).compile();

    servidorController = app.get<ServidorController>(ServidorController);
  });

  describe('root', () => {
    it('should return "Hello World!"', () => {
      expect(servidorController.getHello()).toBe('Hello World!');
    });
  });
});
