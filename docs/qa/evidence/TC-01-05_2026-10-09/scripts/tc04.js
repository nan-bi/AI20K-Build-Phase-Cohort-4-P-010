// TC-04 — Authentication & Authorization. Chỉ GET hoặc body rỗng; không tạo dữ liệu nghiệp vụ.
const path = require('path');
const { Client, short, BACKEND } = require('./lib');
const jwt = require(path.join(BACKEND, 'node_modules/jsonwebtoken'));
const ISS = 'vinstay-backend';
const SECRET = process.env.JWT_SECRET;
const ID = {
  tenant: 'ccfc8556-d877-490b-aa55-3ac106679422', landlord: '7ac495e0-e9b8-442e-94bc-ea544aca3b0e',
  host: 'e9cc29ee-d874-453d-9972-2c40d6d9b2cc', admin: 'd98025e4-5367-48d2-82f4-f9f7e861a545',
  contract: 'ce7dacb4-148c-4461-842a-8195c9cb0d82', signedDoc: '9aa2b1b6-eae5-4e9f-969c-aa63849bc6fe',
  otherUnit: 'aef63d32-456c-428e-a665-eb4fa1035857', ownRef: 'VS-WUKVH', otherRef: 'VS-7CDZT',
};
const M = [
  ['M1', 'GET', '/admin/field-hosts', ['admin']],
  ['M2', 'GET', '/admin/bi-funnel', ['admin']],
  ['M3', 'GET', '/landlord/units', ['landlord']],
  ['M4', 'GET', '/me/bookings', ['tenant']],
  ['M5', 'GET', '/host/board', ['host']],
  ['M6', 'GET', '/host/inspections', ['host']],
  ['M7', 'GET', `/contracts/${ID.signedDoc}/evidence-package`, ['admin']],
  ['M8', 'GET', '/host/earnings', ['host']],
  ['M9', 'GET', `/handovers/contracts/${ID.contract}`, ['tenant', 'landlord', 'admin']],
  ['M10', 'POST', '/handovers', ['host']],
];
const all = [];
const rec = (id, label, role, expected, r, pass) => { all.push(r.text); console.log(`${id} | ${label} | ${role} | ${expected} | ${short(r, 260)} | ${pass ? 'PASS' : 'FAIL'}`); };

(async () => {
  if (!SECRET || SECRET.length < 32) throw new Error('JWT_SECRET không đủ để tự ký token');
  const sign = (sub, email, opts = {}) => jwt.sign({ sub, email }, SECRET, { algorithm: 'HS256', issuer: ISS, expiresIn: 600, ...opts });
  const clients = { anon: new Client('anon') };
  for (const [role, email, portal] of [['tenant', 'khachthue.demo@vinstay.vn', 'tenant'], ['landlord', 'chunha.oceanpark@vinstay.vn', 'landlord'], ['admin', 'admin@vinstay.vn', 'admin']]) {
    clients[role] = new Client(role); await clients[role].login(email, portal);
  }
  // Host demo không đăng nhập được bằng mật khẩu đã cấp ⇒ dùng token tự ký đúng khoá cho profile Host demo.
  clients.host = new Client('host'); clients.host.cookies.vs_access = sign(ID.host, 'host.oceanpark@vinstay.vn');
  const call = (c, m, u) => (m === 'GET' ? c.get(u) : c.post(u, {}));

  for (const [id, m, u] of M) { const r = await call(clients.anon, m, u); rec(`1/${id}`, `${m} ${u}`, 'vô danh', '401', r, r.status === 401); }
  for (const [id, m, u, allowed] of M) {
    for (const role of ['tenant', 'landlord', 'host', 'admin']) {
      const r = await call(clients[role], m, u);
      const ok = allowed.includes(role);
      let pass;
      if (!ok) pass = r.status === 403;
      else if (id === 'M10') pass = r.status === 400; // body rỗng: qua xác thực, chặn ở validation
      else if (id === 'M9' && role !== 'admin') pass = [200, 403, 404].includes(r.status); // không phải bên của HĐ
      else pass = r.status >= 200 && r.status < 300;
      rec(`2/${id}`, `${m} ${u}`, role, ok ? (id === 'M10' ? '400 (qua auth)' : id === 'M9' && role !== 'admin' ? '200 rỗng/403/404' : '2xx') : '403', r, pass);
    }
  }
  const idor = [
    ['3/I0', 'tenant', `/bookings/${ID.ownRef}`, [200], 'lịch của mình (đối chứng)'],
    ['3/I1', 'tenant', `/bookings/${ID.otherRef}`, [403, 404], 'lịch của tenant khác'],
    ['3/I2', 'tenant', `/me/contracts/${ID.contract}/pdf`, [403, 404], 'HĐ không thuộc mình'],
    ['3/I3', 'landlord', `/landlord/units/${ID.otherUnit}`, [403, 404], 'căn của landlord khác'],
    ['3/I4', 'landlord', `/landlord/units/${ID.otherUnit}/viewings`, [403, 404], 'lịch xem căn của landlord khác'],
    ['3/I5', 'host', `/host/viewings/${ID.otherRef}`, [403, 404], 'ca của Host khác'],
  ];
  for (const [id, role, u, exp, label] of idor) { const r = await clients[role].get(u); rec(id, `GET ${u} (${label})`, role, exp.join('/'), r, exp.includes(r.status)); }

  const T = new Client('t');
  const probe = async (id, label, headers, exp) => { const r = await T.get('/me/bookings', { headers }); rec(`4/${id}`, label, 'token tự tạo', String(exp), r, r.status === exp); };
  const valid = sign(ID.tenant, 'khachthue.demo@vinstay.vn');
  await probe('T1', 'Bearer sai định dạng', { Authorization: 'Bearer abc.def' }, 401);
  await probe('T2', 'cookie sai định dạng', { Cookie: 'vs_access=not-a-jwt' }, 401);
  await probe('T3', 'ký bằng khoá sai', { Cookie: `vs_access=${jwt.sign({ sub: ID.tenant }, 'x'.repeat(40), { algorithm: 'HS256', issuer: ISS })}` }, 401);
  const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
  await probe('T4', 'alg=none', { Cookie: `vs_access=${b64({ alg: 'none', typ: 'JWT' })}.${b64({ sub: ID.tenant, iss: ISS, exp: Math.floor(Date.now() / 1000) + 600 })}.` }, 401);
  await probe('T5', 'hết hạn', { Cookie: `vs_access=${sign(ID.tenant, 'x', { expiresIn: -10 })}` }, 401);
  await probe('T6', 'sai issuer', { Cookie: `vs_access=${sign(ID.tenant, 'x', { issuer: 'supabase' })}` }, 401);
  await probe('T7', 'đối chứng: đúng khoá, còn hạn', { Cookie: `vs_access=${valid}` }, 200);
  await probe('T8', 'chỉ header x-demo-role: ops_admin', { 'x-demo-role': 'ops_admin' }, 401);
  const w = new Client('w');
  const r9 = await w.post('/auth/login', { email: 'khachthue.demo@vinstay.vn', password: process.env.QA_PASSWORD, portal: 'admin' });
  rec('4/T9', 'tenant đăng nhập portal=admin', 'tenant', '4xx, không cookie', r9, r9.status >= 400 && r9.status < 500 && !r9.setCookie.includes('vs_access'));
  console.log(`   T9 cookie_set=${r9.setCookie.includes('vs_access')}`);

  const leaks = all.filter((t) => /\bat [\w.<>]+ \(|\.ts:\d+|node_modules|PrismaClient|stack/i.test(t));
  console.log(`5 | Số response chứa dấu hiệu stack trace/thông tin nội bộ: ${leaks.length} | ${leaks.length ? 'FAIL' : 'PASS'}`);
  const total = all.length;
  console.log(`TOTAL responses=${total}`);
})().catch((e) => { console.error('ERR', e.message); process.exit(1); });
