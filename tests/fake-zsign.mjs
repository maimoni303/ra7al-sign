#!/usr/bin/env node
// zsign وهمي للاختبار: ينسخ الملف ويكتب أيقونة وبيانات، ويسجّل الوسائط
import fs from 'node:fs';
import path from 'node:path';
const a = process.argv.slice(2);
const get = (f) => { const i = a.indexOf(f); return i >= 0 ? a[i + 1] : null; };
fs.appendFileSync(process.env.FAKE_ZSIGN_LOG || '/dev/null', JSON.stringify(a) + '\n');
if (process.env.FAKE_ZSIGN_FAIL) { console.error('>>> Sign Failed!'); process.exit(1); }
const out = get('-o'), input = a[a.length - 1], meta = get('-x');
for (const f of [get('-m'), input, ...(get('-c') ? [get('-c'), get('-k')] : [get('-k')])]) if (!fs.existsSync(f)) { console.error('missing ' + f); process.exit(2); }
console.log('>>> Signing:\t' + input); console.log('>>> Done.');
fs.copyFileSync(input, out);
if (meta) { fs.mkdirSync(meta, { recursive: true }); fs.writeFileSync(path.join(meta, 'metadata.json'), '{}');
  fs.writeFileSync(path.join(meta, 'abc.png'), Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64')); }
