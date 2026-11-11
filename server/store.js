// رحّال للتوقيع — التخزين: ملف JSON واحد + مجلدات الملفات داخل /data
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

export const DATA = process.env.DATA_DIR || '/data';
export const dirs = {
  root: DATA,
  certs: path.join(DATA, 'certs'),
  apps: path.join(DATA, 'apps'),
  uploads: path.join(DATA, 'uploads'),
  tmp: path.join(DATA, 'tmp'),
};
for (const d of Object.values(dirs)) fs.mkdirSync(d, { recursive: true, mode: 0o700 });

const DB_FILE = path.join(DATA, 'db.json');
const EMPTY = {
  v: 1,
  auth: null,            // { salt, hash }
  familyAuth: null,      // { salt, hash } كلمة مرور صفحة العائلة
  settings: { lang: 'ar', theme: 'auto', publicUrl: process.env.PUBLIC_URL || '', webhook: '', bundlePrefix: 'com.ra7al.sign', alertDays: 30, autoResign: true, rmExtensions: false },
  asc: null,             // { issuerId, keyId, p8 }
  cert: null,            // { id, serial, expires, name, p12Pass, source: 'asc'|'manual' }
  profile: null,         // { id, uuid, name, expires, devices: [udid], bundleId, source }
  bundle: null,          // { id, identifier }
  devices: [],           // { id, udid, name, model, status: 'enabled'|'pending', added }
  enrollments: [],       // { token, name, created, used }
  apps: [],              // { id, name, bundleId, origBundleId, version, size, icon, signedAt, profileUuid, file, src }
  sessions: {},          // token -> { exp, role }
  log: [],
};

let db;
function load() {
  try { db = { ...EMPTY, ...JSON.parse(fs.readFileSync(DB_FILE, 'utf8')) }; db.settings = { ...EMPTY.settings, ...db.settings }; }
  catch { db = structuredClone(EMPTY); }
  if (process.env.PUBLIC_URL && !db.settings.publicUrl) db.settings.publicUrl = process.env.PUBLIC_URL;
}
load();

let saveTimer = null;
export function save(now = false) {
  const write = () => {
    const tmp = DB_FILE + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(db, null, 1), { mode: 0o600 });
    fs.renameSync(tmp, DB_FILE);
  };
  if (now) { clearTimeout(saveTimer); saveTimer = null; return write(); }
  clearTimeout(saveTimer); saveTimer = setTimeout(write, 50);
}
export const getDb = () => db;
export const id = (n = 9) => crypto.randomBytes(n).toString('base64url');

export function log(kind, msg) {
  db.log.unshift({ t: Date.now(), kind, msg: String(msg).slice(0, 400) });
  db.log.length = Math.min(db.log.length, 300);
  save();
}

// ---------- كلمات المرور ----------
export function hashPassword(pw) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(String(pw), salt, 64).toString('hex');
  return { salt, hash };
}
export function checkPassword(rec, pw) {
  if (!rec) return false;
  const h = crypto.scryptSync(String(pw), rec.salt, 64);
  const want = Buffer.from(rec.hash, 'hex');
  return h.length === want.length && crypto.timingSafeEqual(h, want);
}
export function newSession(role, days = 30) {
  const tok = id(24);
  db.sessions[tok] = { exp: Date.now() + days * 864e5, role };
  for (const [k, s] of Object.entries(db.sessions)) if (s.exp < Date.now()) delete db.sessions[k];
  save();
  return tok;
}
export function session(tok) {
  const s = tok && db.sessions[tok];
  return s && s.exp > Date.now() ? s : null;
}
export function dropSession(tok) { delete db.sessions[tok]; save(); }
