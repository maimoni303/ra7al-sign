// رحّال للتوقيع — تسجيل أجهزة العائلة: ملف تعريف يرسل UDID تلقائيًا ثم يسجّل الجهاز
import plist from 'plist';
import crypto from 'node:crypto';

export function mobileconfig({ callbackUrl, title = 'RA7AL Sign', token }) {
  const uuid = crypto.randomUUID().toUpperCase();
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>PayloadContent</key>
  <dict>
    <key>URL</key><string>${callbackUrl}</string>
    <key>DeviceAttributes</key>
    <array><string>UDID</string><string>PRODUCT</string><string>VERSION</string><string>DEVICE_NAME</string><string>SERIAL</string></array>
    <key>Challenge</key><string>${token}</string>
  </dict>
  <key>PayloadOrganization</key><string>RA7AL AL3OMR</string>
  <key>PayloadDisplayName</key><string>${title} — تسجيل الجهاز</string>
  <key>PayloadDescription</key><string>يرسل معرّف جهازك (UDID) مرة واحدة لتسجيله في رحّال للتوقيع. لا يغيّر أي إعداد في جوالك.</string>
  <key>PayloadVersion</key><integer>1</integer>
  <key>PayloadUUID</key><string>${uuid}</string>
  <key>PayloadIdentifier</key><string>com.ra7al.sign.enroll.${token}</string>
  <key>PayloadType</key><string>Profile Service</string>
</dict>
</plist>`;
}

// iOS يرسل plist موقّعًا (PKCS7) — نستخرج الجزء النصي منه
export function parseCallback(buf) {
  const s = buf.toString('latin1');
  const a = s.indexOf('<?xml'), b = s.indexOf('</plist>');
  if (a < 0 || b < 0) throw new Error('bad device response');
  const p = plist.parse(Buffer.from(s.slice(a, b + 8), 'latin1').toString('utf8'));
  if (!p.UDID || !/^[0-9A-Fa-f-]{24,40}$/.test(p.UDID)) throw new Error('no UDID');
  return { udid: p.UDID, product: p.PRODUCT || '', version: p.VERSION || '', deviceName: p.DEVICE_NAME || '', challenge: p.CHALLENGE || '' };
}

// اسم تسويقي تقريبي للموديل
export function modelName(product) {
  if (!product) return '';
  if (/^iPad/.test(product)) return 'iPad';
  if (/^iPhone/.test(product)) return 'iPhone';
  return product;
}
