import WidgetKit
import Foundation

// Datamodel + time-logik for «I stødet»-widget'en. Ingen UI, så den kan testes for sig
// (se PriceStoreCheck.swift).

struct PricePoint: Codable {
    let t: Double   // start of the hour, seconds since 1970
    let p: Double   // total price in øre/kWh
}

struct WidgetData: Codable {
    let updated: Double
    let area: String
    let hours: [PricePoint]
    let cheapFrom: Double?
    let cheapTo: Double?    // end of the cheapest window (exclusive)
}

struct PriceEntry: TimelineEntry {
    let date: Date
    let price: Double?      // øre/kWh, nil when the app has not shared data for this hour
    let tier: Int           // 0 cheap, 1 mid, 2 expensive
    let cheapFrom: Date?
    let cheapTo: Date?
    let area: String
}

enum PriceStore {
    static let appGroup = "group.dk.alfanova.istoedet"
    static let key = "widgetData"

    static func load() -> WidgetData? {
        guard let json = UserDefaults(suiteName: appGroup)?.string(forKey: key),
              let data = json.data(using: .utf8) else { return nil }
        return try? JSONDecoder().decode(WidgetData.self, from: data)
    }

    /// Same three-way split as the app (tierOf in pricing.js).
    static func tier(_ p: Double, lo: Double, hi: Double) -> Int {
        guard hi - lo >= 1 else { return 0 }
        let f = (p - lo) / (hi - lo)
        return f < 0.34 ? 0 : (f < 0.67 ? 1 : 2)
    }

    /// One entry per known hour from the current hour on, so the widget keeps
    /// up without the app running. Falls back to a single empty entry.
    static func entries(from data: WidgetData?, now: Date) -> [PriceEntry] {
        guard let data = data, !data.hours.isEmpty else {
            return [PriceEntry(date: now, price: nil, tier: 1, cheapFrom: nil, cheapTo: nil, area: "")]
        }
        let prices = data.hours.map { $0.p }
        let lo = prices.min() ?? 0, hi = prices.max() ?? 1
        let cheapFrom = data.cheapFrom.map { Date(timeIntervalSince1970: $0) }
        let cheapTo = data.cheapTo.map { Date(timeIntervalSince1970: $0) }
        let upcoming = data.hours.filter { $0.t + 3600 > now.timeIntervalSince1970 }.sorted { $0.t < $1.t }
        guard !upcoming.isEmpty else {
            return [PriceEntry(date: now, price: nil, tier: 1, cheapFrom: nil, cheapTo: nil, area: data.area)]
        }
        return upcoming.enumerated().map { index, h in
            let start = Date(timeIntervalSince1970: h.t)
            // A window that has passed is no longer worth showing.
            let stillAhead = (cheapTo ?? .distantPast) > start
            return PriceEntry(date: index == 0 ? now : start, price: h.p, tier: tier(h.p, lo: lo, hi: hi),
                              cheapFrom: stillAhead ? cheapFrom : nil, cheapTo: stillAhead ? cheapTo : nil, area: data.area)
        }
    }
}
