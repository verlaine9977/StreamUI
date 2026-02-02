import UIKit
import TVMLKit

@main
class AppDelegate: UIResponder, UIApplicationDelegate, TVApplicationControllerDelegate {

    var window: UIWindow?
    var appController: TVApplicationController?

    // IMPORTANT: Change this to your server URL
    static let tvBaseURL = "https://debrid.controld.live"
    static let tvBootURL = "\(tvBaseURL)/api/tvos/js"

    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {

        window = UIWindow(frame: UIScreen.main.bounds)

        let appControllerContext = TVApplicationControllerContext()

        if let javaScriptURL = URL(string: AppDelegate.tvBootURL) {
            appControllerContext.javaScriptApplicationURL = javaScriptURL
        }

        appControllerContext.launchOptions["baseURL"] = AppDelegate.tvBaseURL

        appController = TVApplicationController(context: appControllerContext, window: window, delegate: self)

        // Setup VLC player bridge with navigation controller
        if let navController = window?.rootViewController as? UINavigationController {
            VLCPlayerBridge.shared.setup(with: navController)
        }

        return true
    }

    // MARK: - TVApplicationControllerDelegate

    func appController(_ appController: TVApplicationController, didFinishLaunching options: [String: Any]?) {
        print("StreamUI tvOS App launched")
    }

    func appController(_ appController: TVApplicationController, didFail error: Error) {
        print("StreamUI tvOS App failed: \(error.localizedDescription)")
    }

    func appController(_ appController: TVApplicationController, didStop options: [String: Any]?) {
        print("StreamUI tvOS App stopped")
    }

    // MARK: - JavaScript Bridge

    /// This method exposes native Swift classes to TVML JavaScript
    func appController(_ appController: TVApplicationController, evaluateAppJavaScriptIn jsContext: JSContext) {

        // Expose VLCPlayer to JavaScript
        let vlcPlayerClass: @convention(block) () -> VLCPlayerJSBridge = {
            return VLCPlayerJSBridge()
        }

        jsContext.setObject(vlcPlayerClass, forKeyedSubscript: "VLCPlayerClass" as NSString)

        // Also set up a simpler direct function
        let playWithVLC: @convention(block) (String, String) -> Void = { url, title in
            VLCPlayerBridge.shared.play(url, title: title)
        }

        jsContext.setObject(playWithVLC, forKeyedSubscript: "playWithVLC" as NSString)

        print("VLC Player bridge registered with JavaScript context")
    }
}

/// JavaScript-callable wrapper for VLC player
@objc protocol VLCPlayerJSExports: JSExport {
    func play(_ url: String, _ title: String)
    func stop()
}

@objc class VLCPlayerJSBridge: NSObject, VLCPlayerJSExports {

    func play(_ url: String, _ title: String) {
        VLCPlayerBridge.shared.play(url, title: title)
    }

    func stop() {
        VLCPlayerBridge.shared.stop()
    }
}
