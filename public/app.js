// رحّال للتوقيع — الواجهة
(() => {
'use strict';
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const L = {
  ar: {
    app: 'رحّال للتوقيع', sub: 'RA7AL AL3OMR SIGN', certOk: 'الشهادة سارية', certNo: 'غير مُعد', certSoon: 'تنتهي قريبًا',
    tSign: 'توقيع', tApps: 'تطبيقاتي', tFamily: 'العائلة', tCert: 'الشهادة',
    setupTitle: 'أهلًا بك — أنشئ كلمة المرور', setupNote: 'كلمة مرور لحماية لوحة التحكم (8 أحرف على الأقل).', password: 'كلمة المرور', password2: 'تأكيد كلمة المرور', create: 'إنشاء',
    loginTitle: 'تسجيل الدخول', login: 'دخول', badPass: 'كلمة المرور غير صحيحة', mismatch: 'كلمتا المرور غير متطابقتين', min8: '8 أحرف على الأقل', wait: 'محاولات كثيرة — انتظر 15 دقيقة',
    famLogin: 'دخول العائلة', famPass: 'كلمة مرور العائلة',
    pick: 'اختر ملف IPA', pickNote: 'من الملفات، أو الصق رابط تنزيل مباشر', orUrl: 'أو رابط مباشر لملف IPA', fetch: 'تنزيل',
    uploading: 'جاري الرفع', reading: 'جاري القراءة…', appName: 'اسم التطبيق على الشاشة', version: 'الإصدار', size: 'الحجم',
    rmExt: 'إزالة الإضافات وتطبيق الساعة (يحل أغلب مشاكل التثبيت)', devicesAllowed: 'الأجهزة المسموحة', allFamily: 'كل الأجهزة المسجلة',
    signInstall: 'توقيع وتثبيت', signing: 'جاري التوقيع…', signed: 'تم التوقيع ✓', install: 'تثبيت', installNow: 'تثبيت الآن', resign: 'إعادة توقيع', remove: 'حذف',
    notReady: 'أكمل إعداد الشهادة أولًا من تبويب «الشهادة»', goCert: 'إعداد الشهادة', needHttps: 'التثبيت على الآيفون يحتاج رابطًا آمنًا (https). اضبط «الرابط العام» من تبويب الشهادة.',
    apps: 'تطبيقات', noApps: 'لا توجد تطبيقات موقّعة بعد', expiresIn: 'ينتهي بعد', days: 'يومًا', needs: 'يحتاج إعادة توقيع', download: 'تنزيل IPA', confirmDel: 'تأكيد الحذف؟', cancel: 'إلغاء', yes: 'نعم',
    famLink: 'رابط التثبيت للعائلة', famLinkNote: 'يفتحونه بكلمة مرور العائلة ويثبّتون منه', copy: 'نسخ الرابط', copied: 'تم النسخ', whatsapp: 'إرسال واتساب', setFamPass: 'حدّد كلمة مرور العائلة أولًا',
    devices: 'أجهزة العائلة', of100: 'من 100', me: 'أنا', registered: 'مسجّل', pending: 'معلّق', disabled: 'موقوف', addDevice: 'إضافة جهاز جديد',
    addDeviceNote: 'أرسل له رابط التسجيل، يفتحه من Safari ويضغط «تثبيت» مرة واحدة، فيُضاف جهازه تلقائيًا وتُعاد توقيع التطبيقات له.',
    deviceName: 'اسم الجهاز', deviceNamePh: 'مثال: جوال أبو فلان', makeLink: 'إنشاء رابط التسجيل', pendingLinks: 'روابط بانتظار الفتح', sync: 'مزامنة مع آبل', manualUdid: 'إضافة يدوية بالـ UDID',
    disable: 'إيقاف', enable: 'تفعيل', rename: 'تغيير الاسم', save: 'حفظ', limitNote: 'آبل تسمح بحذف الأجهزة مرة واحدة سنويًا عند تجديد العضوية، فسجّل فقط من تحتاجه.',
    cert: 'الشهادة', certValid: 'شهادة المطوّر سارية', certExp: 'تنتهي', profile: 'ملف التعريف', deviceCount: 'أجهزة', renewCert: 'إنشاء شهادة جديدة', rebuild: 'تحديث ملف التعريف',
    setupWizard: 'إعداد الشهادة', modeApi: 'مفتاح App Store Connect (موصى به — كل شيء آلي)', modeManual: 'رفع شهادة p12 وملف تعريف جاهزين',
    issuer: 'Issuer ID', keyId: 'Key ID', p8: 'ملف المفتاح AuthKey_XXXX.p8', p8Paste: 'أو الصق محتوى المفتاح', connect: 'ربط وإنشاء الشهادة', connected: 'تم الربط ✓',
    apiSteps: ['افتح appstoreconnect.apple.com من Safari وسجّل الدخول.', 'Users and Access ← Integrations ← App Store Connect API.', 'اضغط + لإنشاء مفتاح، الاسم: RA7AL Sign، الصلاحية: Admin.', 'انسخ Issuer ID و Key ID، ثم نزّل الملف .p8 (يُنزّل مرة واحدة فقط).', 'ارجع هنا وارفع الملف واضغط «ربط».'],
    p12: 'ملف الشهادة .p12', p12Pass: 'كلمة مرور p12', prov: 'ملف التعريف .mobileprovision', upload: 'رفع وحفظ',
    settings: 'الإعدادات', theme: 'المظهر', light: 'فاتح', dark: 'داكن', auto: 'تلقائي', lang: 'اللغة', publicUrl: 'الرابط العام (https)', webhook: 'رابط التنبيهات (n8n → واتساب)', alertDays: 'التنبيه قبل الانتهاء بـ (يوم)',
    autoResign: 'إعادة التوقيع تلقائيًا عند إضافة جهاز', testAlert: 'تنبيه تجريبي', famPassSet: 'كلمة مرور العائلة', changePass: 'تغيير كلمة المرور', current: 'الحالية', newPass: 'الجديدة', logout: 'تسجيل الخروج',
    saved: 'تم الحفظ', error: 'خطأ', activity: 'سجل النشاط', none: 'لا يوجد', bundlePrefix: 'بادئة المعرّف',
    familyTitle: 'تطبيقات العائلة', familyNote: 'اضغط «تثبيت» ثم «تثبيت» مرة أخرى في النافذة، وتابع التحميل من الشاشة الرئيسية.',
    trustNote: 'أول مرة فقط: إذا ظهر «مطوّر غير موثوق» افتح الإعدادات ← عام ← VPN وإدارة الأجهزة ← وثّق المطوّر. ومع iOS 16+ فعّل «وضع المطوّر» من الإعدادات ← الخصوصية والأمان.',
    footer: 'رحّال للتوقيع · RA7AL AL3OMR · على سيرفرك المنزلي',
  },
  en: {
    app: 'RA7AL Sign', sub: 'RA7AL AL3OMR SIGN', certOk: 'Certificate valid', certNo: 'Not set up', certSoon: 'Expiring soon',
    tSign: 'Sign', tApps: 'My apps', tFamily: 'Family', tCert: 'Certificate',
    setupTitle: 'Welcome — create a password', setupNote: 'A password to protect the dashboard (at least 8 characters).', password: 'Password', password2: 'Confirm password', create: 'Create',
    loginTitle: 'Sign in', login: 'Sign in', badPass: 'Wrong password', mismatch: 'Passwords do not match', min8: 'At least 8 characters', wait: 'Too many attempts — wait 15 minutes',
    famLogin: 'Family sign-in', famPass: 'Family password',
    pick: 'Choose an IPA file', pickNote: 'From Files, or paste a direct download link', orUrl: 'Or a direct IPA link', fetch: 'Fetch',
    uploading: 'Uploading', reading: 'Reading…', appName: 'Home-screen name', version: 'Version', size: 'Size',
    rmExt: 'Remove extensions & watch app (fixes most install issues)', devicesAllowed: 'Allowed devices', allFamily: 'All registered devices',
    signInstall: 'Sign & install', signing: 'Signing…', signed: 'Signed ✓', install: 'Install', installNow: 'Install now', resign: 'Re-sign', remove: 'Delete',
    notReady: 'Finish the certificate setup in the “Certificate” tab first', goCert: 'Set up certificate', needHttps: 'Installing on iPhone needs a secure (https) link. Set the “Public URL” in the Certificate tab.',
    apps: 'apps', noApps: 'No signed apps yet', expiresIn: 'Expires in', days: 'days', needs: 'Needs re-signing', download: 'Download IPA', confirmDel: 'Confirm delete?', cancel: 'Cancel', yes: 'Yes',
    famLink: 'Family install link', famLinkNote: 'They open it with the family password and install from it', copy: 'Copy link', copied: 'Copied', whatsapp: 'Send via WhatsApp', setFamPass: 'Set a family password first',
    devices: 'Family devices', of100: 'of 100', me: 'Me', registered: 'Registered', pending: 'Pending', disabled: 'Disabled', addDevice: 'Add a new device',
    addDeviceNote: 'Send them the enrollment link; they open it in Safari and tap “Install” once. Their device is added and apps are re-signed for it.',
    deviceName: 'Device name', deviceNamePh: 'e.g. Dad’s iPhone', makeLink: 'Create enrollment link', pendingLinks: 'Links waiting to be opened', sync: 'Sync with Apple', manualUdid: 'Add manually by UDID',
    disable: 'Disable', enable: 'Enable', rename: 'Rename', save: 'Save', limitNote: 'Apple only lets you remove devices once a year at renewal, so register only who needs it.',
    cert: 'Certificate', certValid: 'Developer certificate valid', certExp: 'Expires', profile: 'Provisioning profile', deviceCount: 'devices', renewCert: 'Create new certificate', rebuild: 'Refresh profile',
    setupWizard: 'Certificate setup', modeApi: 'App Store Connect key (recommended — fully automatic)', modeManual: 'Upload a ready .p12 and profile',
    issuer: 'Issuer ID', keyId: 'Key ID', p8: 'Key file AuthKey_XXXX.p8', p8Paste: 'Or paste the key contents', connect: 'Connect & create certificate', connected: 'Connected ✓',
    apiSteps: ['Open appstoreconnect.apple.com in Safari and sign in.', 'Users and Access → Integrations → App Store Connect API.', 'Tap + to create a key, name: RA7AL Sign, access: Admin.', 'Copy the Issuer ID and Key ID, then download the .p8 (only downloadable once).', 'Come back here, upload the file and tap “Connect”.'],
    p12: 'Certificate .p12', p12Pass: 'p12 password', prov: 'Profile .mobileprovision', upload: 'Upload & save',
    settings: 'Settings', theme: 'Appearance', light: 'Light', dark: 'Dark', auto: 'Auto', lang: 'Language', publicUrl: 'Public URL (https)', webhook: 'Alerts webhook (n8n → WhatsApp)', alertDays: 'Alert before expiry (days)',
    autoResign: 'Re-sign automatically when a device is added', testAlert: 'Test alert', famPassSet: 'Family password', changePass: 'Change password', current: 'Current', newPass: 'New', logout: 'Sign out',
    saved: 'Saved', error: 'Error', activity: 'Activity log', none: 'None', bundlePrefix: 'Bundle prefix',
    familyTitle: 'Family apps', familyNote: 'Tap “Install”, confirm “Install” in the popup, then watch it download on the home screen.',
    trustNote: 'First time only: if you see “Untrusted Developer”, go to Settings → General → VPN & Device Management → Trust. On iOS 16+ also enable Developer Mode in Settings → Privacy & Security.',
    footer: 'RA7AL Sign · RA7AL AL3OMR · on your home server',
  },
};
let lang = 'ar', S = null, tab = 'sign', upload = null, famMode = location.pathname.startsWith('/f');
const t = (k) => (L[lang][k] ?? L.ar[k] ?? k);
const icon = (d) => `<svg class="i" viewBox="0 0 24 24" aria-hidden="true">${d}</svg>`;
const I = {
  sign: '<path d="M12 16V4M7 9l5-5 5 5"/><path d="M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3"/>',
  apps: '<rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="7" rx="2"/><rect x="3" y="14" width="7" height="7" rx="2"/><rect x="14" y="14" width="7" height="7" rx="2"/>',
  family: '<circle cx="9" cy="8" r="3"/><path d="M3 20c0-3 3-5 6-5s6 2 6 5"/><circle cx="17" cy="9" r="2.5"/><path d="M15.5 14.5c3 .2 5.5 2 5.5 5"/>',
  cert: '<rect x="4" y="3" width="16" height="13" rx="2"/><path d="M8 8h8M8 11h5"/><circle cx="16" cy="18" r="3"/><path d="M14.5 20.5 14 23l2-1 2 1-.5-2.5"/>',
};
const logo = '<svg class="logo" viewBox="0 0 34 34" aria-hidden="true"><path d="M2 20 H10 C9 15 12 11 15 12 C16 12.5 17 14 17 14 C17 14 18 12.5 19 12 C22 11 25 15 24 20 L17 26 L10 20 M24 20 H32"/></svg>';

// ---------- أدوات ----------
async function api(path, opts = {}) {
  const r = await fetch('/api/' + path, { method: opts.method || (opts.body ? 'POST' : 'GET'), headers: opts.form ? undefined : { 'Content-Type': 'application/json' }, body: opts.form || (opts.body ? JSON.stringify(opts.body) : undefined), credentials: 'same-origin' });
  let j = {}; try { j = await r.json(); } catch {}
  if (!r.ok) throw Object.assign(new Error(j.error || r.status), { status: r.status, data: j });
  return j;
}
let toastT;
function toast(m, ms = 2400) { const e = $('#toast'); e.textContent = m; e.classList.remove('hidden'); clearTimeout(toastT); toastT = setTimeout(() => e.classList.add('hidden'), ms); }
function sheet(html, mount) { const s = $('#sheet'); s.innerHTML = html; s.classList.remove('hidden'); $('#sheet-bg').classList.remove('hidden'); mount && mount(s); }
function closeSheet() { $('#sheet').classList.add('hidden'); $('#sheet-bg').classList.add('hidden'); $('#sheet').innerHTML = ''; }
function confirmBox(msg) { return new Promise((res) => sheet(`<h2>${esc(msg)}</h2><div class="grid2"><button class="btn" data-a="n">${t('cancel')}</button><button class="btn danger" data-a="y">${t('yes')}</button></div>`, (s) => { s.onclick = (e) => { const a = e.target.closest('[data-a]')?.dataset.a; if (!a) return; closeSheet(); res(a === 'y'); }; })); }
const mb = (b) => b ? (b / 1048576 >= 1024 ? (b / 1073741824).toFixed(2) + ' GB' : (b / 1048576).toFixed(1) + ' MB') : '—';
const daysLeft = (ts) => ts ? Math.floor((ts - Date.now()) / 864e5) : null;
const fmtDate = (ts) => ts ? new Date(ts).toLocaleDateString(lang === 'ar' ? 'ar-SA-u-ca-gregory' : 'en-GB') : '—';
async function copy(s) { try { await navigator.clipboard.writeText(s); } catch { const ta = document.createElement('textarea'); ta.value = s; document.body.appendChild(ta); ta.select(); try { document.execCommand('copy'); } catch {} ta.remove(); } toast(t('copied')); window.__copied = s; }
const errMsg = (e) => ({ 'bad password': t('badPass'), wait: t('wait'), min8: t('min8'), 'not ready': t('notReady') }[e.message] || e.message);

function applyLangTheme(l, th) {
  lang = l === 'en' ? 'en' : 'ar';
  document.documentElement.lang = lang; document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
  const dark = th === 'dark' || (th !== 'light' && !matchMedia('(prefers-color-scheme: light)').matches);
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';
  document.title = t('app');
}

// ---------- الدخول ----------
function authView(kind) {
  const setup = kind === 'setup', fam = kind === 'family';
  $('#root').innerHTML = `<div class="auth"><form class="card" id="auth-form">
    <div class="brand">${logo}<div><div class="t1">${t('app')}</div><div class="t2">${t('sub')}</div></div></div>
    <h2>${setup ? t('setupTitle') : fam ? t('famLogin') : t('loginTitle')}</h2>${setup ? `<div class="note">${t('setupNote')}</div>` : ''}
    <label class="field">${fam ? t('famPass') : t('password')}<input type="password" id="pw" autocomplete="${setup ? 'new-password' : 'current-password'}" required></label>
    ${setup ? `<label class="field">${t('password2')}<input type="password" id="pw2" autocomplete="new-password" required></label>` : ''}
    <div class="err" id="auth-err"></div>
    <button class="btn primary big" type="submit">${setup ? t('create') : t('login')}</button>
    <div class="row between"><button type="button" class="link" id="lang-t">${lang === 'ar' ? 'English' : 'العربية'}</button>${!setup ? `<button type="button" class="link" id="mode-t">${fam ? t('loginTitle') : t('famLogin')}</button>` : ''}</div>
  </form></div>`;
  $('#lang-t').onclick = () => { applyLangTheme(lang === 'ar' ? 'en' : 'ar', document.documentElement.dataset.theme); authView(kind); };
  const mt = $('#mode-t'); if (mt) mt.onclick = () => { famMode = !fam; authView(fam ? 'login' : 'family'); };
  $('#auth-form').onsubmit = async (e) => {
    e.preventDefault(); const pw = $('#pw').value, er = $('#auth-err'); er.textContent = '';
    try {
      if (setup) { if (pw.length < 8) return (er.textContent = t('min8')); if (pw !== $('#pw2').value) return (er.textContent = t('mismatch')); await api('setup', { body: { password: pw } }); }
      else await api('login', { body: { password: pw, family: fam } });
      boot();
    } catch (x) { er.textContent = errMsg(x); }
  };
  setTimeout(() => $('#pw').focus(), 50);
}

// ---------- الإطار ----------
function certPill() {
  if (!S.ready) return `<span class="pill warn"><i></i>${t('certNo')}</span>`;
  const d = Math.min(daysLeft(S.cert.expires) ?? 999, daysLeft(S.profile.expires) ?? 999);
  return d <= S.settings.alertDays ? `<span class="pill warn"><i></i>${t('certSoon')} · ${d}</span>` : `<span class="pill ok"><i></i>${t('certOk')}</span>`;
}
function shell() {
  $('#root').innerHTML = `<div id="app">
    <header class="top"><div class="brand">${logo}<div><div class="t1">${t('app')}</div><div class="t2">${t('sub')}</div></div></div><div id="pill">${certPill()}</div></header>
    <main id="view"></main>
    <nav class="tabs" id="tabs">
      ${[['sign', 'tSign'], ['apps', 'tApps'], ['family', 'tFamily'], ['cert', 'tCert']].map(([k, l]) => `<button data-tab="${k}" class="${tab === k ? 'on' : ''}">${icon(I[k])}<span>${t(l)}</span></button>`).join('')}
    </nav></div>`;
  $('#tabs').onclick = (e) => { const b = e.target.closest('[data-tab]'); if (b) { tab = b.dataset.tab; render(); } };
  render();
}
function render() {
  $$('#tabs button').forEach((b) => b.classList.toggle('on', b.dataset.tab === tab));
  $('#pill').innerHTML = certPill();
  ({ sign: viewSign, apps: viewApps, family: viewFamily, cert: viewCert })[tab]();
}
async function refresh() { S = await api('state'); applyLangTheme(S.settings.lang, S.settings.theme); }

// ---------- 1) التوقيع ----------
function viewSign() {
  const v = $('#view');
  const warn = !S.ready ? `<div class="alert">${t('notReady')} <button class="link" id="go-cert">${t('goCert')}</button></div>` : !S.https ? `<div class="alert info">${t('needHttps')}</div>` : '';
  v.innerHTML = `${warn}
    <label class="drop" id="drop">${icon(I.sign)}<div class="b">${t('pick')}</div><div class="small muted">${t('pickNote')}</div><input type="file" id="ipa" accept=".ipa,application/octet-stream" hidden></label>
    <form class="row" id="url-form"><label class="field grow" style="margin:0"><span class="hidden">${t('orUrl')}</span><input id="ipa-url" type="url" placeholder="${t('orUrl')}" class="ltr"></label><button class="btn" type="submit">${t('fetch')}</button></form>
    <div id="up-progress" class="card hidden"><div class="row between small"><span id="up-text">${t('uploading')}</span><span id="up-pct">0%</span></div><div class="bar"><i id="up-bar"></i></div></div>
    <div id="up-card"></div>`;
  const go = $('#go-cert'); if (go) go.onclick = () => { tab = 'cert'; render(); };
  const inp = $('#ipa'), drop = $('#drop');
  inp.onchange = () => inp.files[0] && doUpload(inp.files[0]);
  drop.ondragover = (e) => { e.preventDefault(); drop.classList.add('over'); };
  drop.ondragleave = () => drop.classList.remove('over');
  drop.ondrop = (e) => { e.preventDefault(); drop.classList.remove('over'); const f = e.dataTransfer.files[0]; if (f) doUpload(f); };
  $('#url-form').onsubmit = async (e) => {
    e.preventDefault(); const url = $('#ipa-url').value.trim(); if (!url) return;
    progress(true, t('reading'), 50);
    try { upload = await api('upload-url', { body: { url } }); progress(false); upCard(); } catch (x) { progress(false); toast(errMsg(x), 4000); }
  };
  if (upload) upCard();
}
function progress(on, text, pct) {
  $('#up-progress').classList.toggle('hidden', !on);
  if (on) { $('#up-text').textContent = text; $('#up-pct').textContent = Math.round(pct) + '%'; $('#up-bar').style.width = pct + '%'; }
}
function doUpload(file) {
  const fd = new FormData(); fd.append('ipa', file, file.name);
  const x = new XMLHttpRequest(); x.open('POST', '/api/upload');
  x.upload.onprogress = (e) => e.lengthComputable && progress(true, t('uploading'), (e.loaded / e.total) * 95);
  x.onload = () => {
    progress(false); let j = {}; try { j = JSON.parse(x.responseText); } catch {}
    if (x.status !== 200) return toast(j.error || t('error'), 4000);
    upload = j; upCard();
  };
  x.onerror = () => { progress(false); toast(t('error')); };
  progress(true, t('uploading'), 1); x.send(fd);
}
function upCard() {
  const u = upload; if (!u) return;
  $('#up-card').innerHTML = `<div class="card" id="sign-card">
    <div class="row"><div class="app-ic">${esc((u.name || '?').slice(0, 1))}</div><div class="grow"><div class="b">${esc(u.name)}</div><div class="small muted ltr">${esc(u.bundleId)}</div><div class="small muted">${t('version')} ${esc(u.version)} · ${mb(u.size)}</div></div>
      <button class="btn small" id="up-x" aria-label="${t('remove')}">✕</button></div>
    <label class="field">${t('appName')}<input id="app-name" value="${esc(u.name)}" maxlength="40"></label>
    <label class="item" style="border:0;min-height:40px"><span class="small">${t('rmExt')}</span><input type="checkbox" class="switch" id="rm-ext" ${S.settings.rmExtensions ? 'checked' : ''}></label>
    <div class="row between small"><span>${t('devicesAllowed')}</span><span class="ok b">${t('allFamily')} (${(S.profile?.devices || []).length})</span></div>
    <div id="sign-prog" class="hidden"><div class="row between small muted"><span id="sign-text">${t('signing')}</span><span id="sign-pct"></span></div><div class="bar"><i id="sign-bar"></i></div></div>
    <button class="btn primary big wide" id="do-sign" ${S.ready ? '' : 'disabled'}>${t('signInstall')}</button></div>`;
  $('#up-x').onclick = () => { upload = null; $('#up-card').innerHTML = ''; };
  $('#do-sign').onclick = async () => {
    const btn = $('#do-sign'); btn.disabled = true;
    try {
      const r = await api('sign', { body: { uploadId: u.uploadId, name: $('#app-name').value.trim() || u.name, rmExtensions: $('#rm-ext').checked } });
      $('#sign-prog').classList.remove('hidden');
      const res = await waitJob(r.job, (j) => { $('#sign-bar').style.width = j.progress + '%'; $('#sign-pct').textContent = j.progress + '%'; });
      upload = null; await refresh();
      const a = S.apps.find((x) => x.id === res.result.appId);
      $('#up-card').innerHTML = `<div class="card"><div class="row"><div class="app-ic">${a.icon ? `<img class="app-ic" src="${a.icon}" alt="">` : esc(a.name.slice(0, 1))}</div><div class="grow"><div class="b">${esc(a.name)}</div><div class="small ok">${t('signed')}</div></div></div>
        <a class="btn primary big wide" href="${a.install}" id="inst-now">${t('installNow')}</a><div class="note">${t('trustNote')}</div></div>`;
      $('#pill').innerHTML = certPill();
    } catch (x) { btn.disabled = false; $('#sign-prog').classList.add('hidden'); toast(errMsg(x), 5000); }
  };
}
async function waitJob(id, onTick) {
  for (;;) {
    const j = await api('jobs/' + id); onTick && onTick(j);
    if (j.state === 'done') return j;
    if (j.state === 'error') throw new Error(j.msg);
    await new Promise((r) => setTimeout(r, 700));
  }
}

// ---------- 2) تطبيقاتي ----------
function appRow(a, admin) {
  const ic = a.icon ? `<img class="app-ic" src="${a.icon}" alt="">` : `<div class="app-ic">${esc((a.name || '?').slice(0, 1))}</div>`;
  const left = S.profile ? daysLeft(Math.min(S.profile.expires || Infinity, S.cert?.expires || Infinity)) : null;
  const sub = a.needsResign ? `<span class="warn">${t('needs')}</span>` : `${esc(a.version)}${left != null && admin ? ` · ${t('expiresIn')} ${left} ${t('days')}` : ''}`;
  return `<div class="li" data-app="${a.id}">${ic}<div class="grow"><div class="t1">${esc(a.name)}</div><div class="t2">${sub}</div></div>
    ${a.needsResign && admin ? `<button class="btn small" data-act="resign" style="color:var(--warn);border-color:var(--warn)">${t('resign')}</button>` : `<a class="btn primary small" href="${a.install}" data-act="install">${t('install')}</a>`}
    ${admin ? `<button class="btn small" data-act="more" aria-label="…">⋯</button>` : ''}</div>`;
}
function viewApps() {
  const v = $('#view');
  const famUrl = `${S.base}/f`;
  v.innerHTML = `<div class="row between"><h1>${t('tApps')}</h1><span class="muted small">${S.apps.length} ${t('apps')}</span></div>
    <div class="card"><div class="list" id="apps">${S.apps.length ? S.apps.map((a) => appRow(a, true)).join('') : `<div class="empty">${t('noApps')}</div>`}</div></div>
    <div class="card"><h2>${t('famLink')}</h2><div class="note">${t('famLinkNote')}</div><div class="ltr small muted">${esc(famUrl)}</div>
      ${S.hasFamilyPassword ? '' : `<div class="alert">${t('setFamPass')}</div>`}
      <div class="grid2"><button class="btn" id="fam-copy">${t('copy')}</button><a class="btn wa" id="fam-wa" href="https://wa.me/?text=${encodeURIComponent(`${t('familyTitle')}: ${famUrl}`)}" target="_blank" rel="noopener">${t('whatsapp')}</a></div></div>`;
  $('#fam-copy').onclick = () => copy(famUrl);
  $('#apps').onclick = async (e) => {
    const b = e.target.closest('[data-act]'); if (!b) return;
    const a = S.apps.find((x) => x.id === b.closest('[data-app]').dataset.app);
    if (b.dataset.act === 'resign') { b.disabled = true; try { const r = await api('sign', { body: { appId: a.id } }); await waitJob(r.job); await refresh(); render(); toast(t('signed')); } catch (x) { toast(errMsg(x), 5000); b.disabled = false; } }
    if (b.dataset.act === 'more') {
      sheet(`<h2>${esc(a.name)}</h2><div class="small muted ltr">${esc(a.bundleId)}</div><div class="small muted">${t('size')}: ${mb(a.size)} · ${fmtDate(a.signedAt)}</div>
        <a class="btn primary" href="${a.install}">${t('install')}</a><a class="btn" href="${a.download}" download>${t('download')}</a>
        <button class="btn" data-a="resign">${t('resign')}</button><button class="btn danger" data-a="del">${t('remove')}</button><button class="btn" data-a="x">${t('cancel')}</button>`, (s) => {
        s.onclick = async (ev) => {
          const x = ev.target.closest('[data-a]')?.dataset.a; if (!x) return;
          if (x === 'x') closeSheet();
          if (x === 'resign') { closeSheet(); try { const r = await api('sign', { body: { appId: a.id } }); await waitJob(r.job); await refresh(); render(); toast(t('signed')); } catch (er) { toast(errMsg(er), 5000); } }
          if (x === 'del') { closeSheet(); if (await confirmBox(t('confirmDel'))) { await api('apps/' + a.id, { method: 'DELETE' }); await refresh(); render(); } }
        };
      });
    }
  };
}

// ---------- 3) العائلة ----------
function viewFamily() {
  const v = $('#view'), devs = S.devices;
  const badge = (d) => d.status === 'enabled' ? `<span class="small ok">${t('registered')}</span>` : d.status === 'pending' ? `<span class="small warn">${t('pending')}</span>` : `<span class="small bad">${t('disabled')}</span>`;
  v.innerHTML = `<div class="row between"><h1>${t('devices')}</h1><span class="ok small b">${devs.filter((d) => d.status === 'enabled').length} ${t('of100')}</span></div>
    <div class="card"><div class="list" id="devs">${devs.length ? devs.map((d, i) => `<div class="li" data-dev="${esc(d.id)}"><span class="av">${i + 1}</span><div class="grow"><div class="t1">${esc(d.name)}</div><div class="t2">${esc(d.model || d.cls || '')} · <span class="ltr">${esc(d.udid.slice(0, 8))}…</span></div></div>${badge(d)}<button class="btn small" data-act="more" aria-label="…">⋯</button></div>`).join('') : `<div class="empty">${t('none')}</div>`}</div>
      ${S.asc ? `<button class="btn" id="sync">${t('sync')}</button>` : ''}</div>
    <form class="card" id="enroll-form"><h2>${t('addDevice')}</h2><div class="note">${t('addDeviceNote')}</div>
      <label class="field">${t('deviceName')}<input id="dev-name" placeholder="${t('deviceNamePh')}" maxlength="40" required></label>
      <button class="btn primary big" type="submit">${t('makeLink')}</button><div id="enroll-out"></div></form>
    ${S.enrollments.length ? `<div class="card"><h2>${t('pendingLinks')}</h2><div class="list" id="enrolls">${S.enrollments.map((e) => `<div class="li" data-tok="${e.token}"><div class="grow"><div class="t1">${esc(e.name)}</div><div class="t2">${fmtDate(e.created)}</div></div><button class="btn small" data-act="copy">${t('copy')}</button><a class="btn small wa" href="https://wa.me/?text=${encodeURIComponent(e.url)}" target="_blank" rel="noopener">WA</a><button class="btn small danger" data-act="del">✕</button></div>`).join('')}</div></div>` : ''}
    <details class="card"><summary>${t('manualUdid')}</summary><form id="udid-form" style="display:flex;flex-direction:column;gap:10px;margin-top:10px">
      <label class="field">${t('deviceName')}<input id="u-name" maxlength="40" required></label><label class="field">UDID<input id="u-udid" class="ltr" required></label><button class="btn" type="submit">${t('save')}</button></form></details>
    <div class="note">${t('limitNote')}</div>`;
  const sy = $('#sync'); if (sy) sy.onclick = async () => { sy.disabled = true; try { await api('devices/sync', { body: {} }); await refresh(); render(); } catch (x) { toast(errMsg(x)); sy.disabled = false; } };
  $('#enroll-form').onsubmit = async (e) => {
    e.preventDefault();
    try {
      const r = await api('enroll', { body: { name: $('#dev-name').value.trim() } });
      $('#enroll-out').innerHTML = `<div class="ltr small muted" style="word-break:break-all">${esc(r.url)}</div><div class="grid2"><button type="button" class="btn" id="e-copy">${t('copy')}</button><a class="btn wa" href="https://wa.me/?text=${encodeURIComponent(r.url)}" target="_blank" rel="noopener">${t('whatsapp')}</a></div>`;
      $('#e-copy').onclick = () => copy(r.url);
      S.enrollments.unshift({ token: r.token, name: $('#dev-name').value.trim(), created: Date.now(), url: r.url }); window.__lastEnroll = r;
    } catch (x) { toast(errMsg(x)); }
  };
  const en = $('#enrolls'); if (en) en.onclick = async (e) => {
    const b = e.target.closest('[data-act]'); if (!b) return; const tok = b.closest('[data-tok]').dataset.tok; const item = S.enrollments.find((x) => x.token === tok);
    if (b.dataset.act === 'copy') copy(item.url);
    if (b.dataset.act === 'del') { await api('enroll/' + tok, { method: 'DELETE' }); await refresh(); render(); }
  };
  $('#udid-form').onsubmit = async (e) => { e.preventDefault(); try { await api('devices/add', { body: { name: $('#u-name').value.trim(), udid: $('#u-udid').value.trim() } }); await refresh(); render(); toast(t('saved')); } catch (x) { toast(errMsg(x), 4000); } };
  $('#devs').onclick = (e) => {
    const b = e.target.closest('[data-act]'); if (!b) return; const d = S.devices.find((x) => x.id === b.closest('[data-dev]').dataset.dev);
    sheet(`<h2>${esc(d.name)}</h2><div class="small muted ltr">${esc(d.udid)}</div>
      <label class="field">${t('rename')}<input id="d-name" value="${esc(d.name)}" maxlength="40"></label><button class="btn" data-a="ren">${t('save')}</button>
      ${S.asc ? `<button class="btn ${d.status === 'enabled' ? 'danger' : ''}" data-a="toggle">${d.status === 'enabled' ? t('disable') : t('enable')}</button>` : ''}<button class="btn" data-a="x">${t('cancel')}</button>`, (s) => {
      s.onclick = async (ev) => {
        const a = ev.target.closest('[data-a]')?.dataset.a; if (!a) return;
        try {
          if (a === 'x') return closeSheet();
          if (a === 'ren') await api('devices/' + d.id, { body: { name: $('#d-name').value.trim() } });
          if (a === 'toggle') await api('devices/' + d.id, { body: { enabled: d.status !== 'enabled' } });
          closeSheet(); await refresh(); render(); toast(t('saved'));
        } catch (x) { toast(errMsg(x), 4000); }
      };
    });
  };
}

// ---------- 4) الشهادة والإعدادات ----------
function ring(left, total = 365) {
  const r = 40, c = 2 * Math.PI * r, f = Math.max(0, Math.min(1, left / total));
  return `<svg class="ring" viewBox="0 0 96 96" role="img" aria-label="${left}"><circle class="bg" cx="48" cy="48" r="${r}"/><circle class="fg" cx="48" cy="48" r="${r}" stroke-dasharray="${(c * f).toFixed(1)} ${c.toFixed(1)}" transform="rotate(-90 48 48)"/><text x="48" y="52" text-anchor="middle" font-size="22">${left}</text><text x="48" y="68" text-anchor="middle" font-size="10" fill="currentColor">${t('days')}</text></svg>`;
}
function viewCert() {
  const v = $('#view'), s = S.settings;
  const left = S.ready ? Math.min(daysLeft(S.cert.expires), daysLeft(S.profile.expires)) : 0;
  const status = S.ready ? `<div class="card"><div class="row">${ring(left)}<div class="grow"><div class="b">${t('certValid')}</div><div class="small muted">${esc(S.cert.name)}</div><div class="small muted">${t('certExp')}: ${fmtDate(Math.min(S.cert.expires, S.profile.expires))}</div></div></div>
      <div class="item"><span>${t('profile')}</span><span class="ok b">${S.profile.devices.length} ${t('deviceCount')}</span></div>
      ${S.asc ? `<div class="grid2"><button class="btn" id="rebuild">${t('rebuild')}</button><button class="btn" id="renew">${t('renewCert')}</button></div>` : ''}</div>` : '';
  v.innerHTML = `<h1>${t('cert')}</h1>${status}
    <details class="card" ${S.ready ? '' : 'open'}><summary>${t('setupWizard')}</summary>
      <div class="seg" style="margin-top:12px" id="mode"><button data-m="api" class="on">${t('modeApi')}</button><button data-m="manual">${t('modeManual')}</button></div>
      <form id="api-form" style="display:flex;flex-direction:column;gap:10px;margin-top:12px">
        ${S.asc ? `<div class="alert info">${t('connected')} · ${esc(S.asc.keyId)}</div>` : ''}
        <ol class="steps">${t('apiSteps').map((x) => `<li>${esc(x)}</li>`).join('')}</ol>
        <label class="field">${t('issuer')}<input id="issuer" class="ltr" value="${esc(S.asc?.issuerId || '')}" required></label>
        <label class="field">${t('keyId')}<input id="keyid" class="ltr" value="${esc(S.asc?.keyId || '')}" required></label>
        <label class="field">${t('p8')}<input type="file" id="p8file" accept=".p8,text/plain,application/x-pem-file,application/octet-stream"></label>
        <label class="field">${t('p8Paste')}<textarea id="p8text" placeholder="-----BEGIN PRIVATE KEY-----"></textarea></label>
        <div class="err" id="api-err"></div><button class="btn primary big" type="submit">${t('connect')}</button></form>
      <form id="man-form" class="hidden" style="display:flex;flex-direction:column;gap:10px;margin-top:12px">
        <label class="field">${t('p12')}<input type="file" id="p12" accept=".p12,.pfx,application/x-pkcs12" required></label>
        <label class="field">${t('p12Pass')}<input type="password" id="p12pass"></label>
        <label class="field">${t('prov')}<input type="file" id="prov" accept=".mobileprovision,application/octet-stream" required></label>
        <div class="err" id="man-err"></div><button class="btn primary big" type="submit">${t('upload')}</button></form></details>
    <div class="card"><h2>${t('settings')}</h2>
      <div class="item"><span>${t('theme')}</span><span class="seg" id="s-theme">${['light', 'dark', 'auto'].map((x) => `<button data-v="${x}" class="${s.theme === x ? 'on' : ''}">${t(x)}</button>`).join('')}</span></div>
      <div class="item"><span>${t('lang')}</span><span class="seg" id="s-lang"><button data-v="ar" class="${s.lang === 'ar' ? 'on' : ''}">العربية</button><button data-v="en" class="${s.lang === 'en' ? 'on' : ''}">English</button></span></div>
      <label class="item"><span>${t('autoResign')}</span><input type="checkbox" class="switch" id="s-auto" ${s.autoResign ? 'checked' : ''}></label>
      <label class="item"><span>${t('rmExt')}</span><input type="checkbox" class="switch" id="s-rmext" ${s.rmExtensions ? 'checked' : ''}></label>
      <label class="field">${t('publicUrl')}<input id="s-url" class="ltr" value="${esc(s.publicUrl)}" placeholder="https://ra7al.example.ts.net"></label>
      <label class="field">${t('webhook')}<input id="s-hook" class="ltr" value="${esc(s.webhook)}" placeholder="http://192.168.100.70:5678/webhook/…"></label>
      <label class="field">${t('alertDays')}<input id="s-days" type="number" min="1" max="120" value="${s.alertDays}"></label>
      <div class="grid2"><button class="btn primary" id="s-save">${t('save')}</button><button class="btn" id="s-test">${t('testAlert')}</button></div></div>
    <form class="card" id="fam-form"><h2>${t('famPassSet')}</h2><label class="field">${t('famPass')}<input type="password" id="fam-pw" autocomplete="new-password" minlength="6" required></label><button class="btn" type="submit">${t('save')}</button></form>
    <form class="card" id="pw-form"><h2>${t('changePass')}</h2><label class="field">${t('current')}<input type="password" id="pw-cur" autocomplete="current-password" required></label><label class="field">${t('newPass')}<input type="password" id="pw-new" autocomplete="new-password" minlength="8" required></label><button class="btn" type="submit">${t('save')}</button></form>
    <details class="card"><summary>${t('activity')}</summary><div class="list">${S.log.map((l) => `<div class="li"><div class="grow"><div class="t2">${fmtDate(l.t)} · ${new Date(l.t).toLocaleTimeString(lang === 'ar' ? 'ar-SA' : 'en-GB', { hour: '2-digit', minute: '2-digit' })}</div><div class="${l.kind === 'error' ? 'bad' : ''} small">${esc(l.msg)}</div></div></div>`).join('') || `<div class="empty">${t('none')}</div>`}</div></details>
    <button class="btn danger" id="logout">${t('logout')}</button>
    <div class="note" style="text-align:center">${t('footer')} · v${esc(S.version)}</div>`;

  const rb = $('#rebuild'); if (rb) rb.onclick = async () => { rb.disabled = true; try { await api('profile/rebuild', { body: {} }); await refresh(); render(); toast(t('saved')); } catch (x) { toast(errMsg(x), 6000); rb.disabled = false; } };
  const rn = $('#renew'); if (rn) rn.onclick = async () => { if (!(await confirmBox(t('renewCert') + '؟'))) return; try { await api('cert/renew', { body: {} }); await refresh(); render(); toast(t('saved')); } catch (x) { toast(errMsg(x), 6000); } };
  $('#mode').onclick = (e) => { const b = e.target.closest('[data-m]'); if (!b) return; $$('#mode button').forEach((x) => x.classList.toggle('on', x === b)); $('#api-form').classList.toggle('hidden', b.dataset.m !== 'api'); $('#man-form').classList.toggle('hidden', b.dataset.m !== 'manual'); };
  $('#api-form').onsubmit = async (e) => {
    e.preventDefault(); const er = $('#api-err'); er.textContent = '';
    let p8 = $('#p8text').value.trim(); const f = $('#p8file').files[0]; if (f) p8 = (await f.text()).trim();
    const btn = e.submitter || $('#api-form button[type=submit]'); btn.disabled = true;
    try { const r = await api('asc-key', { body: { issuerId: $('#issuer').value.trim(), keyId: $('#keyid').value.trim(), p8 } }); await refresh(); render(); toast(r.warning || t('connected'), r.warning ? 6000 : 2400); }
    catch (x) { er.textContent = ({ issuer: 'Issuer ID ✗', keyid: 'Key ID ✗', p8: '.p8 ✗' }[x.message]) || x.message; btn.disabled = false; }
  };
  $('#man-form').onsubmit = async (e) => {
    e.preventDefault(); const er = $('#man-err'); er.textContent = '';
    const fd = new FormData(); fd.append('password', $('#p12pass').value); fd.append('p12', $('#p12').files[0]); fd.append('profile', $('#prov').files[0]);
    try { await api('manual', { form: fd, method: 'POST' }); await refresh(); render(); toast(t('saved')); } catch (x) { er.textContent = x.message; }
  };
  const seg = (sel, key) => ($(sel).onclick = async (e) => { const b = e.target.closest('[data-v]'); if (!b) return; await api('settings', { body: { [key]: b.dataset.v } }); await refresh(); shell(); });
  seg('#s-theme', 'theme'); seg('#s-lang', 'lang');
  $('#s-save').onclick = async () => {
    try { await api('settings', { body: { autoResign: $('#s-auto').checked, rmExtensions: $('#s-rmext').checked, publicUrl: $('#s-url').value.trim(), webhook: $('#s-hook').value.trim(), alertDays: +$('#s-days').value } }); await refresh(); render(); toast(t('saved')); }
    catch (x) { toast(errMsg(x)); }
  };
  $('#s-test').onclick = async () => { try { await api('test-alert', { body: {} }); toast('✓'); } catch (x) { toast(errMsg(x)); } };
  $('#fam-form').onsubmit = async (e) => { e.preventDefault(); try { await api('family-password', { body: { password: $('#fam-pw').value } }); await refresh(); toast(t('saved')); $('#fam-pw').value = ''; } catch (x) { toast(errMsg(x)); } };
  $('#pw-form').onsubmit = async (e) => { e.preventDefault(); try { await api('password', { body: { current: $('#pw-cur').value, password: $('#pw-new').value } }); toast(t('saved')); $('#pw-cur').value = $('#pw-new').value = ''; } catch (x) { toast(errMsg(x)); } };
  $('#logout').onclick = async () => { await api('logout', { body: {} }); boot(); };
}

// ---------- صفحة العائلة ----------
async function familyView() {
  const st = await api('family/state'); S = st; applyLangTheme(st.settings.lang, st.settings.theme);
  $('#root').innerHTML = `<div id="app"><header class="top"><div class="brand">${logo}<div><div class="t1">${t('app')}</div><div class="t2">${t('sub')}</div></div></div></header>
    <main><h1>${t('familyTitle')}</h1><div class="note">${t('familyNote')}</div>
    <div class="card"><div class="list">${st.apps.length ? st.apps.map((a) => appRow(a, false)).join('') : `<div class="empty">${t('noApps')}</div>`}</div></div>
    <div class="alert info">${t('trustNote')}</div><div class="note" style="text-align:center">${t('footer')}</div></main></div>`;
}

// ---------- البداية ----------
async function boot() {
  closeSheet();
  let b; try { b = await api('boot'); } catch { $('#root').innerHTML = `<div class="auth"><div class="card">${t('error')}</div></div>`; return; }
  applyLangTheme(b.lang, b.theme);
  if (b.setup) return authView('setup');
  if (famMode) { if (!b.role) return authView('family'); return familyView(); }
  if (b.role !== 'admin') return authView('login');
  await refresh(); shell();
}
$('#sheet-bg').onclick = closeSheet;
matchMedia('(prefers-color-scheme: light)').addEventListener?.('change', () => S && S.settings && applyLangTheme(S.settings.lang, S.settings.theme));
window.__ra7al = { get S() { return S; } };
boot();
})();
