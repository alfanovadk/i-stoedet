import SwiftUI
import WidgetKit

@main
struct IStoedetWatchApp: App {
    @StateObject private var store = WatchStore.shared

    var body: some Scene {
        WindowGroup {
            #if DEBUG
            if ProcessInfo.processInfo.arguments.contains("-complications") {
                ComplicationGallery(data: store.data)
            } else {
                PriceView(data: store.data)
            }
            #else
            PriceView(data: store.data)
            #endif
        }
        // Lets the phone's updates reach the watch (and the complication) while the app is not open.
        .backgroundTask(.watchConnectivity) { await WatchStore.shared.drain() }
    }
}

/// One screen: the price now, today's position and the fixed level, the next
/// cheap window and the coming hours.
struct PriceView: View {
    let data: WidgetData?
    #if DEBUG
    static let startAtBottom = ProcessInfo.processInfo.arguments.contains("-bottom")   // simulator screenshots
    #else
    static let startAtBottom = false
    #endif

    var body: some View {
        TimelineView(.everyMinute) { ctx in
            let e = PriceStore.entries(from: data, now: ctx.date).first ?? .empty(ctx.date)
            NavigationStack {
                ScrollView {
                    if e.price == nil { empty } else { content(e) }
                }
                .defaultScrollAnchor(Self.startAtBottom ? .bottom : .top)
                .navigationTitle("I stødet")
                .containerBackground(Look.tier[e.go].opacity(e.price == nil ? 0 : 0.35).gradient, for: .navigation)
            }
        }
    }

    private var empty: some View {
        VStack(alignment: .leading, spacing: 8) {
            Image(systemName: "bolt.fill").font(.title2).foregroundStyle(Look.tier[1])
            Text("Åbn I stødet på din iPhone for at hente dagens priser.")
                .font(.footnote)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }

    private func content(_ e: PriceEntry) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack(spacing: 5) {
                Circle().fill(Look.tier[e.tier]).frame(width: 8, height: 8)
                Text(Look.tierLabel[e.tier]).font(.footnote.weight(.semibold))
            }
            HStack(alignment: .firstTextBaseline, spacing: 4) {
                Text(Look.kr(e.price))
                    .font(.system(size: 44, weight: .heavy, design: .rounded))
                    .minimumScaleFactor(0.6).lineLimit(1)
                Text("kr/kWh").font(.caption2).foregroundStyle(.secondary)
            }
            Text(Look.levelLabel[e.level])
                .font(.caption2.weight(.bold))
                .padding(.horizontal, 8).padding(.vertical, 3)
                .background(Capsule().fill(Look.tier[e.level].opacity(0.3)))
            if let w = Look.window(e) {
                Text("Billigst kl. \(w)").font(.footnote.weight(.semibold))
            }
            Bars(bars: e.bars).frame(height: 44).padding(.top, 4)
            if let first = e.bars.first, let last = e.bars.last {
                HStack {
                    Text("nu"); Spacer(); Text("kl. \(Look.hour.string(from: last.date))")
                }
                .font(.caption2).foregroundStyle(.secondary)
                .accessibilityLabel("Søjlerne viser prisen fra nu til kl. \(Look.hour.string(from: last.date)), første kl. \(Look.hour.string(from: first.date))")
            }
            if let d = data {
                Text("Opdateret \(Date(timeIntervalSince1970: d.updated).formatted(date: .omitted, time: .shortened)) · \(d.area)")
                    .font(.caption2).foregroundStyle(.secondary).padding(.top, 2)
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }
}

#if DEBUG
/// The complication families rendered in the app, for simulator screenshots.
struct ComplicationGallery: View {
    let data: WidgetData?
    var body: some View {
        let e = PriceStore.entries(from: data, now: Date()).first ?? .empty(Date())
        ScrollView {
            VStack(spacing: 10) {
                ComplicationView(entry: e, familyOverride: .accessoryRectangular)
                    .frame(width: 170, height: 60).background(Color.white.opacity(0.08))
                HStack(spacing: 10) {
                    ComplicationView(entry: e, familyOverride: .accessoryCircular)
                        .frame(width: 50, height: 50)
                }
                ComplicationView(entry: e, familyOverride: .accessoryInline)
            }
        }
    }
}
#endif
