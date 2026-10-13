import Foundation
import WatchConnectivity

/// Sends the widget data (the JSON IStoedetPlugin.setWidgetData stores) to the
/// watch app. The application context keeps only the latest snapshot, which is
/// all the watch needs; when a complication is on the face, a complication
/// transfer wakes the watch so the face updates without opening the app.
final class WatchBridge: NSObject, WCSessionDelegate {
    static let shared = WatchBridge()
    private var pending: String?

    func start() {
        guard WCSession.isSupported() else { return }
        // Whatever the app stored last, so a freshly installed watch app gets data at once.
        pending = UserDefaults(suiteName: IStoedetPlugin.appGroup)?.string(forKey: IStoedetPlugin.widgetKey)
        WCSession.default.delegate = self
        WCSession.default.activate()
    }

    func send(_ json: String) {
        DispatchQueue.main.async {
            self.pending = json
            self.flush()
        }
    }

    private func flush() {
        let s = WCSession.default
        guard WCSession.isSupported(), s.activationState == .activated, s.isPaired, s.isWatchAppInstalled,
              let json = pending else { return }
        let payload = ["widgetData": json]
        do {
            try s.updateApplicationContext(payload)
            if s.isComplicationEnabled && s.remainingComplicationUserInfoTransfers > 0 {
                s.transferCurrentComplicationUserInfo(payload)
            }
            pending = nil
        } catch {
            // Keep it pending; the next activation or send tries again.
        }
    }

    func session(_ session: WCSession, activationDidCompleteWith state: WCSessionActivationState, error: Error?) {
        DispatchQueue.main.async { self.flush() }
    }

    func sessionWatchStateDidChange(_ session: WCSession) {
        DispatchQueue.main.async { self.flush() }
    }

    func sessionDidBecomeInactive(_ session: WCSession) {}

    func sessionDidDeactivate(_ session: WCSession) {
        session.activate()   // the user switched watches
    }
}
