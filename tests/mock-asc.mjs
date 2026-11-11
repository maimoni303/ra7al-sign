// خادم وهمي يحاكي App Store Connect API للاختبار (يتحقق من توقيع JWT)
import http from 'node:http';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

export function startMockAsc({ publicKey, keyId, issuerId }) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'mockasc-'));
  execFileSync('openssl', ['req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-keyout', path.join(tmp, 'ca.key'), '-out', path.join(tmp, 'ca.pem'), '-days', '400', '-subj', '/CN=Mock Apple CA']);
  const st = { devices: [], bundleIds: [], certs: [], profiles: [], calls: [], certLimit: 3 };
  let n = 1; const nid = () => 'ID' + (n++);
  const verify = (auth) => {
    const tok = (auth || '').replace(/^Bearer /, '');
    const [h, p, s] = tok.split('.');
    if (!s) return false;
    const head = JSON.parse(Buffer.from(h, 'base64url')), pay = JSON.parse(Buffer.from(p, 'base64url'));
    if (head.kid !== keyId || pay.iss !== issuerId || pay.aud !== 'appstoreconnect-v1' || pay.exp < Date.now() / 1000) return false;
    return crypto.verify('sha256', Buffer.from(`${h}.${p}`), { key: publicKey, dsaEncoding: 'ieee-p1363' }, Buffer.from(s, 'base64url'));
  };
  const server = http.createServer(async (req, res) => {
    const u = new URL(req.url, 'http://x'); let raw = ''; for await (const c of req) raw += c;
    const body = raw ? JSON.parse(raw) : null;
    st.calls.push(`${req.method} ${u.pathname}`);
    const send = (code, obj) => { res.writeHead(code, { 'Content-Type': 'application/json' }); res.end(obj ? JSON.stringify(obj) : ''); };
    const err = (code, title, detail) => send(code, { errors: [{ status: String(code), title, detail }] });
    if (!verify(req.headers.authorization)) return err(401, 'NOT_AUTHORIZED', 'bad token');
    const p = u.pathname;
    if (p === '/v1/devices' && req.method === 'GET') return send(200, { data: st.devices, links: {} });
    if (p === '/v1/devices' && req.method === 'POST') {
      const a = body.data.attributes;
      if (st.devices.some((d) => d.attributes.udid === a.udid)) return err(409, 'ENTITY_ERROR', 'exists');
      const d = { type: 'devices', id: nid(), attributes: { name: a.name, udid: a.udid, platform: 'IOS', status: 'ENABLED', deviceClass: 'IPHONE', model: 'iPhone', addedDate: new Date().toISOString() } };
      st.devices.push(d); return send(201, { data: d });
    }
    let m;
    if ((m = p.match(/^\/v1\/devices\/(\w+)$/)) && req.method === 'PATCH') { const d = st.devices.find((x) => x.id === m[1]); Object.assign(d.attributes, body.data.attributes); return send(200, { data: d }); }
    if (p === '/v1/bundleIds' && req.method === 'GET') return send(200, { data: st.bundleIds.filter((b) => b.attributes.identifier.startsWith(u.searchParams.get('filter[identifier]') || '')), links: {} });
    if (p === '/v1/bundleIds' && req.method === 'POST') { const b = { type: 'bundleIds', id: nid(), attributes: body.data.attributes }; st.bundleIds.push(b); return send(201, { data: b }); }
    if (p === '/v1/certificates' && req.method === 'GET') return send(200, { data: st.certs, links: {} });
    if (p === '/v1/certificates' && req.method === 'POST') {
      if (st.certs.length >= st.certLimit) return err(409, 'ENTITY_ERROR', 'There is a problem with the request entity — limit reached');
      const csr = path.join(tmp, `csr${n}.pem`), out = path.join(tmp, `crt${n}.der`);
      fs.writeFileSync(csr, body.data.attributes.csrContent);
      execFileSync('openssl', ['x509', '-req', '-in', csr, '-CA', path.join(tmp, 'ca.pem'), '-CAkey', path.join(tmp, 'ca.key'), '-CAcreateserial', '-days', '365', '-outform', 'DER', '-out', out, '-subj', '/CN=iPhone Distribution: Test User (TEAM123456)']);
      const c = { type: 'certificates', id: nid(), attributes: { name: 'iOS Distribution: Test User', certificateType: 'DISTRIBUTION', certificateContent: fs.readFileSync(out).toString('base64'), expirationDate: new Date(Date.now() + 365 * 864e5).toISOString(), serialNumber: 'X' } };
      st.certs.push(c); return send(201, { data: c });
    }
    if (p === '/v1/profiles' && req.method === 'POST') {
      const r = body.data.relationships, uuid = crypto.randomUUID().toUpperCase();
      const udids = r.devices.data.map((x) => st.devices.find((d) => d.id === x.id).attributes.udid);
      const bundle = st.bundleIds.find((b) => b.id === r.bundleId.data.id).attributes.identifier;
      const xml = `<?xml version="1.0" encoding="UTF-8"?><!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd"><plist version="1.0"><dict><key>Name</key><string>${body.data.attributes.name}</string><key>UUID</key><string>${uuid}</string><key>TeamIdentifier</key><array><string>TEAM123456</string></array><key>ExpirationDate</key><date>${new Date(Date.now() + 360 * 864e5).toISOString().replace(/\.\d+Z$/, 'Z')}</date><key>ProvisionedDevices</key><array>${udids.map((x) => `<string>${x}</string>`).join('')}</array><key>Entitlements</key><dict><key>application-identifier</key><string>TEAM123456.${bundle}</string></dict></dict></plist>`;
      const content = Buffer.concat([Buffer.from([0x30, 0x80, 0x06, 0x09]), Buffer.from(xml), Buffer.from([0, 0, 0xa0])]);
      const pr = { type: 'profiles', id: nid(), attributes: { name: body.data.attributes.name, profileType: 'IOS_APP_ADHOC', uuid, profileContent: content.toString('base64'), expirationDate: null }, rel: r };
      st.profiles.push(pr); return send(201, { data: pr });
    }
    if ((m = p.match(/^\/v1\/profiles\/(\w+)$/)) && req.method === 'DELETE') { st.profiles = st.profiles.filter((x) => x.id !== m[1]); return send(204); }
    return err(404, 'NOT_FOUND', p);
  });
  return new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve({ server, st, url: `http://127.0.0.1:${server.address().port}`, close: () => server.close() })));
}
