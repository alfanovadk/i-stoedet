import Foundation

// Kørbar kontrol af widget'ens time-logik. Hører IKKE til i widget-targetet.
// Kør fra repo-roden (kræver kun Swift-kommandolinjeværktøjerne, ikke Xcode):
//   swiftc ios/App/IStoedetWidget/PriceStore.swift ios/App/IStoedetWidget/PriceStoreCheck.swift -o /tmp/pricestore-check && /tmp/pricestore-check

@main
enum PriceStoreCheck {
    static var failures = 0
    static func check(_ ok: Bool, _ what: String) {
        if !ok { failures += 1; print("FAIL:", what) }
    }

    static func main() {
        let h0 = 1_791_612_000.0                       // an exact hour
        let now = Date(timeIntervalSince1970: h0 + 2 * 3600 + 900)   // 02:15 into the data
        // 6 hours: cheap, cheap, mid, expensive, mid, cheap
        let prices: [Double] = [50, 60, 150, 250, 140, 55]
        let hours = prices.enumerated().map { PricePoint(t: h0 + Double($0.offset) * 3600, p: $0.element) }
        let data = WidgetData(updated: h0, area: "DK1", hours: hours, cheapFrom: h0 + 5 * 3600, cheapTo: h0 + 6 * 3600)

        let e = PriceStore.entries(from: data, now: now)
        check(e.count == 4, "entries start at the current hour (got \(e.count))")
        check(e.first?.price == 150, "first entry is the hour in progress")
        check(e.first?.date == now, "first entry is dated now, not the hour start")
        check(e.map { $0.tier } == [1, 2, 1, 0], "tiers follow the app's 34/67 split: \(e.map { $0.tier })")
        check(e.dropFirst().first?.date == Date(timeIntervalSince1970: h0 + 3 * 3600), "later entries switch on the hour")
        check(e.allSatisfy { $0.cheapFrom != nil }, "a window still ahead is shown")

        let late = PriceStore.entries(from: data, now: Date(timeIntervalSince1970: h0 + 5 * 3600 + 60))
        check(late.count == 1 && late[0].price == 55, "last hour only")
        check(late[0].cheapFrom != nil, "window in progress is still shown")

        let over = PriceStore.entries(from: data, now: Date(timeIntervalSince1970: h0 + 9 * 3600))
        check(over.count == 1 && over[0].price == nil, "stale data gives one empty entry")
        check(PriceStore.entries(from: nil, now: now).first?.price == nil, "no data gives one empty entry")

        let passed = WidgetData(updated: h0, area: "DK2", hours: hours, cheapFrom: h0, cheapTo: h0 + 2 * 3600)
        check(PriceStore.entries(from: passed, now: now).allSatisfy { $0.cheapFrom == nil }, "a window that has passed is hidden")

        check(PriceStore.tier(100, lo: 100, hi: 100.5) == 0, "flat day counts as cheap")

        let json = #"{"updated":1,"area":"DK1","hours":[{"t":10,"p":95.4}],"cheapFrom":null,"cheapTo":null}"#
        let decoded = try? JSONDecoder().decode(WidgetData.self, from: Data(json.utf8))
        check(decoded?.hours.first?.p == 95.4 && decoded?.cheapFrom == nil, "decodes the JSON the app writes")

        check(PriceStore.decode(json)?.hours.count == 1, "decode helper reads the same JSON")

        check([99.9, 100, 224.9, 225].map(PriceStore.level) == [0, 1, 1, 2], "fixed scale matches PRICE_LEVELS in pricing.js")
        check(PriceStore.goTier(0, 2) == 1 && PriceStore.goTier(2, 0) == 1 && PriceStore.goTier(0, 0) == 0, "goTier matches pricing.js")
        check(e.first?.level == 1 && e.dropFirst().first?.level == 2, "entries carry the fixed level")
        check(e.first?.bars.count == 4 && e.first?.bars.first?.price == 150, "bars start at the current hour")
        check(e.last?.bars.count == 1, "bars shrink towards the end of the data")

        print(failures == 0 ? "PriceStore: all checks passed" : "PriceStore: \(failures) failed")
        exit(failures == 0 ? 0 : 1)
    }
}
