import { Test, TestingModule } from '@nestjs/testing';
import { NodoController } from './nodo.controller';
import { NodoService } from './nodo.service';

describe('NodoController', () => {
  let nodoController: NodoController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [NodoController],
      providers: [NodoService],
    }).compile();

    nodoController = app.get<NodoController>(NodoController);
  });

  describe('root', () => {
    it('should return "Hello World!"', () => {
      expect(nodoController.getHello()).toBe('Hello World!');
    });
  });
});
