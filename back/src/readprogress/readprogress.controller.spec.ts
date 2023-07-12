import { Test, TestingModule } from '@nestjs/testing';
import { ReadprogressController } from './readprogress.controller';
import { ReadprogressService } from './readprogress.service';

describe('ReadprogressController', () => {
  let controller: ReadprogressController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ReadprogressController],
      providers: [ReadprogressService],
    }).compile();

    controller = module.get<ReadprogressController>(ReadprogressController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
