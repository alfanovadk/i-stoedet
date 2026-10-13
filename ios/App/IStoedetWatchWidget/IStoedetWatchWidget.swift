import SwiftUI
import WidgetKit

// «I stødet»-komplikation på uret. Data kommer fra ur-appen, som får dem fra
// iPhone-appen via WatchConnectivity og gemmer dem i App Group'en på uret.

struct WatchPriceProvider: TimelineProvider {
    func placeholder(in context: Context) -> PriceEntry {
        PriceEntry(date: Date(), price: 95, tier: 0, level: 0, cheapFrom: nil, cheapTo: nil, area: "DK1")
    }

    func getSnapshot(in context: Context, completion: @escaping (PriceEntry) -> Void) {
        completion(PriceStore.entries(from: PriceStore.load(), now: Date()).first ?? placeholder(in: context))
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<PriceEntry>) -> Void) {
        let entries = PriceStore.entries(from: PriceStore.load(), now: Date())
        let last = entries.last?.date ?? Date()
        completion(Timeline(entries: entries, policy: .after(last.addingTimeInterval(3600))))
    }
}

@main
struct IStoedetWatchWidget: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: "IStoedetWatchWidget", provider: WatchPriceProvider()) { entry in
            ComplicationView(entry: entry).containerBackground(.clear, for: .widget)
        }
        .configurationDisplayName("I stødet")
        .description("Prisen på strøm lige nu og det næste billige tidsrum.")
        .supportedFamilies([.accessoryRectangular, .accessoryCircular, .accessoryCorner, .accessoryInline])
    }
}
