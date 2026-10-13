import SwiftUI
import WidgetKit

// Shared by the watch complication and the watch app (which shows them in a
// DEBUG-only gallery, since the simulator cannot put them on a watch face).

enum Look {
    static let tier = [
        Color(red: 0x34 / 255, green: 0xB2 / 255, blue: 0x7B / 255),
        Color(red: 0xF5 / 255, green: 0xB8 / 255, blue: 0x41 / 255),
        Color(red: 0xE5 / 255, green: 0x60 / 255, blue: 0x4D / 255)
    ]
    static let tierLabel = ["Billigt i dag", "Middel i dag", "Dyrt i dag"]
    static let levelLabel = ["Lav pris", "Normal pris", "Høj pris"]

    /// 95.4 øre -> "0,95"
    static func kr(_ ore: Double?) -> String {
        guard let p = ore else { return "–" }
        return String(format: "%.2f", p / 100).replacingOccurrences(of: ".", with: ",")
    }

    static let hour: DateFormatter = {
        let f = DateFormatter()
        f.locale = Locale(identifier: "da_DK")
        f.timeZone = TimeZone(identifier: "Europe/Copenhagen")
        f.dateFormat = "HH"
        return f
    }()

    static func window(_ e: PriceEntry) -> String? {
        guard let from = e.cheapFrom, let to = e.cheapTo else { return nil }
        return "\(hour.string(from: from))–\(hour.string(from: to))"
    }
}

/// Small bar chart of the coming hours, the current hour first and outlined.
struct Bars: View {
    let bars: [Bar]
    var body: some View {
        GeometryReader { geo in
            let hi = max(bars.map(\.price).max() ?? 1, 1)
            HStack(alignment: .bottom, spacing: 2) {
                ForEach(Array(bars.enumerated()), id: \.offset) { i, b in
                    RoundedRectangle(cornerRadius: 1.5)
                        .fill(Look.tier[b.tier].opacity(i == 0 ? 1 : 0.8))
                        .frame(height: max(3, geo.size.height * max(b.price, 0) / hi))
                }
            }
            .frame(maxHeight: .infinity, alignment: .bottom)
        }
    }
}

struct ComplicationView: View {
    let entry: PriceEntry
    var familyOverride: WidgetFamily? = nil   // for the in-app gallery, where there is no widget family
    @Environment(\.widgetFamily) private var family

    var body: some View {
        switch familyOverride ?? family {
        case .accessoryCircular: circular
        case .accessoryCorner: corner
        case .accessoryInline: inline
        default: rectangular
        }
    }

    /// Needle on the fixed scale (0–3 kr), so the ring says low or high at a glance.
    private var gauge: some View {
        Gauge(value: min(entry.price ?? 0, 300), in: 0...300) {
            Text("kr")
        } currentValueLabel: {
            Text(Look.kr(entry.price)).minimumScaleFactor(0.5)
        }
        .tint(Gradient(colors: Look.tier))
    }

    private var circular: some View {
        gauge.gaugeStyle(.accessoryCircular)
    }

    private var corner: some View {
        Text(Look.kr(entry.price))
            .font(.system(.title3, design: .rounded).weight(.bold))
            .widgetCurvesContent()
            .widgetLabel { gauge.gaugeStyle(.accessoryLinear) }
    }

    private var inline: some View {
        if let w = Look.window(entry) {
            Text("\(Look.kr(entry.price)) kr · billigst \(w)")
        } else {
            Text("\(Look.kr(entry.price)) kr/kWh")
        }
    }

    private var rectangular: some View {
        VStack(alignment: .leading, spacing: 1) {
            if entry.price == nil {
                Text("I stødet").font(.headline)
                Text("Åbn appen på iPhone").font(.caption2).foregroundStyle(.secondary)
            } else {
                HStack(spacing: 4) {
                    Circle().fill(Look.tier[entry.go]).frame(width: 6, height: 6)
                    Text("\(Look.tierLabel[entry.tier]) · \(Look.levelLabel[entry.level].lowercased())")
                        .font(.caption2.weight(.semibold)).lineLimit(1).minimumScaleFactor(0.7)
                }
                HStack(alignment: .firstTextBaseline, spacing: 3) {
                    Text(Look.kr(entry.price)).font(.system(.title3, design: .rounded).weight(.bold))
                    Text("kr/kWh").font(.caption2).foregroundStyle(.secondary)
                }
                Bars(bars: entry.bars).frame(height: 14).widgetAccentable()
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }
}
