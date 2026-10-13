import Foundation
import WatchConnectivity
import WidgetKit

/// Receives the prices from the iPhone app (WatchBridge.swift) and keeps them in
/// the watch's App Group, where the complication reads them. The watch never
/// computes prices itself: tariffs and taxes live in pricing.js only.
final class WatchStore: NSObject, ObservableObject, WCSessionDelegate {
    static let shared = WatchStore()
    static let contextKey = "widgetData"

    @Published private(set) var data: WidgetData?

    private override init() {
        super.init()
        data = PriceStore.load()
        #if DEBUG
        if ProcessInfo.processInfo.arguments.contains("-demo") { data = WatchStore.demo() }
        #endif
        guard WCSession.isSupported() else { return }
        WCSession.default.delegate = self
        WCSession.default.activate()
    }

    /// Keeps the newest data only; the phone may deliver the same snapshot twice
    /// (application context and complication user info).
    private func apply(_ payload: [String: Any]) {
        guard let json = payload[Self.contextKey] as? String, let incoming = PriceStore.decode(json) else { return }
        DispatchQueue.main.async {
            if let current = self.data, current.updated > incoming.updated { return }
            UserDefaults(suiteName: PriceStore.appGroup)?.set(json, forKey: PriceStore.key)
            self.data = incoming
            WidgetCenter.shared.reloadAllTimelines()
        }
    }

    /// For the watchConnectivity background task: wait until pending content has been delivered.
    func drain() async {
        for _ in 0..<50 {
            let s = WCSession.default
            if s.activationState == .activated && !s.hasContentPending { return }
            try? await Task.sleep(nanoseconds: 200_000_000)
        }
    }

    func session(_ session: WCSession, activationDidCompleteWith state: WCSessionActivationState, error: Error?) {
        apply(session.receivedApplicationContext)
    }

    func session(_ session: WCSession, didReceiveApplicationContext applicationContext: [String: Any]) {
        apply(applicationContext)
    }

    func session(_ session: WCSession, didReceiveUserInfo userInfo: [String: Any] = [:]) {
        apply(userInfo)
    }

    #if DEBUG
    /// Twelve made-up hours from the current one, for simulator screenshots.
    static func demo() -> WidgetData {
        let h0 = floor(Date().timeIntervalSince1970 / 3600) * 3600
        let p: [Double] = [168, 152, 141, 132, 128, 131, 139, 158, 196, 241, 262, 231, 190, 176]
        return WidgetData(updated: h0, area: "DK1", hours: p.enumerated().map { PricePoint(t: h0 + Double($0.offset) * 3600, p: $0.element) },
                          cheapFrom: h0 + 3 * 3600, cheapTo: h0 + 6 * 3600)
    }
    #endif
}
