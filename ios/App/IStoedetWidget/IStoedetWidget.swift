import WidgetKit
import SwiftUI

// «I stødet»-widget: nuværende pris pr. kWh og det næste billige tidsvindue.
// Data kommer fra appen (IStoedetPlugin.setWidgetData) via den delte App Group.
// Widget'en henter intet selv; den viser de timepriser, appen sidst har gemt,
// og skifter selv time for time ud fra dem.

struct PriceProvider: TimelineProvider {
    func placeholder(in context: Context) -> PriceEntry {
        PriceEntry(date: Date(), price: 95, tier: 0, level: 0, cheapFrom: nil, cheapTo: nil, area: "DK1")
    }

    func getSnapshot(in context: Context, completion: @escaping (PriceEntry) -> Void) {
        completion(PriceStore.entries(from: PriceStore.load(), now: Date()).first ?? placeholder(in: context))
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<PriceEntry>) -> Void) {
        let entries = PriceStore.entries(from: PriceStore.load(), now: Date())
        // After the last known hour, ask again; the app refreshes the data when it is opened.
        let last = entries.last?.date ?? Date()
        completion(Timeline(entries: entries, policy: .after(last.addingTimeInterval(3600))))
    }
}

struct PriceWidgetView: View {
    let entry: PriceEntry
    @Environment(\.widgetFamily) private var family

    private static let ink = Color(red: 0x11 / 255, green: 0x35 / 255, blue: 0x2B / 255)
    private static let paper = Color(red: 0xF3 / 255, green: 0xFA / 255, blue: 0xF6 / 255)
    private static let tierColors = [
        Color(red: 0x34 / 255, green: 0xB2 / 255, blue: 0x7B / 255),
        Color(red: 0xF5 / 255, green: 0xB8 / 255, blue: 0x41 / 255),
        Color(red: 0xE5 / 255, green: 0x60 / 255, blue: 0x4D / 255)
    ]
    private static let tierLabels = ["Billigt i dag", "Middel i dag", "Dyrt i dag"]
    private static let levelLabels = ["lav pris", "normal pris", "høj pris"]

    private static let hourFormatter: DateFormatter = {
        let f = DateFormatter()
        f.locale = Locale(identifier: "da_DK")
        f.timeZone = TimeZone(identifier: "Europe/Copenhagen")
        f.dateFormat = "HH"
        return f
    }()

    /// 95.4 øre -> "0,95"
    private var priceText: String {
        guard let p = entry.price else { return "–" }
        return String(format: "%.2f", p / 100).replacingOccurrences(of: ".", with: ",")
    }

    private var windowText: String? {
        guard let from = entry.cheapFrom, let to = entry.cheapTo else { return nil }
        return "Billigst kl. \(Self.hourFormatter.string(from: from))–\(Self.hourFormatter.string(from: to))"
    }

    private var content: some View {
        VStack(alignment: .leading, spacing: 4) {
            HStack(spacing: 6) {
                Circle().fill(Self.tierColors[entry.go]).frame(width: 8, height: 8)
                Text(entry.price == nil ? "I stødet" : "\(Self.tierLabels[entry.tier]) · \(Self.levelLabels[entry.level])")
                    .font(.caption2.weight(.bold))
                    .lineLimit(1).minimumScaleFactor(0.8)
                    .foregroundColor(Self.ink.opacity(0.7))
            }
            Spacer(minLength: 0)
            if entry.price == nil {
                Text("Åbn appen for at hente dagens priser.")
                    .font(.footnote.weight(.medium))
                    .foregroundColor(Self.ink.opacity(0.7))
            } else {
                HStack(alignment: .firstTextBaseline, spacing: 4) {
                    Text(priceText)
                        .font(.system(size: family == .systemSmall ? 38 : 44, weight: .heavy, design: .rounded))
                        .foregroundColor(Self.ink)
                        .minimumScaleFactor(0.6)
                    Text("kr/kWh").font(.caption.weight(.semibold)).foregroundColor(Self.ink.opacity(0.6))
                }
                if let window = windowText {
                    Text(window).font(.caption.weight(.semibold)).foregroundColor(Self.ink.opacity(0.8))
                }
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
    }

    var body: some View {
        if #available(iOS 17.0, macOS 14.0, *) {
            content.containerBackground(Self.paper, for: .widget)
        } else {
            content.padding().background(Self.paper)
        }
    }
}

@main
struct IStoedetWidget: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: "IStoedetWidget", provider: PriceProvider()) { entry in
            PriceWidgetView(entry: entry)
        }
        .configurationDisplayName("I stødet")
        .description("Prisen på strøm lige nu og det næste billige tidsrum.")
        .supportedFamilies([.systemSmall, .systemMedium])
    }
}
