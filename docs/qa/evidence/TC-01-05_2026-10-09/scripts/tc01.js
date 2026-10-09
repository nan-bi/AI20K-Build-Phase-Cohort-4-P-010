// TC-01 — Tìm kiếm & lọc căn hộ. API chỉ GET; DB chỉ findMany.
const { Client, prisma, short } = require('./lib');
const ZONE = { sapphire2: ['S2.01', 'S2.02', 'S2.05', 'S2.07', 'S2.09', 'S2.12', 'S2.16', 'S2.18', 'S2.19'] };

(async () => {
  const db = prisma();
  const base = { isVerified: true, status: 'AVAILABLE', media: { some: { url: { startsWith: '/' } } } };
  const twoPN = { in: ['TWO_BED_ONE_BATH', 'TWO_BED_TWO_BATH'] };
  const q = (extra) => db.unit.findMany({ where: { ...base, ...extra }, select: { unitCode: true } }).then((r) => r.map((x) => x.unitCode).sort());
  const exp = {
    all: await q({}),
    zone: await q({ building: { buildingCode: { in: ZONE.sapphire2 } } }),
    layout: await q({ layoutType: twoPN }),
    rent: await q({ baseRentPrice: { lte: 8000000 } }),
    combo: await q({ building: { buildingCode: { in: ZONE.sapphire2 } }, layoutType: twoPN }),
    empty: await q({ baseRentPrice: { lte: 1000 } }),
  };
  console.log('[DB expected]', Object.entries(exp).map(([k, v]) => `${k}=${v.length}`).join(' '));
  await db.$disconnect();

  const c = new Client();
  const check = async (step, query, expected, pred) => {
    const r = await c.get('/properties/units' + query);
    const data = r.json?.data ?? [];
    const codes = data.map((u) => u.code).sort();
    const viol = data.filter((u) => !pred(u)).map((u) => u.code);
    const missing = expected.filter((x) => !codes.includes(x));
    const extra = codes.filter((x) => !expected.includes(x));
    const pass = r.status === 200 && codes.length === expected.length && !viol.length && !missing.length && !extra.length;
    console.log(`${step} | GET /properties/units${query} | HTTP ${r.status} ${r.ms}ms | count=${codes.length} expected=${expected.length} predicateViolations=${JSON.stringify(viol)} missing=${JSON.stringify(missing)} extra=${JSON.stringify(extra)} | ${pass ? 'PASS' : 'FAIL'}`);
    return data;
  };
  await check('1', '', exp.all, (u) => u.status === 'available');
  await check('2a', '?zone=sapphire2', exp.zone, (u) => ZONE.sapphire2.some((b) => u.code.includes(`-${b}-`)));
  await check('2b', '?layout=2PN', exp.layout, (u) => u.layout === '2PN');
  await check('2c', '?maxRent=8000000', exp.rent, (u) => u.rent <= 8000000);
  const combo = await check('3', '?zone=sapphire2&layout=2PN', exp.combo, (u) => u.layout === '2PN' && ZONE.sapphire2.some((b) => u.code.includes(`-${b}-`)));
  console.log('   combo codes:', combo.map((u) => u.code).join(','));
  for (const [step, qs] of [['4', '?maxRent=1000'], ['5a', '?maxRent=-1'], ['5b', '?maxRent=abc'], ['5c', '?maxAllInCost=-5'], ['5d', '?occupants=-3']]) {
    const r = await c.get('/properties/units' + qs);
    console.log(`${step} | GET /properties/units${qs} | ${short(r, 300)}`);
  }
})().catch((e) => { console.error('ERR', e.message); process.exit(1); });
