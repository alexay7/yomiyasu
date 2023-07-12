import { Test, TestingModule } from '@nestjs/testing';
import { ReadprogressService } from './readprogress.service';

describe('ReadprogressService', () => {
  let service: ReadprogressService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ReadprogressService],
    }).compile();

    service = module.get<ReadprogressService>(ReadprogressService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
