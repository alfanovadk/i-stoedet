import Foundation
import Capacitor
import WidgetKit

/// App-local Capacitor plugin (JS name "IStoedet"):
///  - keychainGet / keychainSet / keychainRemove keep the Eloverblik refresh
///    token in the Keychain instead of the web view's localStorage.
///  - setWidgetData hands the latest prices to the home-screen widget through
///    the shared App Group and asks WidgetKit to refresh.
/// Registered in MainViewController.capacitorDidLoad().
@objc(IStoedetPlugin)
public class IStoedetPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "IStoedetPlugin"
    public let jsName = "IStoedet"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "keychainGet", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "keychainSet", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "keychainRemove", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "setWidgetData", returnType: CAPPluginReturnPromise)
    ]

    /// Must match the App Group on both the app and the widget target.
    static let appGroup = "group.dk.alfanova.istoedet"
    static let widgetKey = "widgetData"

    @objc func keychainGet(_ call: CAPPluginCall) {
        guard let key = call.getString("key") else { call.reject("key mangler"); return }
        // NSNull when the key does not exist, so JS sees { value: null }.
        call.resolve(["value": KeychainStore.get(key) ?? NSNull()])
    }

    @objc func keychainSet(_ call: CAPPluginCall) {
        guard let key = call.getString("key"), let value = call.getString("value") else {
            call.reject("key eller value mangler"); return
        }
        if KeychainStore.set(key, value) { call.resolve() } else { call.reject("Keychain afviste at gemme") }
    }

    @objc func keychainRemove(_ call: CAPPluginCall) {
        guard let key = call.getString("key") else { call.reject("key mangler"); return }
        if KeychainStore.remove(key) { call.resolve() } else { call.reject("Keychain afviste at slette") }
    }

    @objc func setWidgetData(_ call: CAPPluginCall) {
        guard let json = call.getString("json") else { call.reject("json mangler"); return }
        UserDefaults(suiteName: IStoedetPlugin.appGroup)?.set(json, forKey: IStoedetPlugin.widgetKey)
        WidgetCenter.shared.reloadAllTimelines()
        call.resolve()
    }
}
