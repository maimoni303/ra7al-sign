import sys, json
from xml.sax.saxutils import escape as e
def plist(c):
    arr=lambda xs: '<array>'+''.join(f'<string>{e(x)}</string>' for x in xs)+'</array>'
    return f'''<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
  <key>CFBundleExecutable</key><string>App</string>
  <key>CFBundleIdentifier</key><string>{c['bundle']}</string>
  <key>CFBundleName</key><string>{e(c['short'])}</string>
  <key>CFBundleDisplayName</key><string>{e(c['name'])}</string>
  <key>CFBundleVersion</key><string>{c.get('build','1')}</string>
  <key>CFBundleShortVersionString</key><string>{c.get('version','1.0.0')}</string>
  <key>CFBundlePackageType</key><string>APPL</string>
  <key>CFBundleDevelopmentRegion</key><string>ar</string>
  <key>CFBundleIcons</key><dict><key>CFBundlePrimaryIcon</key><dict><key>CFBundleIconFiles</key><array><string>AppIcon60x60</string></array><key>CFBundleIconName</key><string>AppIcon</string></dict></dict>
  <key>CFBundleIcons~ipad</key><dict><key>CFBundlePrimaryIcon</key><dict><key>CFBundleIconFiles</key><array><string>AppIcon60x60</string><string>AppIcon76x76</string></array></dict></dict>
  <key>LSRequiresIPhoneOS</key><true/>
  <key>MinimumOSVersion</key><string>15.0</string>
  <key>UIDeviceFamily</key><array><integer>1</integer><integer>2</integer></array>
  <key>UIRequiredDeviceCapabilities</key><array><string>arm64</string></array>
  <key>UISupportedInterfaceOrientations</key><array><string>UIInterfaceOrientationPortrait</string><string>UIInterfaceOrientationLandscapeLeft</string><string>UIInterfaceOrientationLandscapeRight</string></array>
  <key>UILaunchScreen</key><dict/>
  <key>NSAppTransportSecurity</key><dict><key>NSAllowsArbitraryLoads</key><true/><key>NSAllowsLocalNetworking</key><true/></dict>
  <key>NSLocalNetworkUsageDescription</key><string>للاتصال بالخادم على شبكة البيت</string>
  <key>NSCameraUsageDescription</key><string>لمسح الباركود وتصوير المستندات</string>
  <key>NSPhotoLibraryUsageDescription</key><string>لاختيار الصور ورفعها</string>
  <key>NSMicrophoneUsageDescription</key><string>للأوامر الصوتية</string>
  <key>R7Servers</key>{arr(c['servers'])}
  <key>R7Markers</key>{arr(c['markers'])}
  <key>R7ArabicFont</key><{'true' if c.get('arabic_font') else 'false'}/>
  <key>R7SameHost</key><{'true' if c.get('same_host') else 'false'}/>
</dict></plist>
'''
c=json.load(open(sys.argv[1])); open(sys.argv[2],'w').write(plist(c))
