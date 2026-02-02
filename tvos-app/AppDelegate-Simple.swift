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
}
