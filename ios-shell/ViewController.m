#import "ViewController.h"
// RA7AL private app shell — opens a self-hosted web app (home network first, then Tailscale). Settings come from Info.plist (R7Servers, R7Markers, R7Title, R7ArabicFont, R7SameHost).
static id Cfg(NSString *k) { return [NSBundle.mainBundle objectForInfoDictionaryKey:k]; }
static NSArray<NSString *> *Defaults(void) { return Cfg(@"R7Servers") ?: @[]; }
@interface ViewController ()
@property (nonatomic, strong) WKWebView *web;
@property (nonatomic, copy) NSString *base;
@end
@implementation ViewController
- (void)viewDidLoad {
    [super viewDidLoad];
    self.view.backgroundColor = [UIColor colorWithRed:0.96 green:0.97 blue:0.96 alpha:1];
    WKWebViewConfiguration *cfg = [WKWebViewConfiguration new];
    cfg.websiteDataStore = WKWebsiteDataStore.defaultDataStore;
    NSString *hook = @"(function(){if(window.__npsHook)return;window.__npsHook=1;function send(b,n){var r=new FileReader();r.onload=function(){window.webkit.messageHandlers.save.postMessage({name:n||'file',data:String(r.result).split(',')[1]});};r.readAsDataURL(b);}document.addEventListener('click',function(e){var a=e.target.closest&&e.target.closest('a[download]');if(!a)return;var h=a.href||'';if(h.indexOf('blob:')===0||h.indexOf('data:')===0){e.preventDefault();e.stopPropagation();fetch(h).then(function(x){return x.blob()}).then(function(b){send(b,a.getAttribute('download'))});}},true);var oc=HTMLAnchorElement.prototype.click;HTMLAnchorElement.prototype.click=function(){var h=this.href||'';if(this.hasAttribute('download')&&(h.indexOf('blob:')===0||h.indexOf('data:')===0)){var n=this.getAttribute('download');fetch(h).then(function(x){return x.blob()}).then(function(b){send(b,n)});return;}return oc.apply(this,arguments);};})();";
    [cfg.userContentController addUserScript:[[WKUserScript alloc] initWithSource:hook injectionTime:WKUserScriptInjectionTimeAtDocumentEnd forMainFrameOnly:YES]];
    // Optional: force the system Arabic font (some web fonts do not join Arabic letters in WebKit).
    NSString *font = @"(function(){if(document.getElementById('npsIosFont'))return;var s=document.createElement('style');s.id='npsIosFont';s.textContent=\":root{--font-ar:-apple-system,'SF Arabic','Geeza Pro',system-ui,sans-serif!important}body,.ar,.rtl,input,textarea,select,button,h1,h2,h3,b,label{font-family:-apple-system,'SF Arabic','Geeza Pro',system-ui,sans-serif!important}.ltr,.en{font-family:-apple-system,'Helvetica Neue',sans-serif!important}\";(document.head||document.documentElement).appendChild(s);})();";
    if ([Cfg(@"R7ArabicFont") boolValue]) [cfg.userContentController addUserScript:[[WKUserScript alloc] initWithSource:font injectionTime:WKUserScriptInjectionTimeAtDocumentEnd forMainFrameOnly:NO]];
    [cfg.userContentController addScriptMessageHandler:self name:@"save"];
    [cfg.userContentController addScriptMessageHandler:self name:@"app"];
    cfg.applicationNameForUserAgent = @"RA7ALShell/1.0";
    self.web = [[WKWebView alloc] initWithFrame:self.view.bounds configuration:cfg];
    self.web.autoresizingMask = UIViewAutoresizingFlexibleWidth | UIViewAutoresizingFlexibleHeight;
    self.web.navigationDelegate = self; self.web.UIDelegate = self;
    self.web.allowsBackForwardNavigationGestures = YES;
    [self.view addSubview:self.web];
    [self connect];
}
- (NSString *)splash:(NSString *)msg actions:(BOOL)actions {
    return [NSString stringWithFormat:@"<html dir='rtl'><head><meta name='viewport' content='width=device-width,initial-scale=1'><style>body{margin:0;height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;font-family:-apple-system,sans-serif;background:#F5F8F6;color:#1F3864;text-align:center;padding:24px;box-sizing:border-box}h1{font-size:20px;margin:16px 0 6px}p{color:#5b6b76;line-height:1.7}button{margin:6px;padding:12px 20px;border-radius:10px;border:0;font-size:15px;background:#82BA41;color:#fff}button.s{background:#fff;color:#1F3864;border:1px solid #cfd8e0}.ring{width:72px;height:72px;border-radius:50%%;border:8px solid #82BA41;border-right-color:#000;border-bottom-color:#408ECC;%@}@keyframes r{to{transform:rotate(360deg)}}</style></head><body><div class='ring'></div><h1>%@</h1><p>%@</p>%@</body></html>",
        actions ? @"" : @"animation:r 1.2s linear infinite", Cfg(@"CFBundleDisplayName") ?: @"", msg,
        actions ? @"<div><button onclick=\"webkit.messageHandlers.app.postMessage('retry')\">إعادة المحاولة</button><button class='s' onclick=\"webkit.messageHandlers.app.postMessage('server')\">عنوان الخادم</button></div>" : @""];
}
- (void)connect {
    [self.web loadHTMLString:[self splash:@"جارٍ الاتصال بالخادم…" actions:NO] baseURL:nil];
    NSString *custom = [NSUserDefaults.standardUserDefaults stringForKey:@"server"];
    NSMutableArray *list = [NSMutableArray array];
    if (custom.length) [list addObject:custom];
    [list addObjectsFromArray:Defaults()];
    [self tryList:list index:0];
}
- (void)tryList:(NSArray *)list index:(NSUInteger)i {
    if (i >= list.count) { [self showOffline]; return; }
    // Only accept a server that really is this app (another app may answer on the same name/port).
    NSURL *u = [NSURL URLWithString:[list[i] stringByAppendingString:@"/"]];
    NSMutableURLRequest *req = [NSMutableURLRequest requestWithURL:u cachePolicy:NSURLRequestReloadIgnoringLocalCacheData timeoutInterval:6];
    [[NSURLSession.sharedSession dataTaskWithRequest:req completionHandler:^(NSData *d, NSURLResponse *r, NSError *e) {
        NSString *body = d ? [[NSString alloc] initWithData:d encoding:NSUTF8StringEncoding] : nil;
        BOOL ours = NO; for (NSString *mk in (Cfg(@"R7Markers") ?: @[])) if (body && [body containsString:mk]) ours = YES;
        dispatch_async(dispatch_get_main_queue(), ^{
            if (!e && ours) { self.base = list[i]; [self.web loadRequest:[NSURLRequest requestWithURL:[NSURL URLWithString:[list[i] stringByAppendingString:@"/"]]]]; }
            else [self tryList:list index:i + 1];
        });
    }] resume];
}
- (void)showOffline { self.base = nil; [self.web loadHTMLString:[self splash:@"تعذّر الوصول إلى الخادم. تأكد من اتصالك بشبكة البيت أو تشغيل Tailscale." actions:YES] baseURL:nil]; }
- (void)askServer {
    UIAlertController *a = [UIAlertController alertControllerWithTitle:@"عنوان الخادم" message:@"مثال: http://192.168.100.70:8080 أو عنوان Tailscale" preferredStyle:UIAlertControllerStyleAlert];
    [a addTextFieldWithConfigurationHandler:^(UITextField *t) { t.text = [NSUserDefaults.standardUserDefaults stringForKey:@"server"] ?: Defaults()[0]; t.keyboardType = UIKeyboardTypeURL; }];
    [a addAction:[UIAlertAction actionWithTitle:@"حفظ" style:UIAlertActionStyleDefault handler:^(UIAlertAction *x) {
        NSString *v = [a.textFields.firstObject.text stringByTrimmingCharactersInSet:NSCharacterSet.whitespaceCharacterSet];
        while ([v hasSuffix:@"/"]) v = [v substringToIndex:v.length - 1];
        [NSUserDefaults.standardUserDefaults setObject:v forKey:@"server"]; [self connect]; }]];
    [a addAction:[UIAlertAction actionWithTitle:@"الافتراضي" style:UIAlertActionStyleDefault handler:^(UIAlertAction *x) { [NSUserDefaults.standardUserDefaults removeObjectForKey:@"server"]; [self connect]; }]];
    [a addAction:[UIAlertAction actionWithTitle:@"إلغاء" style:UIAlertActionStyleCancel handler:nil]];
    [self presentViewController:a animated:YES completion:nil];
}
- (void)userContentController:(WKUserContentController *)uc didReceiveScriptMessage:(WKScriptMessage *)m {
    if ([m.name isEqualToString:@"app"]) { if ([m.body isEqual:@"retry"]) [self connect]; else [self askServer]; return; }
    NSDictionary *b = m.body; NSData *data = [[NSData alloc] initWithBase64EncodedString:b[@"data"] ?: @"" options:0];
    NSString *name = [b[@"name"] stringByReplacingOccurrencesOfString:@"/" withString:@"_"];
    NSURL *f = [NSFileManager.defaultManager.temporaryDirectory URLByAppendingPathComponent:name];
    [data writeToURL:f atomically:YES];
    UIActivityViewController *s = [[UIActivityViewController alloc] initWithActivityItems:@[f] applicationActivities:nil];
    s.popoverPresentationController.sourceView = self.view;
    [self presentViewController:s animated:YES completion:nil];
}
- (void)webView:(WKWebView *)w decidePolicyForNavigationAction:(WKNavigationAction *)a decisionHandler:(void (^)(WKNavigationActionPolicy))h {
    NSString *u = a.request.URL.absoluteString;
    NSString *scheme = a.request.URL.scheme.lowercaseString ?: @"";
    // Install links (itms-services), WhatsApp, phone, mail, maps… are handed to iOS; WebKit cannot open them itself.
    if (scheme.length && ![@[@"http", @"https", @"about", @"blob", @"data", @"file"] containsObject:scheme]) {
        [UIApplication.sharedApplication openURL:a.request.URL options:@{} completionHandler:nil];
        h(WKNavigationActionPolicyCancel); return;
    }
    // R7SameHost: any port on the server's own host stays inside the app (one app that hosts several web apps, e.g. a login portal).
    BOOL sameHost = [Cfg(@"R7SameHost") boolValue] && self.base && [a.request.URL.host isEqualToString:[NSURL URLWithString:self.base].host];
    if (self.base && !sameHost && ![u hasPrefix:self.base] && ([u hasPrefix:@"http"] || [u hasPrefix:@"mailto:"] || [u hasPrefix:@"tel:"])) { [UIApplication.sharedApplication openURL:a.request.URL options:@{} completionHandler:nil]; h(WKNavigationActionPolicyCancel); return; }
    h(WKNavigationActionPolicyAllow);
}
- (WKWebView *)webView:(WKWebView *)w createWebViewWithConfiguration:(WKWebViewConfiguration *)c forNavigationAction:(WKNavigationAction *)a windowFeatures:(WKWindowFeatures *)f {
    if (a.request.URL) [UIApplication.sharedApplication openURL:a.request.URL options:@{} completionHandler:nil];
    return nil;
}
- (void)webView:(WKWebView *)w didFailProvisionalNavigation:(WKNavigation *)n withError:(NSError *)e { if (self.base && e.code != NSURLErrorCancelled) [self showOffline]; }
- (void)webView:(WKWebView *)w runJavaScriptAlertPanelWithMessage:(NSString *)msg initiatedByFrame:(WKFrameInfo *)f completionHandler:(void (^)(void))h {
    UIAlertController *a = [UIAlertController alertControllerWithTitle:nil message:msg preferredStyle:UIAlertControllerStyleAlert];
    [a addAction:[UIAlertAction actionWithTitle:@"حسناً" style:UIAlertActionStyleDefault handler:^(UIAlertAction *x) { h(); }]];
    [self presentViewController:a animated:YES completion:nil];
}
- (void)webView:(WKWebView *)w runJavaScriptConfirmPanelWithMessage:(NSString *)msg initiatedByFrame:(WKFrameInfo *)f completionHandler:(void (^)(BOOL))h {
    UIAlertController *a = [UIAlertController alertControllerWithTitle:nil message:msg preferredStyle:UIAlertControllerStyleAlert];
    [a addAction:[UIAlertAction actionWithTitle:@"إلغاء" style:UIAlertActionStyleCancel handler:^(UIAlertAction *x) { h(NO); }]];
    [a addAction:[UIAlertAction actionWithTitle:@"تأكيد" style:UIAlertActionStyleDefault handler:^(UIAlertAction *x) { h(YES); }]];
    [self presentViewController:a animated:YES completion:nil];
}
- (UIStatusBarStyle)preferredStatusBarStyle { return UIStatusBarStyleDarkContent; }
@end
