import WidgetKit
import Foundation

// Datamodel + time-logik for «I stødet»-widget'en, ur-appen og ur-komplikationen.
// Ingen UI, så den kan testes for sig (se PriceStoreCheck.swift).

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

struct Bar {
    let date: Date
    let price: Double
    let tier: Int
}

struct PriceEntry: TimelineEntry {
    let date: Date
    let price: Double?      // øre/kWh, nil when the app has not shared data for this hour
    let tier: Int           // where the hour sits among the known hours: 0 cheap, 1 mid, 2 expensive
    let level: Int          // the price itself on the fixed scale: 0 low, 1 normal, 2 high
    let cheapFrom: Date?
    let cheapTo: Date?
    let area: String
    var bars: [Bar] = []    // this hour and the next ones, for the small bar charts

    /// What to advise: today's cheapest hour is no good time when the price is still high.
    var go: Int { PriceStore.goTier(tier, level) }

    static func empty(_ date: Date, area: String = "") -> PriceEntry {
        PriceEntry(date: date, price: nil, tier: 1, level: 1, cheapFrom: nil, cheapTo: nil, area: area)
    }
}

enum PriceStore {
    static let appGroup = "group.dk.alfanova.istoedet"
    static let key = "widgetData"
    static let barCount = 12

    /// Same fixed scale as PRICE_LEVELS in src/app/pricing.js, øre/kWh incl. everything.
    static let lowBelow = 100.0
    static let highFrom = 225.0

    static func load() -> WidgetData? {
        guard let json = UserDefaults(suiteName: appGroup)?.string(forKey: key) else { return nil }
        return decode(json)
    }

    static func decode(_ json: String) -> WidgetData? {
        guard let data = json.data(using: .utf8) else { return nil }
        return try? JSONDecoder().decode(WidgetData.self, from: data)
    }

    /// Same three-way split as the app (tierOf in pricing.js).
    static func tier(_ p: Double, lo: Double, hi: Double) -> Int {
        guard hi - lo >= 1 else { return 0 }
        let f = (p - lo) / (hi - lo)
        return f < 0.34 ? 0 : (f < 0.67 ? 1 : 2)
    }

    /// levelOf in pricing.js.
    static func level(_ p: Double) -> Int {
        p < lowBelow ? 0 : (p < highFrom ? 1 : 2)
    }

    /// goTier in pricing.js.
    static func goTier(_ tier: Int, _ level: Int) -> Int {
        if tier == 0 && level == 2 { return 1 }
        if tier == 2 && level == 0 { return 1 }
        return tier
    }

    /// One entry per known hour from the current hour on, so the widget keeps
    /// up without the app running. Falls back to a single empty entry.
    static func entries(from data: WidgetData?, now: Date) -> [PriceEntry] {
        guard let data = data, !data.hours.isEmpty else { return [.empty(now)] }
        let prices = data.hours.map { $0.p }
        let lo = prices.min() ?? 0, hi = prices.max() ?? 1
        let cheapFrom = data.cheapFrom.map { Date(timeIntervalSince1970: $0) }
        let cheapTo = data.cheapTo.map { Date(timeIntervalSince1970: $0) }
        let upcoming = data.hours.filter { $0.t + 3600 > now.timeIntervalSince1970 }.sorted { $0.t < $1.t }
        guard !upcoming.isEmpty else { return [.empty(now, area: data.area)] }
        let bars = upcoming.map { Bar(date: Date(timeIntervalSince1970: $0.t), price: $0.p, tier: tier($0.p, lo: lo, hi: hi)) }
        return upcoming.enumerated().map { index, h in
            let start = Date(timeIntervalSince1970: h.t)
            // A window that has passed is no longer worth showing.
            let stillAhead = (cheapTo ?? .distantPast) > start
            return PriceEntry(date: index == 0 ? now : start, price: h.p, tier: tier(h.p, lo: lo, hi: hi), level: level(h.p),
                              cheapFrom: stillAhead ? cheapFrom : nil, cheapTo: stillAhead ? cheapTo : nil, area: data.area,
                              bars: Array(bars[index..<min(bars.count, index + barCount)]))
        }
    }
}
