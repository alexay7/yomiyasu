import { Test, TestingModule } from '@nestjs/testing';
import { SeriesprogressService } from './seriesprogress.service';

describe('SeriesprogressService', () => {
  let service: SeriesprogressService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SeriesprogressService],
    }).compile();

    service = module.get<SeriesprogressService>(SeriesprogressService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
