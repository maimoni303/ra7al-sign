// رحّال للتوقيع — الاتصال بـ App Store Connect API (شهادات، أجهزة، معرّفات، ملفات تعريف)
import crypto from 'node:crypto';

const BASE = () => process.env.ASC_BASE || 'https://api.appstoreconnect.apple.com';

export class AscError extends Error {
  constructor(status, body) {
    const e = body && body.errors && body.errors[0];
    super(e ? `${e.title || ''}: ${e.detail || ''}`.trim() : `HTTP ${status}`);
    this.status = status; this.body = body; this.code = e && e.code;
  }
}

function b64url(buf) { return Buffer.from(buf).toString('base64url'); }

export function makeToken({ issuerId, keyId, p8 }) {
  const now = Math.floor(Date.now() / 1000);
  const header = b64url(JSON.stringify({ alg: 'ES256', kid: keyId, typ: 'JWT' }));
  const payload = b64url(JSON.stringify({ iss: issuerId, iat: now, exp: now + 15 * 60, aud: 'appstoreconnect-v1' }));
  const sig = crypto.sign('sha256', Buffer.from(`${header}.${payload}`), { key: p8, dsaEncoding: 'ieee-p1363' });
  return `${header}.${payload}.${b64url(sig)}`;
}

export function validP8(p8) {
  try { const k = crypto.createPrivateKey(p8); return k.asymmetricKeyType === 'ec'; } catch { return false; }
}

async function req(key, method, path, body) {
  const r = await fetch(BASE() + path, {
    method,
    headers: { Authorization: `Bearer ${makeToken(key)}`, 'Content-Type': 'application/json', Accept: 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(+process.env.ASC_TIMEOUT_MS || 60000),
  });
  const text = await r.text();
  let json = null; try { json = text ? JSON.parse(text) : null; } catch { json = { raw: text }; }
  if (!r.ok) throw new AscError(r.status, json);
  return json;
}

async function all(key, path) {
  let out = [], next = path;
  for (let i = 0; next && i < 20; i++) {
    const j = await req(key, 'GET', next);
    out = out.concat(j.data || []);
    next = j.links && j.links.next ? j.links.next.replace(BASE(), '') : null;
  }
  return out;
}

export const asc = {
  test: (key) => req(key, 'GET', '/v1/devices?limit=1'),

  listDevices: (key) => all(key, '/v1/devices?filter[platform]=IOS&limit=200'),
  async registerDevice(key, name, udid) {
    try {
      const j = await req(key, 'POST', '/v1/devices', { data: { type: 'devices', attributes: { name: name.slice(0, 50), udid, platform: 'IOS' } } });
      return j.data;
    } catch (e) {
      if (e.status === 409) {
        const found = (await asc.listDevices(key)).find((d) => d.attributes.udid.toLowerCase() === udid.toLowerCase());
        if (found) {
          if (found.attributes.status !== 'ENABLED') await asc.setDevice(key, found.id, { status: 'ENABLED' });
          return found;
        }
      }
      throw e;
    }
  },
  setDevice: (key, id, attrs) => req(key, 'PATCH', `/v1/devices/${id}`, { data: { type: 'devices', id, attributes: attrs } }).then((j) => j.data),

  async ensureBundleId(key, identifier) {
    const list = await all(key, `/v1/bundleIds?filter[identifier]=${encodeURIComponent(identifier)}&limit=200`);
    const hit = list.find((b) => b.attributes.identifier === identifier);
    if (hit) return hit;
    const j = await req(key, 'POST', '/v1/bundleIds', { data: { type: 'bundleIds', attributes: { identifier, name: 'RA7AL Sign Wildcard', platform: 'IOS' } } });
    return j.data;
  },

  listCertificates: (key) => all(key, '/v1/certificates?filter[certificateType]=DISTRIBUTION,IOS_DISTRIBUTION&limit=200'),
  async createCertificate(key, csrPem) {
    const j = await req(key, 'POST', '/v1/certificates', { data: { type: 'certificates', attributes: { certificateType: 'DISTRIBUTION', csrContent: csrPem } } });
    return j.data;
  },

  listProfiles: (key) => all(key, '/v1/profiles?filter[profileType]=IOS_APP_ADHOC&limit=200'),
  deleteProfile: (key, id) => req(key, 'DELETE', `/v1/profiles/${id}`).catch((e) => { if (e.status !== 404) throw e; }),
  async createProfile(key, { name, bundleIdId, certId, deviceIds }) {
    const j = await req(key, 'POST', '/v1/profiles', {
      data: {
        type: 'profiles',
        attributes: { name: name.slice(0, 50), profileType: 'IOS_APP_ADHOC' },
        relationships: {
          bundleId: { data: { type: 'bundleIds', id: bundleIdId } },
          certificates: { data: [{ type: 'certificates', id: certId }] },
          devices: { data: deviceIds.map((id) => ({ type: 'devices', id })) },
        },
      },
    });
    return j.data;
  },
};
