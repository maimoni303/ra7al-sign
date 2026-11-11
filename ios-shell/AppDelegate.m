#import "AppDelegate.h"
#import "ViewController.h"
@implementation AppDelegate
- (BOOL)application:(UIApplication *)app didFinishLaunchingWithOptions:(NSDictionary *)opts {
    self.window = [[UIWindow alloc] initWithFrame:UIScreen.mainScreen.bounds];
    self.window.rootViewController = [ViewController new];
    [self.window makeKeyAndVisible];
    return YES;
}
@end
