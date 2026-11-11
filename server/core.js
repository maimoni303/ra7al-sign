// رحّال للتوقيع — المنطق الأساسي: الشهادة، ملف التعريف، الأجهزة، التوقيع، التنبيهات
import fs from 'node:fs';
import path from 'node:path';
import { getDb, save, dirs, id, log } from './store.js';
import { asc } from './asc.js';
import * as T from './tools.js';

const db = () => getDb();
const certDir = () => dirs.certs;
const keyOf = () => db().asc;
export const certFiles = () => ({
  key: path.join(certDir(), 'key.pem'), cert: path.join(certDir(), 'cert.pem'),
  p12: path.join(certDir(), 'cert.p12'), profile: path.join(certDir(), 'profile.mobileprovision'),
});

// ---------- الشهادة (عبر مفتاح API) ----------
export async function ensureCertificate({ force = false } = {}) {
  const k = keyOf(); if (!k) throw new Error('أضف مفتاح App Store Connect أولًا');
  const f = certFiles(), d = db();
  if (!force && d.cert && d.cert.source === 'asc' && fs.existsSync(f.key) && fs.existsSync(f.cert) && d.cert.expires > Date.now() + 864e5) return d.cert;
  const { csr } = await T.makeKeyAndCsr(certDir(), 'RA7AL Sign');
  let c;
  try { c = await asc.createCertificate(k, csr); }
  catch (e) {
    if (e.status === 409) throw new Error('وصل حسابك للحد الأقصى من شهادات التوزيع (3). احذف شهادة قديمة غير مستخدمة من developer.apple.com ثم أعد المحاولة.');
    throw e;
  }
  await T.derToPem(c.attributes.certificateContent, f.cert);
  const info = await T.certInfo(f.cert);
  d.cert = { id: c.id, serial: info.serial, name: info.name || c.attributes.name, expires: c.attributes.expirationDate ? Date.parse(c.attributes.expirationDate) : info.expires, source: 'asc', created: Date.now() };
  fs.rmSync(f.p12, { force: true });
  save(true); log('cert', `شهادة جديدة: ${d.cert.name}`);
  return d.cert;
}

// ---------- مزامنة الأجهزة ----------
export async function syncDevices() {
  const k = keyOf(); if (!k) return db().devices;
  const list = await asc.listDevices(k);
  const d = db();
  const map = new Map(d.devices.map((x) => [x.udid.toLowerCase(), x]));
  d.devices = list.map((x) => {
    const old = map.get(x.attributes.udid.toLowerCase()) || {};
    return { ...old, id: x.id, udid: x.attributes.udid, name: x.attributes.name, model: x.attributes.model || x.attributes.deviceClass || old.model || '', cls: x.attributes.deviceClass, status: x.attributes.status === 'ENABLED' ? 'enabled' : 'disabled', added: old.added || Date.parse(x.attributes.addedDate || '') || Date.now() };
  });
  save();
  return d.devices;
}

export async function registerDevice({ name, udid, model }) {
  const k = keyOf(); if (!k) throw new Error('لا يوجد مفتاح API');
  const dev = await asc.registerDevice(k, name, udid);
  await syncDevices();
  const d = db(); const x = d.devices.find((y) => y.udid.toLowerCase() === udid.toLowerCase());
  if (x && model) { x.model = model; save(); }
  log('device', `تسجيل جهاز: ${name}`);
  return dev;
}

export async function setDeviceStatus(devId, enabled) {
  const k = keyOf(); await asc.setDevice(k, devId, { status: enabled ? 'ENABLED' : 'DISABLED' });
  await syncDevices(); await rebuildProfile();
}
export async function renameDevice(devId, name) {
  const k = keyOf(); await asc.setDevice(k, devId, { name: name.slice(0, 50) });
  await syncDevices();
}

// ---------- ملف التعريف (Ad Hoc بمعرف عام com.ra7al.sign.*) ----------
export async function rebuildProfile() {
  const k = keyOf(); if (!k) throw new Error('لا يوجد مفتاح API');
  const d = db(); const f = certFiles();
  await ensureCertificate();
  const ident = `${d.settings.bundlePrefix}.*`;
  const b = await asc.ensureBundleId(k, ident);
  d.bundle = { id: b.id, identifier: ident };
  const devs = (await syncDevices()).filter((x) => x.status === 'enabled');
  if (!devs.length) throw new Error('لا توجد أجهزة مسجلة — سجّل جوالك أولًا من صفحة العائلة');
  if (d.profile && d.profile.id && d.profile.source === 'asc') await asc.deleteProfile(k, d.profile.id);
  const p = await asc.createProfile(k, { name: `RA7AL Sign ${new Date().toISOString().slice(0, 10)} ${id(3)}`, bundleIdId: b.id, certId: d.cert.id, deviceIds: devs.map((x) => x.id) });
  const buf = Buffer.from(p.attributes.profileContent, 'base64');
  fs.writeFileSync(f.profile, buf, { mode: 0o600 });
  const info = T.parseProvision(buf);
  d.profile = { id: p.id, uuid: info.uuid, name: info.name, expires: info.expires, devices: info.devices, bundlePattern: info.bundlePattern, source: 'asc', created: Date.now() };
  save(true); log('profile', `ملف تعريف جديد يشمل ${info.devices.length} جهاز`);
  if (d.settings.autoResign) queueResignAll();
  return d.profile;
}

// ---------- الإعداد اليدوي (p12 + mobileprovision) ----------
export async function setManual({ p12Buf, pass, provBuf }) {
  const f = certFiles(), d = db();
  const info = T.parseProvision(provBuf);
  fs.writeFileSync(f.p12, p12Buf, { mode: 0o600 });
  let ci;
  try { ci = await T.certInfo(f.p12, pass); } catch { fs.rmSync(f.p12, { force: true }); throw new Error('كلمة مرور ملف p12 غير صحيحة أو الملف تالف'); }
  fs.writeFileSync(f.profile, provBuf, { mode: 0o600 });
  d.cert = { name: ci.name, expires: ci.expires, serial: ci.serial, source: 'manual', p12Pass: pass, created: Date.now() };
  d.profile = { uuid: info.uuid, name: info.name, expires: info.expires, devices: info.devices, bundlePattern: info.bundlePattern, source: 'manual', created: Date.now() };
  save(true); log('cert', `إعداد يدوي: ${ci.name}`);
  if (d.settings.autoResign) queueResignAll();
  return { cert: d.cert, profile: d.profile };
}

export function ready() {
  const d = db(), f = certFiles();
  if (!d.cert || !d.profile || !fs.existsSync(f.profile)) return false;
  return d.cert.source === 'manual' ? fs.existsSync(f.p12) : fs.existsSync(f.key) && fs.existsSync(f.cert);
}

// ---------- التوقيع ----------
export const jobs = new Map();
let chain = Promise.resolve();
function enqueue(fn, meta) {
  const job = { id: id(6), state: 'queued', progress: 0, msg: '', ...meta, created: Date.now() };
  jobs.set(job.id, job);
  chain = chain.then(async () => {
    job.state = 'running'; job.progress = 10;
    try { job.result = await fn(job); job.state = 'done'; job.progress = 100; }
    catch (e) { job.state = 'error'; job.msg = e.message; log('error', e.message); }
    setTimeout(() => jobs.delete(job.id), 3600e3);
  });
  return job;
}

export function signApp({ uploadId, appId, name, rmExtensions }) {
  return enqueue(async (job) => {
    if (!ready()) throw new Error('الشهادة أو ملف التعريف غير جاهز');
    const d = db(), f = certFiles();
    let app = appId ? d.apps.find((a) => a.id === appId) : null;
    let src;
    if (app) src = path.join(dirs.apps, app.id, 'original.ipa');
    else {
      const up = path.join(dirs.uploads, `${uploadId}.ipa`);
      if (!fs.existsSync(up)) throw new Error('الملف المرفوع غير موجود — ارفعه من جديد');
      const meta = JSON.parse(fs.readFileSync(up + '.json', 'utf8'));
      app = { id: id(6), origBundleId: meta.bundleId, origName: meta.name, version: meta.version, build: meta.build, minOS: meta.minOS, src: meta.src || '' };
      fs.mkdirSync(path.join(dirs.apps, app.id), { recursive: true });
      fs.renameSync(up, path.join(dirs.apps, app.id, 'original.ipa'));
      fs.rmSync(up + '.json', { force: true });
      src = path.join(dirs.apps, app.id, 'original.ipa');
    }
    if (name) app.name = name.trim().slice(0, 40); else app.name = app.name || app.origName;
    if (rmExtensions !== undefined) app.rmExtensions = !!rmExtensions;
    const pattern = d.profile.bundlePattern || '*';
    app.bundleId = pattern.endsWith('*') && pattern !== '*' ? T.mapBundleId(pattern.slice(0, -2), app.origBundleId) : pattern === '*' ? app.origBundleId : pattern;
    const dir = path.join(dirs.apps, app.id), out = path.join(dir, 'signed.tmp.ipa'), meta = path.join(dir, 'meta');
    fs.rmSync(meta, { recursive: true, force: true });
    job.progress = 25; job.msg = 'signing';
    await T.zsign({
      input: src, output: out, profile: f.profile, bundleId: app.bundleId, name: app.name, rmExtensions: app.rmExtensions, metaDir: meta,
      ...(d.cert.source === 'manual' ? { p12: f.p12, pass: d.cert.p12Pass } : { key: f.key, cert: f.cert }),
      onLine: () => { job.progress = Math.min(90, job.progress + 2); },
    });
    fs.renameSync(out, path.join(dir, 'signed.ipa'));
    try {
      const png = fs.readdirSync(meta).find((x) => x.endsWith('.png'));
      if (png) { fs.copyFileSync(path.join(meta, png), path.join(dir, 'icon.png')); app.icon = true; }
    } catch {}
    app.size = fs.statSync(path.join(dir, 'signed.ipa')).size;
    app.signedAt = Date.now(); app.profileUuid = d.profile.uuid; app.certSerial = d.cert.serial;
    const i = d.apps.findIndex((a) => a.id === app.id);
    if (i >= 0) d.apps[i] = app; else d.apps.unshift(app);
    save(true); log('sign', `توقيع: ${app.name} ${app.version}`);
    return { appId: app.id };
  }, { kind: 'sign' });
}

export function needsResign(app) {
  const d = db();
  return !!(d.profile && (app.profileUuid !== d.profile.uuid || app.certSerial !== d.cert?.serial));
}
export function queueResignAll() {
  for (const a of db().apps) if (needsResign(a)) signApp({ appId: a.id });
}
export function deleteApp(appId) {
  const d = db();
  d.apps = d.apps.filter((a) => a.id !== appId);
  fs.rmSync(path.join(dirs.apps, appId), { recursive: true, force: true });
  save();
}

// ---------- التنبيهات ----------
export async function notify(text) {
  const url = db().settings.webhook;
  if (!url) return false;
  try { await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ source: 'ra7al-sign', text }) }); return true; }
  catch (e) { log('error', `webhook: ${e.message}`); return false; }
}
export async function dailyCheck() {
  const d = db(); const days = (t) => Math.floor((t - Date.now()) / 864e5);
  const s = d.settings;
  for (const [what, rec] of [['الشهادة', d.cert], ['ملف التعريف', d.profile]]) {
    if (!rec || !rec.expires) continue;
    const left = days(rec.expires);
    if (left <= s.alertDays && (!rec.alertedAt || Date.now() - rec.alertedAt > 6 * 864e5)) {
      rec.alertedAt = Date.now(); save();
      await notify(`رحّال للتوقيع: ${what} تنتهي بعد ${left} يومًا.`);
    }
  }
  // تجديد تلقائي لملف التعريف قبل انتهائه
  if (d.asc && d.profile && d.profile.source === 'asc' && days(d.profile.expires) < 15 && d.cert && days(d.cert.expires) > 15) {
    try { await rebuildProfile(); } catch (e) { log('error', e.message); }
  }
}
