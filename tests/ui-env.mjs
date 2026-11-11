// بيئة لاختبار الواجهة: خادم آبل وهمي + خادم رحّال للتوقيع
import { spawn } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { startMockAsc } from './mock-asc.mjs';
const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = process.argv[2];
const { publicKey, privateKey } = crypto.generateKeyPairSync('ec', { namedCurve: 'P-256' });
const KEY = { issuerId: '57246542-96fe-1a63-e053-0824d011072a', keyId: 'ABCDE12345' };
fs.writeFileSync(path.join(OUT, 'AuthKey_ABCDE12345.p8'), privateKey.export({ type: 'pkcs8', format: 'pem' }));
const mock = await startMockAsc({ publicKey, ...KEY });
const srv = spawn(process.execPath, ['server/index.js'], { cwd: ROOT, stdio: 'inherit', env: { ...process.env, PORT: '18777', DATA_DIR: path.join(OUT, 'data'), ZSIGN_BIN: path.join(ROOT, 'tests/fake-zsign.mjs'), ASC_BASE: mock.url, PUBLIC_URL: 'https://sign.example.ts.net' } });
process.on('SIGTERM', () => { srv.kill(); mock.close(); process.exit(0); });
