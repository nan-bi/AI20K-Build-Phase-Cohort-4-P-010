import { CATALOG_CACHE_MS, PropertyService } from './property.service';

describe('PropertyService.getUnits cache', () => {
  const make = () => {
    const findMany = jest.fn().mockResolvedValue([]);
    const svc = new PropertyService({ unit: { findMany } } as never);
    return { svc, findMany };
  };

  afterEach(() => jest.useRealTimers());

  it('cùng bộ lọc trong thời gian giữ ⇒ chỉ đọc DB một lần', async () => {
    const { svc, findMany } = make();
    await svc.getUnits({ layout: 'Studio' } as never);
    await svc.getUnits({ layout: 'Studio' } as never);
    expect(findMany).toHaveBeenCalledTimes(1);
  });

  it('thứ tự khoá bộ lọc không làm lệch cache; bộ lọc khác ⇒ đọc lại', async () => {
    const { svc, findMany } = make();
    await svc.getUnits({ layout: 'Studio', zone: 'S1' } as never);
    await svc.getUnits({ zone: 'S1', layout: 'Studio' } as never);
    expect(findMany).toHaveBeenCalledTimes(1);
    await svc.getUnits({ layout: '1PN' } as never);
    expect(findMany).toHaveBeenCalledTimes(2);
  });

  it('hết hạn ⇒ đọc lại; clearCatalogCache xoá ngay', async () => {
    jest.useFakeTimers();
    const { svc, findMany } = make();
    await svc.getUnits({} as never);
    jest.setSystemTime(Date.now() + CATALOG_CACHE_MS + 1);
    await svc.getUnits({} as never);
    expect(findMany).toHaveBeenCalledTimes(2);
    svc.clearCatalogCache();
    await svc.getUnits({} as never);
    expect(findMany).toHaveBeenCalledTimes(3);
  });
});
