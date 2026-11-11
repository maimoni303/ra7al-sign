// اختبار شامل لخادم رحّال للتوقيع: الدخول، مفتاح آبل، الشهادة، تسجيل الأجهزة، الرفع، التوقيع، التثبيت، العائلة، الوضع اليدوي
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn, execFileSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import { fileURLToPath } from 'node:url';
import { startMockAsc } from './mock-asc.mjs';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'ra7alsign-'));
const PORT = 18000 + Math.floor(Math.random() * 1000);
const BASE = `http://127.0.0.1:${PORT}`;
const ZLOG = path.join(TMP, 'zsign.log');
let srv, mock, cookie = '', hookGot = [], hook;
const { publicKey, privateKey } = crypto.generateKeyPairSync('ec', { namedCurve: 'P-256' });
const P8 = privateKey.export({ type: 'pkcs8', format: 'pem' });
const KEY = { issuerId: '57246542-96fe-1a63-e053-0824d011072a', keyId: 'ABCDE12345' };

async function call(p, { method, body, form, raw, headers = {}, jar = true } = {}) {
  if (process.env.TDEBUG) console.error('CALL', method || '', p);
  const h = { ...headers }; if (jar && cookie) h.cookie = cookie;
  let b;
  if (form) { b = form; } else if (raw) { b = raw; } else if (body !== undefined) { b = JSON.stringify(body); h['content-type'] = 'application/json'; }
  const r = await fetch(BASE + p, { method: method || (b ? 'POST' : 'GET'), headers: h, body: b, redirect: 'manual' });
  const sc = r.headers.get('set-cookie'); if (jar && sc) cookie = sc.split(';')[0];
  const ct = r.headers.get('content-type') || '';
  const data = ct.includes('json') ? await r.json() : Buffer.from(await r.arrayBuffer());
  return { status: r.status, data, headers: r.headers };
}
function makeIpa(name, bundleId, version = '2.3') {
  const d = fs.mkdtempSync(path.join(TMP, 'ipa-')), app = path.join(d, 'Payload', `${name}.app`);
  fs.mkdirSync(app, { recursive: true });
  fs.writeFileSync(path.join(app, 'Info.plist'), `<?xml version="1.0" encoding="UTF-8"?><plist version="1.0"><dict><key>CFBundleIdentifier</key><string>${bundleId}</string><key>CFBundleDisplayName</key><string>${name}</string><key>CFBundleShortVersionString</key><string>${version}</string><key>CFBundleVersion</key><string>45</string><key>MinimumOSVersion</key><string>15.0</string></dict></plist>`);
  fs.writeFileSync(path.join(app, name), crypto.randomBytes(4096));
  const out = path.join(TMP, `${name}-${Date.now()}.ipa`);
  execFileSync('zip', ['-qr', out, 'Payload'], { cwd: d });
  return out;
}
function formWith(field, file, filename) { const fd = new FormData(); fd.append(field, new Blob([fs.readFileSync(file)]), filename || path.basename(file)); return fd; }
async function waitJob(id) { for (let i = 0; i < 100; i++) { const r = await call(`/api/jobs/${id}`); if (r.data.state === 'done' || r.data.state === 'error') return r.data; await new Promise((x) => setTimeout(x, 100)); } throw new Error('job timeout'); }
async function until(fn, ms = 8000) { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (await fn()) return true; await new Promise((x) => setTimeout(x, 150)); } return false; }

before(async () => {
  mock = await startMockAsc({ publicKey, ...KEY });
  hook = http.createServer((req, res) => { let b = ''; req.on('data', (c) => (b += c)); req.on('end', () => { hookGot.push(JSON.parse(b)); res.end('ok'); }); }).listen(0);
  srv = spawn(process.execPath, ['server/index.js'], { cwd: ROOT, env: { ...process.env, PORT: String(PORT), DATA_DIR: path.join(TMP, 'data'), ZSIGN_BIN: path.join(ROOT, 'tests/fake-zsign.mjs'), FAKE_ZSIGN_LOG: ZLOG, ASC_BASE: mock.url, PUBLIC_URL: 'https://sign.example.ts.net' }, stdio: ['ignore', 'pipe', 'pipe'] });
  srv.stderr.on('data', (d) => process.stderr.write('[srv] ' + d));
  await until(async () => { try { return (await fetch(BASE + '/api/ping')).ok; } catch { return false; } });
});
after(() => { srv && srv.kill(); mock && mock.close(); hook && hook.close(); });

test('setup and login', async () => {
  assert.equal((await call('/api/boot')).data.setup, true);
  assert.equal((await call('/api/state', { jar: false })).status, 401);
  assert.equal((await call('/api/setup', { body: { password: 'short' } })).status, 400);
  const r = await call('/api/setup', { body: { password: 'Ra7al-Test-2026' } });
  assert.equal(r.status, 200); assert.ok(cookie.startsWith('rs='));
  assert.equal((await call('/api/setup', { body: { password: 'another-one-9' } })).status, 409);
  const st = await call('/api/state'); assert.equal(st.status, 200); assert.equal(st.data.ready, false); assert.equal(st.data.https, true);
  const saved = cookie; cookie = '';
  assert.equal((await call('/api/login', { body: { password: 'wrong-pass' } })).status, 401);
  assert.equal((await call('/api/login', { body: { password: 'Ra7al-Test-2026' } })).status, 200);
  assert.notEqual(cookie, saved);
});

test('static files and traversal protection', async () => {
  const r = await call('/'); assert.equal(r.status, 200); assert.match(r.data.toString(), /رحّال للتوقيع/);
  assert.equal((await call('/app.js')).status, 200);
  assert.equal((await call('/f')).status, 200);
  assert.equal((await call('/../server/store.js')).status, 404);
  assert.equal((await call('/%2e%2e/package.json')).status, 404);
  assert.equal((await call('/api/nope')).status, 404);
});

test('App Store Connect key validation and certificate creation', async () => {
  assert.equal((await call('/api/asc-key', { body: { ...KEY, issuerId: 'x', p8: P8 } })).data.error, 'issuer');
  assert.equal((await call('/api/asc-key', { body: { ...KEY, keyId: 'abc', p8: P8 } })).data.error, 'keyid');
  assert.equal((await call('/api/asc-key', { body: { ...KEY, p8: 'not a key' } })).data.error, 'p8');
  const other = crypto.generateKeyPairSync('ec', { namedCurve: 'P-256' }).privateKey.export({ type: 'pkcs8', format: 'pem' });
  const bad = await call('/api/asc-key', { body: { ...KEY, p8: other } });
  assert.equal(bad.status, 400); assert.match(bad.data.error, /apple/);
  const r = await call('/api/asc-key', { body: { ...KEY, p8: P8 } });
  assert.equal(r.status, 200, JSON.stringify(r.data));
  const st = (await call('/api/state')).data;
  assert.equal(st.asc.keyId, KEY.keyId); assert.equal(st.cert.source, 'asc'); assert.match(st.cert.name, /Distribution/);
  assert.ok(st.cert.expires > Date.now()); assert.equal(st.cert.p12Pass, undefined);
  assert.equal(mock.st.certs.length, 1);
  assert.ok(!JSON.stringify(st).includes('PRIVATE KEY'), 'private key must never be sent to the browser');
});

let enrollTok;
test('family device enrollment via profile', async () => {
  const r = await call('/api/enroll', { body: { name: 'جوالي' } });
  assert.equal(r.status, 200); enrollTok = r.data.token;
  assert.equal(r.data.url, `https://sign.example.ts.net/e/${enrollTok}`);
  const pageR = await call(`/e/${enrollTok}`, { jar: false }); assert.equal(pageR.status, 200); assert.match(pageR.data.toString(), /جوالي/);
  const mc = await call(`/e/${enrollTok}/profile.mobileconfig`, { jar: false });
  assert.equal(mc.headers.get('content-type'), 'application/x-apple-aspen-config');
  assert.match(mc.data.toString(), new RegExp(`https://sign.example.ts.net/e/${enrollTok}/cb`));
  assert.match(mc.data.toString(), /Profile Service/);
  const udid = '00008140-001A2B3C4D5E6F70';
  const signed = Buffer.concat([Buffer.from([0x30, 0x82, 1, 2, 3]), Buffer.from(`<?xml version="1.0" encoding="UTF-8"?><plist version="1.0"><dict><key>PRODUCT</key><string>iPhone18,2</string><key>UDID</key><string>${udid}</string><key>VERSION</key><string>23A</string><key>CHALLENGE</key><string>${enrollTok}</string></dict></plist>`), Buffer.from([0, 0])]);
  const cb = await call(`/e/${enrollTok}/cb`, { raw: signed, jar: false, headers: { 'content-type': 'application/pkcs7-signature' } });
  assert.equal(cb.status, 301); assert.equal(cb.headers.get('location'), `https://sign.example.ts.net/e/${enrollTok}/done`);
  assert.equal((await call(`/e/${enrollTok}/cb`, { raw: signed, jar: false })).status, 410, 'link is single-use');
  assert.equal((await call(`/e/${enrollTok}`, { jar: false })).status, 404);
  assert.ok(await until(async () => (await call('/api/state')).data.ready));
  const st = (await call('/api/state')).data;
  assert.equal(st.devices.length, 1); assert.equal(st.devices[0].name, 'جوالي'); assert.equal(st.devices[0].model, 'iPhone');
  assert.deepEqual(st.profile.devices, [udid]); assert.equal(st.profile.bundlePattern, 'com.ra7al.sign.*');
  assert.equal(st.enrollments.length, 0);
  assert.equal((await call('/e/../cb', { jar: false })).status, 404);
});

let appId;
test('upload IPA, sign, install manifest and download', async () => {
  const bad = await call('/api/upload', { form: formWith('ipa', path.join(ROOT, 'package.json'), 'x.ipa') });
  assert.equal(bad.status, 400);
  const ipa = makeIpa('Test App', 'com.test.app');
  const up = await call('/api/upload', { form: formWith('ipa', ipa) });
  assert.equal(up.status, 200, JSON.stringify(up.data));
  assert.equal(up.data.bundleId, 'com.test.app'); assert.equal(up.data.name, 'Test App'); assert.equal(up.data.version, '2.3');
  const s = await call('/api/sign', { body: { uploadId: up.data.uploadId, name: 'تطبيقي', rmExtensions: true } });
  const job = await waitJob(s.data.job);
  assert.equal(job.state, 'done', job.msg); appId = job.result.appId;
  const args = JSON.parse(fs.readFileSync(ZLOG, 'utf8').trim().split('\n').pop());
  assert.equal(args[args.indexOf('-b') + 1], 'com.ra7al.sign.com-test-app');
  assert.equal(args[args.indexOf('-n') + 1], 'تطبيقي');
  assert.ok(args.includes('-E') && args.includes('-W') && args.includes('-c'));
  const st = (await call('/api/state')).data;
  const a = st.apps.find((x) => x.id === appId);
  assert.equal(a.name, 'تطبيقي'); assert.equal(a.needsResign, false); assert.ok(a.icon);
  assert.match(a.install, /^itms-services:\/\/\?action=download-manifest&url=https%3A%2F%2Fsign\.example\.ts\.net%2Fi%2F/);
  const manUrl = decodeURIComponent(a.install.split('url=')[1]).replace('https://sign.example.ts.net', '');
  const man = await call(manUrl, { jar: false });
  assert.equal(man.status, 200); const x = man.data.toString();
  assert.match(x, /software-package/); assert.match(x, /com\.ra7al\.sign\.com-test-app/); assert.match(x, /تطبيقي/);
  assert.equal((await call(`/i/${appId}/manifest.plist?k=AAAAAAAAAAAAAAAAAAAAAA`, { jar: false })).status, 403);
  assert.equal((await call(`/i/${appId}/manifest.plist`, { jar: false })).status, 403);
  const ipaUrl = x.match(/<string>(https:[^<]+app\.ipa[^<]*)<\/string>/)[1].replace(/&amp;/g, '&').replace('https://sign.example.ts.net', '');
  const dl = await call(ipaUrl, { jar: false });
  assert.equal(dl.status, 200); assert.equal(dl.data.length, fs.statSync(ipa).size);
  assert.equal((await call(a.icon, { jar: false })).status, 200);
});

test('adding a device rebuilds profile and auto re-signs', async () => {
  const before = (await call('/api/state')).data.profile.uuid;
  assert.equal((await call('/api/devices/add', { body: { name: 'x', udid: 'bad' } })).status, 400);
  const r = await call('/api/devices/add', { body: { name: 'جهاز ١', udid: '00008110-000A11B22C33D44E' } });
  assert.equal(r.status, 200, JSON.stringify(r.data));
  assert.ok(await until(async () => { const st = (await call('/api/state')).data; return st.profile.uuid !== before && st.profile.devices.length === 2 && st.apps.every((a) => !a.needsResign); }), 'profile rebuilt and apps re-signed');
  assert.equal(mock.st.profiles.length, 1, 'old profile deleted at Apple');
});

test('rename and disable device', async () => {
  const st = (await call('/api/state')).data; const d = st.devices[1];
  assert.equal((await call(`/api/devices/${d.id}`, { body: { name: 'جوال الوالدة' } })).status, 200);
  assert.equal((await call(`/api/devices/${d.id}`, { body: { enabled: false } })).status, 200);
  const st2 = (await call('/api/state')).data;
  assert.equal(st2.devices[1].name, 'جوال الوالدة'); assert.equal(st2.devices[1].status, 'disabled'); assert.equal(st2.profile.devices.length, 1);
  assert.equal((await call(`/api/devices/${d.id}`, { body: { enabled: true } })).status, 200);
  assert.equal((await call('/api/state')).data.profile.devices.length, 2);
});

test('Apple TV and other non-iOS devices are left out of the iOS profile', async () => {
  mock.st.devices.push({ type: 'devices', id: 'TV1', attributes: { name: 'Apple TV', udid: 'aaaabbbbccccddddeeeeffff0000111122223333', platform: 'IOS', status: 'ENABLED', deviceClass: 'APPLE_TV', model: 'Apple TV (4th generation)', addedDate: new Date().toISOString() } });
  const r = await call('/api/profile/rebuild', { body: {} });
  assert.equal(r.status, 200, JSON.stringify(r.data));
  const st = (await call('/api/state')).data;
  assert.ok(st.devices.some((d) => d.cls === 'APPLE_TV'), 'Apple TV still listed');
  assert.ok(!st.profile.devices.includes('aaaabbbbccccddddeeeeffff0000111122223333'), 'Apple TV not in profile');
  assert.ok(st.ready);
  mock.st.devices = mock.st.devices.filter((d) => d.id !== 'TV1');
  await call('/api/devices/sync', { body: {} });
});

test('family access is limited to installing', async () => {
  const admin = cookie;
  cookie = ''; assert.equal((await call('/api/family/state')).status, 401);
  assert.equal((await call('/api/login', { body: { password: 'anything', family: true } })).status, 401);
  cookie = admin; assert.equal((await call('/api/family-password', { body: { password: '123' } })).status, 400);
  assert.equal((await call('/api/family-password', { body: { password: 'family-2026' } })).status, 200);
  cookie = '';
  assert.equal((await call('/api/login', { body: { password: 'family-2026', family: true } })).status, 200);
  const f = await call('/api/family/state'); assert.equal(f.status, 200);
  assert.equal(f.data.apps.length, 1); assert.equal(f.data.devices, undefined); assert.equal(f.data.cert, undefined);
  assert.equal((await call('/api/state')).status, 401); assert.equal((await call('/api/enroll', { body: { name: 'x' } })).status, 401);
  assert.equal((await call(`/api/apps/${appId}`, { method: 'DELETE' })).status, 401);
  cookie = admin;
});

test('store: owner sees all, family sees only shared apps, audience and category editable', async () => {
  const admin = cookie;
  // تطبيق عمل (النايفات) يُخفى عن العائلة تلقائيًا
  const ipa = makeIpa('Nayifat Work', 'com.nayifat.custody', '5.2.0');
  const up = await call('/api/upload', { form: formWith('ipa', ipa) }); assert.equal(up.status, 200);
  const s = await call('/api/sign', { body: { uploadId: up.data.uploadId, name: 'عُهد النايفات' } });
  const job = await waitJob(s.data.job); assert.equal(job.state, 'done', job.msg);
  const workId = job.result.appId;
  const st = (await call('/api/state')).data;
  const w = st.apps.find((a) => a.id === workId); assert.equal(w.audience, 'owner'); assert.equal(w.category, 'work');
  const per = st.apps.find((a) => a.id !== workId); assert.equal(per.audience, 'all'); assert.equal(per.category, 'personal');
  // واجهة المتجر للمالك
  const so = (await call('/api/store/state')).data;
  assert.equal(so.role, 'admin'); assert.ok(so.apps.some((a) => a.id === workId)); assert.match(so.storeUrl, /\/s$/); assert.ok('devices' in so); assert.ok(so.expires > Date.now());
  // صفحة /s تفتح الواجهة
  const pg = await call('/s', { jar: false }); assert.equal(pg.status, 200); assert.match(pg.data.toString(), /رحّال للتوقيع/);
  // دخول المتجر بكلمة العائلة → يرى المشترك فقط
  cookie = '';
  assert.equal((await call('/api/store/state')).status, 401);
  assert.equal((await call('/api/login', { body: { password: 'wrong', store: true } })).status, 401);
  const fl = await call('/api/login', { body: { password: 'family-2026', store: true } }); assert.equal(fl.data.role, 'family');
  const sf = (await call('/api/store/state')).data;
  assert.equal(sf.role, 'family'); assert.ok(!sf.apps.some((a) => a.id === workId)); assert.ok(!('storeUrl' in sf)); assert.ok(!('devices' in sf));
  assert.ok(!(await call('/api/family/state')).data.apps.some((a) => a.id === workId), 'family page hides owner apps too');
  assert.equal((await call(`/api/apps/${workId}`, { body: { audience: 'all' } })).status, 401, 'family cannot change audience');
  // دخول المتجر بكلمة المالك → مالك
  cookie = '';
  const ol = await call('/api/login', { body: { password: 'Ra7al-Test-2026', store: true } }); assert.equal(ol.data.role, 'admin');
  // تغيير من يراه والقسم
  assert.equal((await call(`/api/apps/${workId}`, { body: { audience: 'nobody' } })).status, 400);
  assert.equal((await call(`/api/apps/${workId}`, { body: { category: 'x' } })).status, 400);
  assert.equal((await call('/api/apps/nope', { body: { audience: 'all' } })).status, 404);
  assert.equal((await call(`/api/apps/${workId}`, { body: { audience: 'all', category: 'personal' } })).status, 200);
  const w2 = (await call('/api/state')).data.apps.find((a) => a.id === workId); assert.equal(w2.audience, 'all'); assert.equal(w2.category, 'personal');
  assert.equal((await call(`/api/apps/${workId}`, { body: { audience: 'owner', category: 'work' } })).status, 200);
  assert.equal((await call(`/api/apps/${workId}`, { method: 'DELETE' })).status, 200);
  cookie = admin;
});

test('settings, webhook alerts and validation', async () => {
  assert.equal((await call('/api/settings', { body: { publicUrl: 'not a url' } })).status, 400);
  assert.equal((await call('/api/settings', { body: { publicUrl: 'https://sign.example.ts.net', webhook: `http://127.0.0.1:${hook.address().port}/w`, alertDays: 999, lang: 'en', theme: 'light' } })).status, 200);
  const st = (await call('/api/state')).data; assert.equal(st.settings.alertDays, 120); assert.equal(st.settings.lang, 'en');
  assert.equal((await call('/api/test-alert', { body: {} })).status, 200);
  assert.ok(await until(() => hookGot.length > 0)); assert.match(hookGot[0].text, /تجريبي/);
  await call('/api/settings', { body: { lang: 'ar', theme: 'auto', alertDays: 30 } });
});

test('certificate limit gives a clear Arabic message', async () => {
  mock.st.certLimit = mock.st.certs.length;
  const r = await call('/api/cert/renew', { body: {} });
  assert.equal(r.status, 400); assert.match(r.data.error, /الأقصى/);
  mock.st.certLimit = 3;
  const ok = await call('/api/cert/renew', { body: {} }); assert.equal(ok.status, 200, JSON.stringify(ok.data));
  assert.ok(await until(async () => (await call('/api/state')).data.apps.every((a) => !a.needsResign)));
});

test('sign failure is reported, app list unaffected', async () => {
  const up = await call('/api/upload', { form: formWith('ipa', makeIpa('Broken', 'com.broken.x')) });
  process.env.X = '1';
  fs.writeFileSync(path.join(TMP, 'fail-wrapper.sh'), '');
  // نجعل zsign يفشل بإرسال اسم غير صالح للملف المرفوع
  const s = await call('/api/sign', { body: { uploadId: 'nope' } });
  const job = await waitJob(s.data.job);
  assert.equal(job.state, 'error'); assert.match(job.msg, /ارفعه من جديد/);
  const s2 = await call('/api/sign', { body: { uploadId: up.data.uploadId } });
  assert.equal((await waitJob(s2.data.job)).state, 'done');
  const st = (await call('/api/state')).data; assert.equal(st.apps.length, 2);
  const other = st.apps.find((a) => a.id !== appId);
  assert.equal((await call(`/api/apps/${other.id}`, { method: 'DELETE' })).status, 200);
  assert.equal((await call('/api/state')).data.apps.length, 1);
});

test('manual mode with p12 and mobileprovision', async () => {
  const d = fs.mkdtempSync(path.join(TMP, 'man-'));
  execFileSync('openssl', ['req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-keyout', `${d}/k.pem`, '-out', `${d}/c.pem`, '-days', '200', '-subj', '/CN=iPhone Distribution: Manual Person (MAN1234567)']);
  execFileSync('openssl', ['pkcs12', '-export', '-inkey', `${d}/k.pem`, '-in', `${d}/c.pem`, '-out', `${d}/c.p12`, '-passout', 'pass:p12pass']);
  const xml = `<?xml version="1.0" encoding="UTF-8"?><plist version="1.0"><dict><key>Name</key><string>Manual</string><key>UUID</key><string>AAAA-BBBB</string><key>TeamIdentifier</key><array><string>MAN1234567</string></array><key>ExpirationDate</key><date>2027-06-01T00:00:00Z</date><key>ProvisionedDevices</key><array><string>00008140-001A2B3C4D5E6F70</string></array><key>Entitlements</key><dict><key>application-identifier</key><string>MAN1234567.*</string></dict></dict></plist>`;
  fs.writeFileSync(`${d}/p.mobileprovision`, Buffer.concat([Buffer.from([0x30, 0x80]), Buffer.from(xml), Buffer.from([0, 0])]));
  const bad = new FormData(); bad.append('password', 'wrong'); bad.append('p12', new Blob([fs.readFileSync(`${d}/c.p12`)]), 'c.p12'); bad.append('profile', new Blob([fs.readFileSync(`${d}/p.mobileprovision`)]), 'p.mobileprovision');
  const rb = await call('/api/manual', { form: bad }); assert.equal(rb.status, 400); assert.match(rb.data.error, /p12/);
  const fd = new FormData(); fd.append('password', 'p12pass'); fd.append('p12', new Blob([fs.readFileSync(`${d}/c.p12`)]), 'c.p12'); fd.append('profile', new Blob([fs.readFileSync(`${d}/p.mobileprovision`)]), 'p.mobileprovision');
  const r = await call('/api/manual', { form: fd }); assert.equal(r.status, 200, JSON.stringify(r.data));
  const st = (await call('/api/state')).data;
  assert.equal(st.cert.source, 'manual'); assert.match(st.cert.name, /Manual Person/); assert.equal(st.cert.p12Pass, undefined); assert.equal(st.profile.uuid, 'AAAA-BBBB');
  assert.ok(await until(async () => (await call('/api/state')).data.apps.every((a) => !a.needsResign)));
  const args = JSON.parse(fs.readFileSync(ZLOG, 'utf8').trim().split('\n').pop());
  assert.equal(args[args.indexOf('-p') + 1], 'p12pass'); assert.ok(args[args.indexOf('-k') + 1].endsWith('cert.p12'));
  assert.equal(args[args.indexOf('-b') + 1], 'com.test.app', 'wildcard * keeps original bundle id');
});

test('a zip that wraps an IPA (GitHub Actions artifact) is unwrapped', async () => {
  const ipa = makeIpa('Wrapped App', 'com.wrapped.app', '5.2');
  const d = fs.mkdtempSync(path.join(TMP, 'art-'));
  fs.copyFileSync(ipa, path.join(d, 'Wrapped-unsigned.ipa'));
  fs.writeFileSync(path.join(d, 'Wrapped-Simulator.zip'), crypto.randomBytes(64));
  const art = path.join(TMP, `artifact-${Date.now()}.zip`);
  execFileSync('zip', ['-qr', art, '.'], { cwd: d });
  const up = await call('/api/upload', { form: formWith('ipa', art, 'artifact.zip') });
  assert.equal(up.status, 200, JSON.stringify(up.data));
  assert.equal(up.data.bundleId, 'com.wrapped.app'); assert.equal(up.data.version, '5.2');
});


test('password change and login throttling', async () => {
  assert.equal((await call('/api/password', { body: { current: 'bad', password: 'NewPass-2026' } })).status, 401);
  assert.equal((await call('/api/password', { body: { current: 'Ra7al-Test-2026', password: 'NewPass-2026' } })).status, 200);
  assert.equal((await call('/api/state')).status, 200);
  const admin = cookie; cookie = '';
  for (let i = 0; i < 8; i++) await call('/api/login', { body: { password: 'nope' + i } });
  assert.equal((await call('/api/login', { body: { password: 'NewPass-2026' } })).status, 429);
  cookie = admin;
  assert.equal((await call('/api/logout', { body: {} })).status, 200);
  assert.equal((await call('/api/state')).status, 401);
});
