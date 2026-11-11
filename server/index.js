// رحّال للتوقيع — خادم الويب
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { pipeline } from 'node:stream/promises';
import { Readable } from 'node:stream';
import Busboy from 'busboy';
import { getDb, save, dirs, id, log, hashPassword, checkPassword, newSession, session, dropSession } from './store.js';
import { asc, validP8 } from './asc.js';
import * as C from './core.js';
import * as T from './tools.js';
import { mobileconfig, parseCallback, modelName } from './enroll.js';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const PUB = path.join(ROOT, '..', 'public');
const PORT = +process.env.PORT || 8787;
const VERSION = JSON.parse(fs.readFileSync(path.join(ROOT, '..', 'package.json'), 'utf8')).version;
const MAX_IPA = (+process.env.MAX_IPA_MB || 4096) * 1048576;
const db = getDb;
if (!db().secret) { db().secret = crypto.randomBytes(32).toString('hex'); save(true); }

// ---------- أدوات ----------
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.png': 'image/png', '.svg': 'image/svg+xml', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.woff2': 'font/woff2', '.ico': 'image/x-icon' };
const SEC = { 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer', 'X-Frame-Options': 'DENY' };
function send(res, code, body, type = 'application/json; charset=utf-8', extra = {}) {
  if (res.headersSent) return;
  const data = typeof body === 'string' || Buffer.isBuffer(body) ? body : JSON.stringify(body);
  res.writeHead(code, { 'Content-Type': type, 'Cache-Control': 'no-store', ...SEC, ...extra });
  res.end(data);
}
const json = (res, code, obj) => send(res, code, obj);
const fail = (res, code, msg) => json(res, code, { error: msg });
function cookies(req) { return Object.fromEntries((req.headers.cookie || '').split(';').map((c) => c.trim().split('=').map(decodeURIComponent)).filter((x) => x[0])); }
async function body(req, limit = 1048576) {
  let size = 0; const chunks = [];
  for await (const c of req) { size += c.length; if (size > limit) throw Object.assign(new Error('too large'), { status: 413 }); chunks.push(c); }
  const raw = Buffer.concat(chunks);
  return { raw, json: () => { try { return JSON.parse(raw.toString('utf8') || '{}'); } catch { return {}; } } };
}
export function baseUrl(req) {
  const s = db().settings.publicUrl;
  if (s) return s.replace(/\/+$/, '');
  const proto = (req.headers['x-forwarded-proto'] || (req.socket.encrypted ? 'https' : 'http')).split(',')[0];
  return `${proto}://${req.headers['x-forwarded-host'] || req.headers.host}`;
}
const sig = (s) => crypto.createHmac('sha256', db().secret).update(s).digest('base64url').slice(0, 22);
const okSig = (s, k) => k && k.length === 22 && crypto.timingSafeEqual(Buffer.from(sig(s)), Buffer.from(k));
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// محاولات الدخول (حماية من التخمين)
const tries = new Map();
function throttled(ip) { const t = tries.get(ip) || { n: 0, at: 0 }; if (Date.now() - t.at > 15 * 60e3) { t.n = 0; } return t.n >= 8 ? t : null; }
function failTry(ip) { const t = tries.get(ip) || { n: 0, at: 0 }; t.n++; t.at = Date.now(); tries.set(ip, t); }
const ipOf = (req) => (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').split(',')[0].trim();

// ---------- العرض العام للحالة ----------
function appView(a, base) {
  const k = sig(`app:${a.id}`);
  return {
    id: a.id, name: a.name, version: a.version, bundleId: a.bundleId, origBundleId: a.origBundleId, size: a.size, signedAt: a.signedAt,
    icon: a.icon ? `/i/${a.id}/icon.png?k=${k}` : null, needsResign: C.needsResign(a), rmExtensions: !!a.rmExtensions,
    install: `itms-services://?action=download-manifest&url=${encodeURIComponent(`${base}/i/${a.id}/manifest.plist?k=${k}`)}`,
    download: `/i/${a.id}/app.ipa?k=${k}`,
  };
}
function state(req, role) {
  const d = db(), base = baseUrl(req);
  const apps = d.apps.filter((a) => fs.existsSync(path.join(dirs.apps, a.id, 'signed.ipa'))).map((a) => appView(a, base));
  if (role === 'family') return { role, apps, settings: { lang: d.settings.lang, theme: d.settings.theme } };
  const { p12Pass, ...cert } = d.cert || {};
  return {
    role, version: VERSION, base, https: base.startsWith('https://'), setup: !d.auth,
    settings: d.settings, hasFamilyPassword: !!d.familyAuth,
    asc: d.asc ? { issuerId: d.asc.issuerId, keyId: d.asc.keyId } : null,
    cert: d.cert ? cert : null, profile: d.profile, ready: C.ready(),
    devices: d.devices, enrollments: d.enrollments.filter((e) => !e.used).map((e) => ({ ...e, url: `${base}/e/${e.token}` })),
    apps, jobs: [...C.jobs.values()].filter((j) => j.state !== 'done' || Date.now() - j.created < 60e3),
    log: d.log.slice(0, 50),
  };
}

// ---------- رفع IPA ----------
function receiveIpa(req) {
  return new Promise((resolve, reject) => {
    let bb;
    try { bb = Busboy({ headers: req.headers, limits: { fileSize: MAX_IPA, files: 1 } }); } catch (e) { return reject(Object.assign(e, { status: 400 })); }
    const upId = id(8); const dest = path.join(dirs.uploads, `${upId}.ipa`);
    let got = false, done = null, truncated = false;
    bb.on('file', (_n, file, info) => {
      got = true;
      file.on('limit', () => { truncated = true; });
      done = pipeline(file, fs.createWriteStream(dest)).then(() => ({ upId, dest, filename: info.filename }));
    });
    bb.on('close', async () => {
      if (!got) return reject(Object.assign(new Error('لم يُرسل ملف'), { status: 400 }));
      try { const r = await done; if (truncated) { fs.rmSync(dest, { force: true }); return reject(Object.assign(new Error('الملف أكبر من الحد المسموح'), { status: 413 })); } resolve(r); }
      catch (e) { reject(e); }
    });
    bb.on('error', reject);
    req.pipe(bb);
  });
}
async function receiveFiles(req, limit = 5 * 1048576) {
  return new Promise((resolve, reject) => {
    const out = { fields: {}, files: {} };
    let bb; try { bb = Busboy({ headers: req.headers, limits: { fileSize: limit, files: 4 } }); } catch (e) { return reject(e); }
    bb.on('file', (name, file) => { const ch = []; file.on('data', (c) => ch.push(c)); file.on('end', () => { out.files[name] = Buffer.concat(ch); }); });
    bb.on('field', (n, v) => { out.fields[n] = v; });
    bb.on('close', () => resolve(out)); bb.on('error', reject);
    req.pipe(bb);
  });
}
async function finishUpload(dest, upId, src) {
  let meta;
  try { meta = await T.readIpaInfo(dest); } catch (e) { fs.rmSync(dest, { force: true }); throw Object.assign(e, { status: 400 }); }
  meta.size = fs.statSync(dest).size; meta.src = src || '';
  fs.writeFileSync(dest + '.json', JSON.stringify(meta));
  // تنظيف الرفع القديم غير الموقّع (أقدم من يوم)
  for (const f of fs.readdirSync(dirs.uploads)) { const p = path.join(dirs.uploads, f); try { if (Date.now() - fs.statSync(p).mtimeMs > 864e5) fs.rmSync(p, { force: true }); } catch {} }
  return { uploadId: upId, ...meta };
}
async function fetchIpa(url) {
  let u; try { u = new URL(url); } catch { throw Object.assign(new Error('رابط غير صالح'), { status: 400 }); }
  if (!/^https?:$/.test(u.protocol)) throw Object.assign(new Error('رابط غير صالح'), { status: 400 });
  const r = await fetch(u, { redirect: 'follow' });
  if (!r.ok || !r.body) throw Object.assign(new Error(`تعذّر التنزيل (${r.status})`), { status: 400 });
  const len = +r.headers.get('content-length') || 0; if (len > MAX_IPA) throw Object.assign(new Error('الملف أكبر من الحد المسموح'), { status: 413 });
  const upId = id(8), dest = path.join(dirs.uploads, `${upId}.ipa`);
  let size = 0;
  const src = Readable.fromWeb(r.body);
  src.on('data', (c) => { size += c.length; if (size > MAX_IPA) src.destroy(new Error('الملف أكبر من الحد المسموح')); });
  await pipeline(src, fs.createWriteStream(dest));
  return finishUpload(dest, upId, url);
}

// ---------- صفحات HTML بسيطة (تسجيل الجهاز) ----------
function page(title, inner, lang = 'ar') {
  return `<!doctype html><html lang="${lang}" dir="${lang === 'ar' ? 'rtl' : 'ltr'}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="dark light"><title>${esc(title)}</title><link rel="stylesheet" href="/style.css"></head><body class="simple"><main class="simple-card">${inner}</main></body></html>`;
}
const logo = `<svg class="logo" viewBox="0 0 34 34" aria-hidden="true"><path d="M2 20 H10 C9 15 12 11 15 12 C16 12.5 17 14 17 14 C17 14 18 12.5 19 12 C22 11 25 15 24 20 L17 26 L10 20 M24 20 H32"/></svg>`;

// ---------- الموجّه ----------
async function route(req, res) {
  const u = new URL(req.url, 'http://x');
  const p = u.pathname, m = req.method;
  const ck = cookies(req);
  const ses = session(ck.rs);
  const admin = ses && ses.role === 'admin';
  const fam = ses && (ses.role === 'family' || admin);
  const setCookie = (tok, days = 30) => ({ 'Set-Cookie': `rs=${tok}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${days * 86400}${baseUrl(req).startsWith('https') ? '; Secure' : ''}` });

  // ----- ملفات التثبيت (يطلبها الآيفون مباشرة، محمية بتوقيع الرابط) -----
  let mm;
  if ((mm = p.match(/^\/i\/([\w-]+)\/(manifest\.plist|app\.ipa|icon\.png)$/)) && m === 'GET') {
    const [, appId, what] = mm;
    if (!okSig(`app:${appId}`, u.searchParams.get('k'))) return send(res, 403, 'forbidden', 'text/plain');
    const a = db().apps.find((x) => x.id === appId); if (!a) return send(res, 404, 'not found', 'text/plain');
    const dir = path.join(dirs.apps, appId), k = u.searchParams.get('k'), base = baseUrl(req);
    if (what === 'manifest.plist') {
      const x = `<?xml version="1.0" encoding="UTF-8"?><!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd"><plist version="1.0"><dict><key>items</key><array><dict><key>assets</key><array><dict><key>kind</key><string>software-package</string><key>url</key><string>${esc(`${base}/i/${appId}/app.ipa?k=${k}`)}</string></dict>${a.icon ? `<dict><key>kind</key><string>display-image</string><key>url</key><string>${esc(`${base}/i/${appId}/icon.png?k=${k}`)}</string></dict><dict><key>kind</key><string>full-size-image</string><key>url</key><string>${esc(`${base}/i/${appId}/icon.png?k=${k}`)}</string></dict>` : ''}</array><key>metadata</key><dict><key>bundle-identifier</key><string>${esc(a.bundleId)}</string><key>bundle-version</key><string>${esc(a.version || '1.0')}</string><key>kind</key><string>software</string><key>title</key><string>${esc(a.name)}</string></dict></dict></array></dict></plist>`;
      return send(res, 200, x, 'application/xml');
    }
    const file = path.join(dir, what === 'app.ipa' ? 'signed.ipa' : 'icon.png');
    if (!fs.existsSync(file)) return send(res, 404, 'not found', 'text/plain');
    const st = fs.statSync(file);
    res.writeHead(200, { 'Content-Type': what === 'app.ipa' ? 'application/octet-stream' : 'image/png', 'Content-Length': st.size, 'Cache-Control': 'no-store', ...(what === 'app.ipa' ? { 'Content-Disposition': `attachment; filename="${encodeURIComponent(a.name)}.ipa"` } : {}) });
    return fs.createReadStream(file).pipe(res);
  }

  // ----- تسجيل جهاز من العائلة -----
  if ((mm = p.match(/^\/e\/([\w-]+)$/)) && m === 'GET') {
    const e = db().enrollments.find((x) => x.token === mm[1] && !x.used);
    if (!e) return send(res, 404, page('رابط منتهي', `${logo}<h1>الرابط غير صالح أو استُخدم</h1><p>اطلب رابطًا جديدًا من صاحب الحساب.</p>`), 'text/html; charset=utf-8');
    return send(res, 200, page('تسجيل جهازك', `${logo}<h1>تسجيل جهازك في رحّال للتوقيع</h1><p class="muted">مرحبًا ${esc(e.name)} — خطوة واحدة فقط:</p>
      <ol><li>افتح هذه الصفحة من <b>Safari</b> على الآيفون.</li><li>اضغط الزر بالأسفل ثم «سماح».</li><li>افتح <b>الإعدادات ← تم تنزيل ملف التعريف ← تثبيت</b>.</li></ol>
      ${baseUrl(req).startsWith('https:') ? '' : '<p class="muted small" style="color:#b45309">تنبيه: هذا الرابط غير آمن (http)، وأنظمة iOS الحديثة ترفض ملف التسجيل عبره بخطأ «Profile Installation Failed». استخدم الرابط الآمن (https) من صاحب الحساب.</p>'}
      <a class="btn primary" href="/e/${esc(e.token)}/profile.mobileconfig">تنزيل ملف التسجيل</a>
      <p class="muted small">الملف يرسل معرّف جهازك فقط لتسجيله، ولا يغيّر أي إعداد، ويمكنك حذفه بعدها.</p>`), 'text/html; charset=utf-8');
  }
  if ((mm = p.match(/^\/e\/([\w-]+)\/profile\.mobileconfig$/)) && m === 'GET') {
    const e = db().enrollments.find((x) => x.token === mm[1] && !x.used);
    if (!e) return send(res, 404, 'expired', 'text/plain');
    return send(res, 200, mobileconfig({ callbackUrl: `${baseUrl(req)}/e/${e.token}/cb`, token: e.token }), 'application/x-apple-aspen-config', { 'Content-Disposition': 'attachment; filename="ra7al-sign.mobileconfig"' });
  }
  if ((mm = p.match(/^\/e\/([\w-]+)\/cb$/)) && m === 'POST') {
    const e = db().enrollments.find((x) => x.token === mm[1] && !x.used);
    if (!e) return send(res, 410, 'expired', 'text/plain');
    const b = await body(req, 256 * 1024);
    let info; try { info = parseCallback(b.raw); } catch { return send(res, 400, 'bad', 'text/plain'); }
    e.used = Date.now(); e.udid = info.udid; save(true);
    const model = modelName(info.product);
    try {
      if (db().asc) {
        await C.registerDevice({ name: e.name, udid: info.udid, model });
        C.rebuildProfile().catch((err) => log('error', err.message));
      } else {
        db().devices.push({ id: 'manual-' + id(4), udid: info.udid, name: e.name, model, status: 'pending', added: Date.now() }); save();
      }
      C.notify(`رحّال للتوقيع: تم تسجيل جهاز ${e.name} (${model}).`);
    } catch (err) { log('error', `تسجيل ${e.name}: ${err.message}`); }
    res.writeHead(301, { Location: `${baseUrl(req)}/e/${e.token}/done` }); return res.end();
  }
  if ((mm = p.match(/^\/e\/([\w-]+)\/done$/)) && m === 'GET') {
    return send(res, 200, page('تم التسجيل', `${logo}<h1>تم تسجيل جهازك ✓</h1><p>ستصلك روابط تثبيت التطبيقات من صاحب الحساب. يمكنك حذف ملف التسجيل من الإعدادات ← عام ← VPN وإدارة الأجهزة.</p>`), 'text/html; charset=utf-8');
  }

  // ----- واجهة برمجية -----
  if (p.startsWith('/api/')) {
    const r = p.slice(5);
    if (r === 'ping') return json(res, 200, { ok: true, version: VERSION });
    if (r === 'boot' && m === 'GET') return json(res, 200, { setup: !db().auth, role: ses ? ses.role : null, lang: db().settings.lang, theme: db().settings.theme, version: VERSION });
    if (r === 'setup' && m === 'POST') {
      if (db().auth) return fail(res, 409, 'already set');
      const { password } = (await body(req)).json();
      if (!password || String(password).length < 8) return fail(res, 400, 'min8');
      db().auth = hashPassword(password); save(true); log('auth', 'تم إنشاء كلمة المرور');
      return send(res, 200, { ok: true }, undefined, setCookie(newSession('admin')));
    }
    if (r === 'login' && m === 'POST') {
      const ip = ipOf(req); if (throttled(ip)) return fail(res, 429, 'wait');
      const { password, family } = (await body(req)).json();
      if (!family && checkPassword(db().auth, password)) { tries.delete(ip); return send(res, 200, { ok: true, role: 'admin' }, undefined, setCookie(newSession('admin'))); }
      if (family && checkPassword(db().familyAuth, password)) { tries.delete(ip); return send(res, 200, { ok: true, role: 'family' }, undefined, setCookie(newSession('family', 180), 180)); }
      failTry(ip); return fail(res, 401, 'bad password');
    }
    if (r === 'logout' && m === 'POST') { dropSession(ck.rs); return send(res, 200, { ok: true }, undefined, { 'Set-Cookie': 'rs=; Path=/; Max-Age=0' }); }
    if (r === 'family/state' && m === 'GET') { if (!fam) return fail(res, 401, 'login'); return json(res, 200, state(req, 'family')); }
    if (!admin) return fail(res, 401, 'login');

    if (r === 'state' && m === 'GET') return json(res, 200, state(req, 'admin'));
    if (r === 'settings' && m === 'POST') {
      const b = (await body(req)).json(), s = db().settings;
      for (const k of ['lang', 'theme', 'publicUrl', 'webhook', 'alertDays', 'autoResign', 'rmExtensions']) if (k in b) s[k] = b[k];
      if (s.publicUrl && !/^https?:\/\/[^\s]+$/.test(s.publicUrl)) return fail(res, 400, 'bad url');
      if ('bundlePrefix' in b && b.bundlePrefix !== s.bundlePrefix) {
        if (!/^[a-z][a-z0-9-]*(\.[a-z0-9-]+){1,4}$/i.test(b.bundlePrefix)) return fail(res, 400, 'bad prefix');
        s.bundlePrefix = b.bundlePrefix;
      }
      s.alertDays = Math.max(1, Math.min(120, +s.alertDays || 30));
      save(true); return json(res, 200, { ok: true });
    }
    if (r === 'password' && m === 'POST') {
      const { current, password } = (await body(req)).json();
      if (!checkPassword(db().auth, current)) return fail(res, 401, 'bad password');
      if (!password || password.length < 8) return fail(res, 400, 'min8');
      db().auth = hashPassword(password); db().sessions = {}; save(true);
      return send(res, 200, { ok: true }, undefined, setCookie(newSession('admin')));
    }
    if (r === 'family-password' && m === 'POST') {
      const { password } = (await body(req)).json();
      if (!password) { db().familyAuth = null; for (const [k, s2] of Object.entries(db().sessions)) if (s2.role === 'family') delete db().sessions[k]; save(true); return json(res, 200, { ok: true }); }
      if (password.length < 6) return fail(res, 400, 'min6');
      db().familyAuth = hashPassword(password); save(true); return json(res, 200, { ok: true });
    }
    if (r === 'asc-key' && m === 'POST') {
      const { issuerId, keyId, p8 } = (await body(req, 64 * 1024)).json();
      if (!/^[0-9a-f-]{36}$/i.test(issuerId || '')) return fail(res, 400, 'issuer');
      if (!/^[A-Z0-9]{10}$/.test(keyId || '')) return fail(res, 400, 'keyid');
      if (!validP8(p8)) return fail(res, 400, 'p8');
      const key = { issuerId: issuerId.trim(), keyId: keyId.trim(), p8 };
      try { await asc.test(key); } catch (e) { return fail(res, 400, `apple: ${e.message}`); }
      db().asc = key; save(true); log('asc', 'تم ربط مفتاح App Store Connect');
      try { await C.ensureCertificate(); await C.syncDevices(); await C.rebuildProfile(); } catch (e) { log('error', e.message); return json(res, 200, { ok: true, warning: e.message }); }
      return json(res, 200, { ok: true });
    }
    if (r === 'asc-key' && m === 'DELETE') { db().asc = null; save(true); return json(res, 200, { ok: true }); }
    if (r === 'cert/renew' && m === 'POST') { try { await C.ensureCertificate({ force: true }); await C.rebuildProfile(); return json(res, 200, { ok: true }); } catch (e) { return fail(res, 400, e.message); } }
    if (r === 'profile/rebuild' && m === 'POST') { try { const pr = await C.rebuildProfile(); return json(res, 200, { ok: true, profile: pr }); } catch (e) { return fail(res, 400, e.message); } }
    if (r === 'manual' && m === 'POST') {
      try {
        const f = await receiveFiles(req);
        if (!f.files.p12 || !f.files.profile) return fail(res, 400, 'files');
        const out = await C.setManual({ p12Buf: f.files.p12, pass: f.fields.password || '', provBuf: f.files.profile });
        return json(res, 200, { ok: true, ...out });
      } catch (e) { return fail(res, 400, e.message); }
    }
    if (r === 'devices/sync' && m === 'POST') { try { const devices = await C.syncDevices(); let warning; if (!C.ready() && db().asc) { try { await C.rebuildProfile(); } catch (e) { warning = e.message; log('error', e.message); } } return json(res, 200, { ok: true, devices, warning }); } catch (e) { return fail(res, 400, e.message); } }
    if ((mm = r.match(/^devices\/([\w-]+)$/)) && m === 'POST' && !['add', 'sync'].includes(mm[1])) {
      const b = (await body(req)).json();
      try {
        if (b.name) await C.renameDevice(mm[1], b.name);
        if ('enabled' in b) await C.setDeviceStatus(mm[1], !!b.enabled);
        return json(res, 200, { ok: true });
      } catch (e) { return fail(res, 400, e.message); }
    }
    if (r === 'devices/add' && m === 'POST') {
      const { name, udid } = (await body(req)).json();
      if (!name || !/^[0-9A-Fa-f-]{24,40}$/.test(udid || '')) return fail(res, 400, 'udid');
      try { await C.registerDevice({ name, udid }); C.rebuildProfile().catch((e) => log('error', e.message)); return json(res, 200, { ok: true }); }
      catch (e) { return fail(res, 400, e.message); }
    }
    if (r === 'enroll' && m === 'POST') {
      const { name } = (await body(req)).json();
      if (!name || !String(name).trim()) return fail(res, 400, 'name');
      const e = { token: id(12), name: String(name).trim().slice(0, 40), created: Date.now() };
      db().enrollments.unshift(e); db().enrollments = db().enrollments.slice(0, 100); save(true);
      return json(res, 200, { ok: true, token: e.token, url: `${baseUrl(req)}/e/${e.token}` });
    }
    if ((mm = r.match(/^enroll\/([\w-]+)$/)) && m === 'DELETE') { db().enrollments = db().enrollments.filter((e) => e.token !== mm[1]); save(); return json(res, 200, { ok: true }); }
    if (r === 'upload' && m === 'POST') {
      try { const up = await receiveIpa(req); return json(res, 200, await finishUpload(up.dest, up.upId, up.filename)); }
      catch (e) { return fail(res, e.status || 400, e.message); }
    }
    if (r === 'upload-url' && m === 'POST') {
      const { url } = (await body(req)).json();
      try { return json(res, 200, await fetchIpa(url)); } catch (e) { return fail(res, e.status || 400, e.message); }
    }
    if (r === 'sign' && m === 'POST') {
      const b = (await body(req)).json();
      if (!C.ready()) return fail(res, 400, 'not ready');
      const job = C.signApp({ uploadId: b.uploadId, appId: b.appId, name: b.name, rmExtensions: b.rmExtensions });
      return json(res, 200, { ok: true, job: job.id });
    }
    if ((mm = r.match(/^jobs\/([\w-]+)$/)) && m === 'GET') { const j = C.jobs.get(mm[1]); return j ? json(res, 200, j) : fail(res, 404, 'job'); }
    if ((mm = r.match(/^apps\/([\w-]+)$/)) && m === 'DELETE') { C.deleteApp(mm[1]); return json(res, 200, { ok: true }); }
    if (r === 'resign-all' && m === 'POST') { C.queueResignAll(); return json(res, 200, { ok: true }); }
    if (r === 'test-alert' && m === 'POST') { const ok = await C.notify('رحّال للتوقيع: هذا تنبيه تجريبي ✓'); return ok ? json(res, 200, { ok }) : fail(res, 400, 'webhook'); }
    return fail(res, 404, 'not found');
  }

  // ----- ملفات الواجهة -----
  if (m !== 'GET' && m !== 'HEAD') return send(res, 405, 'method', 'text/plain');
  let f = p === '/' || p === '/f' || p === '/f/' ? '/index.html' : p;
  const full = path.join(PUB, path.normalize(f).replace(/^(\.\.[/\\])+/, ''));
  if (!full.startsWith(PUB) || !fs.existsSync(full) || fs.statSync(full).isDirectory()) return send(res, 404, 'not found', 'text/plain');
  const ext = path.extname(full);
  res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream', 'Cache-Control': ext === '.html' ? 'no-store' : 'public, max-age=3600', ...SEC });
  fs.createReadStream(full).pipe(res);
}

export const server = http.createServer((req, res) => {
  route(req, res).catch((e) => { console.error(e); if (!res.headersSent) fail(res, e.status || 500, e.status ? e.message : 'server error'); });
});
server.requestTimeout = 0; server.headersTimeout = 60e3;

if (process.env.NODE_ENV !== 'test') {
  server.listen(PORT, () => console.log(`RA7AL Sign ${VERSION} on :${PORT}`));
  setTimeout(() => C.dailyCheck().catch(() => {}), 30e3);
  setInterval(() => C.dailyCheck().catch(() => {}), 12 * 3600e3);
}
