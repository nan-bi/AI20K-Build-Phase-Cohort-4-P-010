import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { MatchmakerRequestDto } from './dto/matchmaker-request.dto';
import { MatchmakerService } from './matchmaker.service';

const mkUnit = (i: number) => ({
  id: `u${i}`,
  code: `VHOP-T-${String(i).padStart(4, '0')}`,
  building: 'S1.02',
  zoneName: 'S1',
  layout: 'STUDIO',
  areaM2: 30,
  rent: 6_000_000 + i * 100_000,
  managementFee: 300_000,
  marketAvg: 8_000_000,
  photos: [],
});

function makeService(n: number) {
  const units = Array.from({ length: n }, (_, i) => mkUnit(i + 1));
  const prisma = {} as any;
  const property = { getUnits: jest.fn().mockResolvedValue(units) } as any;
  return new MatchmakerService(prisma, property);
}

const body = (extra: object = {}) => plainToInstance(MatchmakerRequestDto, { maxAllInBudget: 30_000_000, ...extra });

describe('MatchmakerService limit / totalMatched', () => {
  it('mặc định limit = 3, totalMatched = số căn khớp trước khi cắt', async () => {
    const res = await makeService(8).findTopRecommendations(body());
    expect(res.topRecommendations).toHaveLength(3);
    expect(res.scanSummary.totalMatched).toBe(8);
    expect(res.scanSummary.matchedUnits).toBe(3);
    expect(res.scanSummary.totalScannedUnits).toBe(8);
  });

  it('limit=20 trả nhiều hơn 3, giữ thứ tự xếp hạng', async () => {
    const res = await makeService(8).findTopRecommendations(body({ limit: 20 }));
    expect(res.topRecommendations).toHaveLength(8);
    expect(res.scanSummary.totalMatched).toBe(8);
    expect(res.topRecommendations.map((r) => r.rank)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
  });

  it('totalMatched chỉ đếm căn không vượt ngân sách', async () => {
    const res = await makeService(8).findTopRecommendations(body({ limit: 20, maxAllInBudget: 7_700_000 }));
    expect(res.scanSummary.totalMatched).toBe(res.topRecommendations.length);
    expect(res.scanSummary.totalMatched).toBeLessThan(8);
  });
});

describe('MatchmakerRequestDto limit validation', () => {
  it.each([0, 51, 1.5, 'abc'])('limit=%p bị từ chối', async (limit) => {
    const errs = await validate(body({ limit }));
    expect(errs.map((e) => e.property)).toContain('limit');
  });
  it.each([undefined, 1, 20, 50])('limit=%p hợp lệ', async (limit) => {
    expect(await validate(body({ limit }))).toHaveLength(0);
  });
});
