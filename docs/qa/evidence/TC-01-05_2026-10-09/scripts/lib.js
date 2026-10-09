// Thư viện chung cho TC-01..05: HTTP có cookie jar, Prisma chỉ đọc, che dữ liệu nhạy cảm khi in.
const path = require('path');
const BACKEND = 'D:/P-010/backend';
require(path.join(BACKEND, 'node_modules/dotenv')).config({ path: path.join(BACKEND, '.env') });

const API = process.env.QA_API || 'http://localhost:4000/api/v1';
const PASSWORD = process.env.QA_PASSWORD; // truyền qua env, không ghi vào file

function prisma() {
  const { PrismaClient } = require(path.join(BACKEND, 'node_modules/@prisma/client'));
  return new PrismaClient();
}

class Client {
  constructor(name = 'anon') { this.name = name; this.cookies = {}; }
  cookieHeader() { return Object.entries(this.cookies).map(([k, v]) => `${k}=${v}`).join('; '); }
  async req(method, url, { body, headers = {}, raw = false } = {}) {
    const h = { ...headers };
    if (body !== undefined) h['Content-Type'] = 'application/json';
    const ck = this.cookieHeader();
    if (ck && !h.Cookie) h.Cookie = ck;
    const t0 = Date.now();
    const res = await fetch(url.startsWith('http') ? url : API + url, { method, headers: h, body: body === undefined ? undefined : JSON.stringify(body) });
    const ms = Date.now() - t0;
    for (const sc of res.headers.getSetCookie?.() ?? []) {
      const [kv] = sc.split(';');
      const i = kv.indexOf('=');
      const k = kv.slice(0, i), v = kv.slice(i + 1);
      if (v === '' || /Max-Age=0|Expires=Thu, 01 Jan 1970/i.test(sc)) delete this.cookies[k]; else this.cookies[k] = v;
    }
    const text = await res.text();
    let json = null;
    try { json = JSON.parse(text); } catch {}
    return { status: res.status, ms, json, text, setCookie: (res.headers.getSetCookie?.() ?? []).map((c) => c.split('=')[0]) };
  }
  get(u, o) { return this.req('GET', u, o); }
  post(u, b, o = {}) { return this.req('POST', u, { ...o, body: b }); }
  async login(email, portal) {
    const r = await this.post('/auth/login', { email, password: PASSWORD, portal });
    if (r.status !== 200) throw new Error(`login ${email} -> ${r.status} ${r.text.slice(0, 200)}`);
    return r;
  }
}

// Che token/devCode/actionToken khi in.
function redact(s) {
  return String(s)
    .replace(/("(?:devCode|actionToken|accessToken|token)"\s*:\s*")[^"]+"/g, '$1<che>"')
    .replace(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]*/g, '<jwt-che>');
}
const short = (r, n = 400) => `HTTP ${r.status} ${r.ms}ms · ${redact(r.text).slice(0, n)}`;

module.exports = { API, Client, prisma, redact, short, BACKEND };
