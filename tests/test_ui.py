"""اختبار واجهة رحّال للتوقيع بالكامل في متصفح جوال آلي."""
import os, sys, time, json, zipfile, tempfile, subprocess, urllib.request
from playwright.sync_api import sync_playwright

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = tempfile.mkdtemp(); SHOTS = os.environ.get('SHOTS', OUT)
env = subprocess.Popen(['node', 'tests/ui-env.mjs', OUT], cwd=ROOT, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE)
B = 'http://127.0.0.1:18777'
for _ in range(60):
    try: urllib.request.urlopen(B + '/api/ping'); break
    except Exception: time.sleep(0.3)
ipa = os.path.join(OUT, 'Demo.ipa')
with zipfile.ZipFile(ipa, 'w') as z:
    z.writestr('Payload/Demo.app/Info.plist', '<?xml version="1.0"?><plist version="1.0"><dict><key>CFBundleIdentifier</key><string>com.demo.game</string><key>CFBundleDisplayName</key><string>لعبة تجربة</string><key>CFBundleShortVersionString</key><string>3.1</string></dict></plist>')
    z.writestr('Payload/Demo.app/Demo', os.urandom(2048))
res, errs = [], []
def check(n, c, i=''):
    res.append(bool(c)); print(('PASS ' if c else 'FAIL ') + n + ('' if c else f' [{i}]'), flush=True)

def run(pg):
    def shot(n): pg.screenshot(path=os.path.join(SHOTS, n + '.png'), full_page=True)
    def toast(): return pg.inner_text('#toast')
    def tab(n): pg.click(f'#tabs [data-tab={n}]'); pg.wait_for_timeout(250)
    pg.goto(B + '/'); pg.wait_for_selector('#auth-form')
    check('setup screen shown in Arabic', 'أنشئ كلمة المرور' in pg.inner_text('#root') and pg.evaluate('document.dir') == 'rtl')
    shot('s01-setup')
    pg.fill('#pw', 'short'); pg.fill('#pw2', 'short'); pg.click('#auth-form button[type=submit]'); pg.wait_for_timeout(200)
    check('min length validation', '8 أحرف' in pg.inner_text('#auth-err'))
    pg.fill('#pw', 'Ra7al-Test-2026'); pg.fill('#pw2', 'Different-2026'); pg.click('#auth-form button[type=submit]'); pg.wait_for_timeout(200)
    check('mismatch validation', 'غير متطابقتين' in pg.inner_text('#auth-err'))
    pg.fill('#pw2', 'Ra7al-Test-2026'); pg.click('#auth-form button[type=submit]'); pg.wait_for_selector('#tabs')
    check('dashboard after setup', pg.is_visible('#tabs'))
    check('not-ready warning on sign tab', 'أكمل إعداد الشهادة' in pg.inner_text('#view'))
    shot('s02-sign-empty')
    pg.click('#go-cert'); pg.wait_for_timeout(300)
    check('go to certificate tab', pg.is_visible('#api-form'))
    shot('s03-cert-setup')
    # ربط مفتاح آبل
    pg.fill('#issuer', 'bad'); pg.fill('#keyid', 'ABCDE12345'); pg.set_input_files('#p8file', os.path.join(OUT, 'AuthKey_ABCDE12345.p8'))
    pg.click('#api-form button[type=submit]'); pg.wait_for_timeout(500)
    check('issuer validation', 'Issuer' in pg.inner_text('#api-err'), pg.inner_text('#api-err'))
    pg.fill('#issuer', '57246542-96fe-1a63-e053-0824d011072a'); pg.click('#api-form button[type=submit]')
    pg.wait_for_function("document.querySelector('#view').innerText.includes('تم الربط')", timeout=20000)
    check('apple key connected', True)
    # العائلة: إنشاء رابط تسجيل ومحاكاة فتحه من جوال
    tab('family'); pg.fill('#dev-name', 'جوالي'); pg.click('#enroll-form button[type=submit]'); pg.wait_for_timeout(500)
    link = pg.evaluate('window.__lastEnroll && window.__lastEnroll.url')
    check('enrollment link created', link and '/e/' in link, link)
    pg.click('#e-copy'); pg.wait_for_timeout(300); check('copy link', toast() == 'تم النسخ')
    shot('s04-family-link')
    tok = link.rsplit('/', 1)[1]
    body = b'\x30\x82' + f'<?xml version="1.0"?><plist version="1.0"><dict><key>PRODUCT</key><string>iPhone18,2</string><key>UDID</key><string>00008140-001A2B3C4D5E6F70</string></dict></plist>'.encode() + b'\x00'
    req = urllib.request.Request(f'{B}/e/{tok}/cb', data=body, method='POST')
    class NoRedir(urllib.request.HTTPRedirectHandler):
        def redirect_request(self, *a, **k): return None
    try: urllib.request.build_opener(NoRedir).open(req)
    except urllib.error.HTTPError as e: check('device callback redirects', e.code == 301, e.code)
    pg.wait_for_timeout(1500); pg.reload(); pg.wait_for_selector('#tabs'); tab('family')
    check('device appears registered', 'جوالي' in pg.inner_text('#devs') and 'مسجّل' in pg.inner_text('#devs'))
    shot('s05-family-devices')
    # الجهاز: تغيير الاسم
    pg.click('#devs [data-act=more]'); pg.fill('#d-name', 'جوال أبو ركان'); pg.click('#sheet [data-a=ren]'); pg.wait_for_timeout(600)
    check('rename device', 'جوال أبو ركان' in pg.inner_text('#devs'))
    # الشهادة جاهزة
    tab('cert'); check('certificate ring shown', 'شهادة المطوّر سارية' in pg.inner_text('#view') and '1 أجهزة' in pg.inner_text('#view'))
    check('status pill valid', 'الشهادة سارية' in pg.inner_text('#pill'))
    shot('s06-cert-ready')
    # التوقيع
    tab('sign'); pg.set_input_files('#ipa', ipa); pg.wait_for_selector('#sign-card', timeout=10000)
    check('upload shows app info', 'لعبة تجربة' in pg.inner_text('#sign-card') and 'com.demo.game' in pg.inner_text('#sign-card'))
    pg.fill('#app-name', 'لعبتي'); pg.click('#rm-ext'); shot('s07-sign-ready')
    pg.click('#do-sign'); pg.wait_for_selector('#inst-now', timeout=15000)
    href = pg.get_attribute('#inst-now', 'href')
    check('signed with install link', href.startswith('itms-services://?action=download-manifest&url=https%3A%2F%2Fsign.example.ts.net'))
    shot('s08-signed')
    pg.click('#up-x') if pg.query_selector('#up-x') else None
    # رفع بالرابط (رابط مباشر من الخادم نفسه)
    pg.fill('#ipa-url', 'not-a-url'); pg.click('#url-form button'); pg.wait_for_timeout(300)
    # تطبيقاتي
    tab('apps'); check('apps list shows signed app', 'لعبتي' in pg.inner_text('#apps'))
    check('family link warns without family password', 'كلمة مرور العائلة' in pg.inner_text('#view'))
    pg.click('#fam-copy'); pg.wait_for_timeout(300); check('copy family link', toast() == 'تم النسخ')
    shot('s09-apps')
    pg.click('#apps [data-act=more]'); pg.wait_for_timeout(200)
    check('app sheet has install/download/resign/delete', all(x in pg.inner_text('#sheet') for x in ['تثبيت', 'تنزيل IPA', 'إعادة توقيع', 'حذف']))
    pg.click('#sheet [data-a=resign]'); pg.wait_for_timeout(2500)
    check('re-sign from sheet', toast() == 'تم التوقيع ✓', toast())
    # الإعدادات
    tab('cert'); pg.fill('#fam-pw', 'family-2026'); pg.click('#fam-form button'); pg.wait_for_timeout(400)
    check('family password saved', toast() == 'تم الحفظ')
    pg.fill('#s-hook', 'http://127.0.0.1:9/none'); pg.fill('#s-days', '45'); pg.click('#s-save'); pg.wait_for_timeout(400)
    check('settings saved', toast() == 'تم الحفظ')
    pg.click('#s-theme [data-v=light]'); pg.wait_for_timeout(500)
    check('light theme', pg.evaluate("document.documentElement.dataset.theme") == 'light'); tab('apps'); shot('s10-apps-light'); tab('cert')
    pg.click('#s-lang [data-v=en]'); pg.wait_for_timeout(500)
    check('English LTR', pg.evaluate('document.dir') == 'ltr' and 'Certificate' in pg.inner_text('#tabs'))
    tab('sign'); shot('s11-sign-en'); tab('cert')
    pg.click('#s-lang [data-v=ar]'); pg.wait_for_timeout(400); pg.click('#s-theme [data-v=dark]'); pg.wait_for_timeout(400)
    check('back to Arabic dark', pg.evaluate('document.dir') == 'rtl' and pg.evaluate("document.documentElement.dataset.theme") == 'dark')
    pg.click('details.card summary >> text=سجل النشاط'); check('activity log', 'توقيع' in pg.inner_text('#view'))
    # حذف التطبيق ثم إعادة توقيع للعائلة
    tab('apps'); pg.click('#apps [data-act=more]'); pg.click('#sheet [data-a=del]'); pg.click('#sheet [data-a=y]'); pg.wait_for_timeout(600)
    check('delete app', 'لا توجد تطبيقات' in pg.inner_text('#apps'))
    tab('sign'); pg.set_input_files('#ipa', ipa); pg.wait_for_selector('#sign-card'); pg.click('#do-sign'); pg.wait_for_selector('#inst-now', timeout=15000)
    # الخروج
    tab('cert'); pg.click('#logout'); pg.wait_for_selector('#auth-form')
    check('logout', 'تسجيل الدخول' in pg.inner_text('#root'))
    pg.fill('#pw', 'wrong-pass'); pg.click('#auth-form button[type=submit]'); pg.wait_for_timeout(300)
    check('wrong password message', 'غير صحيحة' in pg.inner_text('#auth-err'))
    # صفحة العائلة
    pg.goto(B + '/f'); pg.wait_for_selector('#auth-form')
    check('family login screen', 'دخول العائلة' in pg.inner_text('#root'))
    pg.fill('#pw', 'family-2026'); pg.click('#auth-form button[type=submit]'); pg.wait_for_timeout(800)
    check('family sees apps with install button', 'تطبيقات العائلة' in pg.inner_text('#root') and pg.query_selector('a[data-act=install]') is not None)
    check('family has no admin tabs', pg.query_selector('#tabs') is None)
    shot('s12-family')
    # صفحة تسجيل الجهاز العامة
    pg.goto(B + '/e/doesnotexist'); check('expired enrollment page', 'غير صالح' in pg.inner_text('body'))

with sync_playwright() as p:
    br = p.chromium.launch()
    ctx = br.new_context(viewport={'width': 390, 'height': 844}, device_scale_factor=2, is_mobile=True, has_touch=True, permissions=['clipboard-read', 'clipboard-write'])
    pg = ctx.new_page()
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.on('console', lambda m: m.type == 'error' and 'Failed to load resource' not in m.text and errs.append(m.text))
    try: run(pg)
    except Exception as e:
        import traceback; traceback.print_exc(); res.append(False); pg.screenshot(path=os.path.join(SHOTS, 'zz-fail.png'))
    br.close()
env.terminate()
print(f'\n{sum(res)}/{len(res)} passed')
if errs: print('JS ERRORS:', errs[:10])
sys.exit(0 if all(res) and not errs else 1)
