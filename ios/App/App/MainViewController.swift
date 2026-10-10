import UIKit
import Capacitor

/// The app's bridge view controller. Main.storyboard points here so the
/// app-local plugin can be registered alongside the npm-installed ones.
class MainViewController: CAPBridgeViewController {
    override open func capacitorDidLoad() {
        bridge?.registerPluginInstance(IStoedetPlugin())
    }
}
