// رحّال للتوقيع — أدوات: OpenSSL للشهادات، قراءة ملفات التعريف وملفات IPA، وتشغيل zsign
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import plist from 'plist';
import bplist from 'bplist-parser';
import yauzl from 'yauzl';

export function run(cmd, args, { input, timeoutMs = 15 * 60 * 1000, onLine } = {}) {
  return new Promise((resolve, reject) => {
    const p = spawn(cmd, args, { stdio: ['pipe', 'pipe', 'pipe'] });
    let out = '', err = '';
    const t = setTimeout(() => { p.kill('SIGKILL'); reject(new Error(`${cmd} timeout`)); }, timeoutMs);
    p.stdout.on('data', (d) => { out += d; if (onLine) String(d).split('\n').forEach((l) => l.trim() && onLine(l)); });
    p.stderr.on('data', (d) => { err += d; if (onLine) String(d).split('\n').forEach((l) => l.trim() && onLine(l)); });
    p.on('error', (e) => { clearTimeout(t); reject(e); });
    p.on('close', (code) => { clearTimeout(t); code === 0 ? resolve({ out, err }) : reject(Object.assign(new Error(`${path.basename(cmd)} exited ${code}: ${(err || out).trim().split('\n').slice(-3).join(' | ')}`), { out, err, code })); });
    if (input) p.stdin.end(input); else p.stdin.end();
  });
}

// ---------- الشهادة: مفتاح خاص + طلب توقيع (CSR) ----------
export async function makeKeyAndCsr(dir, cn = 'RA7AL Sign') {
  const key = path.join(dir, 'key.pem'), csr = path.join(dir, 'csr.pem');
  await run('openssl', ['req', '-new', '-newkey', 'rsa:2048', '-nodes', '-keyout', key, '-out', csr, '-subj', `/CN=${cn}/C=SA`]);
  fs.chmodSync(key, 0o600);
  return { key, csr: fs.readFileSync(csr, 'utf8') };
}
export async function derToPem(derB64, out) {
  const der = path.join(path.dirname(out), 'cert.der');
  fs.writeFileSync(der, Buffer.from(derB64, 'base64'));
  await run('openssl', ['x509', '-inform', 'DER', '-in', der, '-out', out]);
  return out;
}
export async function certInfo(pemOrP12, pass) {
  let pem = pemOrP12;
  if (/\.p12$|\.pfx$/i.test(pemOrP12)) {
    const tryArgs = async (extra) => (await run('openssl', ['pkcs12', ...extra, '-in', pemOrP12, '-nokeys', '-clcerts', '-passin', `pass:${pass || ''}`])).out;
    let out;
    try { out = await tryArgs([]); } catch { out = await tryArgs(['-legacy']); }
    pem = path.join(path.dirname(pemOrP12), 'cert-from-p12.pem');
    fs.writeFileSync(pem, out);
  }
  const { out } = await run('openssl', ['x509', '-in', pem, '-noout', '-subject', '-enddate', '-serial']);
  const subject = (out.match(/subject=(.*)/) || [])[1] || '';
  const cn = (subject.match(/CN\s*=\s*([^,\/]+(?:\([^)]*\))?)/) || [])[1] || subject;
  const end = (out.match(/notAfter=(.*)/) || [])[1];
  const serial = (out.match(/serial=(.*)/) || [])[1];
  return { name: cn.trim(), expires: end ? new Date(end).getTime() : null, serial };
}

// ---------- ملف التعريف (mobileprovision) ----------
export function parseProvision(buf) {
  const s = buf.toString('latin1');
  const a = s.indexOf('<?xml'), b = s.indexOf('</plist>');
  if (a < 0 || b < 0) throw new Error('not a provisioning profile');
  const xml = Buffer.from(s.slice(a, b + 8), 'latin1').toString('utf8');
  const p = plist.parse(xml);
  const appId = (p.Entitlements && p.Entitlements['application-identifier']) || '';
  return {
    uuid: p.UUID, name: p.Name, team: (p.TeamIdentifier || [])[0], expires: new Date(p.ExpirationDate).getTime(),
    devices: p.ProvisionedDevices || [], all: !!p.ProvisionsAllDevices,
    bundlePattern: appId.replace(/^[A-Z0-9]+\./, ''),
  };
}

// يطابق المعرف مع نمط ملف التعريف (مثل com.ra7al.sign.*)
export function bundleFits(pattern, id) {
  if (!pattern || pattern === '*') return true;
  if (pattern.endsWith('*')) return id.startsWith(pattern.slice(0, -1));
  return pattern === id;
}

// ---------- قراءة Info.plist من ملف IPA ----------
export function readIpaInfo(file) {
  return new Promise((resolve, reject) => {
    yauzl.open(file, { lazyEntries: true, autoClose: false }, (err, zip) => {
      if (err) return reject(new Error('ملف IPA غير صالح'));
      let best = null;
      zip.on('entry', (e) => {
        const m = e.fileName.match(/^Payload\/([^/]+)\.app\/Info\.plist$/);
        if (m) best = e;
        zip.readEntry();
      });
      zip.on('end', () => {
        if (!best) { zip.close(); return reject(new Error('لا يحتوي على تطبيق آيفون (Payload/*.app)')); }
        zip.openReadStream(best, (e2, st) => {
          if (e2) return reject(e2);
          const chunks = [];
          st.on('data', (c) => chunks.push(c));
          st.on('end', () => {
            zip.close();
            const buf = Buffer.concat(chunks);
            let p;
            try { p = buf.slice(0, 6).toString() === 'bplist' ? bplist.parseBuffer(buf)[0] : plist.parse(buf.toString('utf8')); }
            catch { return reject(new Error('تعذّر قراءة Info.plist')); }
            resolve({
              bundleId: p.CFBundleIdentifier || '',
              name: p.CFBundleDisplayName || p.CFBundleName || p.CFBundleExecutable || 'App',
              version: p.CFBundleShortVersionString || p.CFBundleVersion || '',
              build: p.CFBundleVersion || '',
              minOS: p.MinimumOSVersion || '',
            });
          });
          st.on('error', reject);
        });
      });
      zip.on('error', reject);
      zip.readEntry();
    });
  });
}

// ---------- zsign ----------
export const ZSIGN = () => process.env.ZSIGN_BIN || 'zsign';
export async function zsign({ input, output, key, cert, p12, pass, profile, bundleId, name, rmExtensions, metaDir, onLine }) {
  const args = ['-f', '-z', '6'];
  if (p12) args.push('-k', p12, '-p', pass || ''); else args.push('-k', key, '-c', cert);
  args.push('-m', profile);
  if (bundleId) args.push('-b', bundleId);
  if (name) args.push('-n', name);
  if (rmExtensions) args.push('-E', '-W');
  if (metaDir) args.push('-x', metaDir);
  args.push('-o', output, input);
  return run(ZSIGN(), args, { onLine });
}

// يحوّل المعرف الأصلي إلى معرف تحت البادئة: com.foo.bar → com.ra7al.sign.com-foo-bar
export function mapBundleId(prefix, orig) {
  const tail = String(orig || 'app').toLowerCase().replace(/[^a-z0-9.-]/g, '-').replace(/\./g, '-').replace(/-+/g, '-').slice(0, 80);
  return `${prefix}.${tail}`;
}

// ---------- فك ملف مضغوط يحتوي IPA بداخله (مثل حِزم GitHub Actions) ----------
// إذا لم يكن الملف IPA مباشرًا لكنه zip فيه ملف .ipa، نستخرج الـ IPA ونستبدل به الملف الأصلي.
export function unwrapNestedIpa(file) {
  return new Promise((resolve, reject) => {
    yauzl.open(file, { lazyEntries: true, autoClose: false }, (err, zip) => {
      if (err) return resolve(false);
      let payload = false, inner = [];
      zip.on('entry', (e) => {
        if (/^Payload\//.test(e.fileName)) payload = true;
        else if (/\.ipa$/i.test(e.fileName) && !/simulator/i.test(e.fileName)) inner.push(e);
        zip.readEntry();
      });
      zip.on('end', () => {
        if (payload || !inner.length) { zip.close(); return resolve(false); }
        inner.sort((a, b) => b.uncompressedSize - a.uncompressedSize);
        zip.openReadStream(inner[0], (e2, st) => {
          if (e2) { zip.close(); return reject(e2); }
          const tmp = file + '.inner';
          const out = fs.createWriteStream(tmp);
          st.pipe(out);
          out.on('finish', () => { zip.close(); fs.renameSync(tmp, file); resolve(path.basename(inner[0].fileName)); });
          out.on('error', (x) => { zip.close(); reject(x); });
        });
      });
      zip.on('error', () => { zip.close(); resolve(false); });
      zip.readEntry();
    });
  });
}
