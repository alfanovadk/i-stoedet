# I stødet · widget

Hjemmeskærms-widget, der viser prisen lige nu og det næste billige tidsrum.

## Status

Koden er skrevet og kontrolleret uden Xcode. Widget-targetet er **ikke** oprettet i
Xcode-projektet endnu, så widget'en er ikke med i appen, før trinene nedenfor er udført.

| Del | Fil | Kontrolleret hvordan |
|---|---|---|
| Datamodel og time-logik | `PriceStore.swift` | Kompileret og kørt: `PriceStoreCheck.swift` (alle kontroller består) |
| Visning og konfiguration | `IStoedetWidget.swift` | Typechecket mod WidgetKit og SwiftUI med `swiftc` |
| Appen sender data | `../App/IStoedetPlugin.swift` (`setWidgetData`) | Ikke bygget. JS-siden er testet (`widgetPayload` i `test/view.test.mjs`) |

Kør logik-kontrollen fra repo-roden (kræver kun Swift-kommandolinjeværktøjerne):

```sh
swiftc ios/App/IStoedetWidget/PriceStore.swift ios/App/IStoedetWidget/PriceStoreCheck.swift -o /tmp/pricestore-check && /tmp/pricestore-check
```

## Sådan kommer widget'en med i appen (kræver Xcode, ca. 10 minutter)

1. Åbn `ios/App/App.xcodeproj`. Vælg **File › New › Target › Widget Extension**.
   Navn: `IStoedetWidget`. Fravælg «Include Live Activity» og «Include Configuration App Intent».
2. Slet de Swift-filer, Xcode opretter i den nye gruppe. Tilføj i stedet `PriceStore.swift`
   og `IStoedetWidget.swift` fra denne mappe til targetet `IStoedetWidget`.
   `PriceStoreCheck.swift` og denne README skal **ikke** med i noget target.
3. Sæt widget-targetets **Minimum Deployments** til iOS 15.0, som appen.
4. Tilføj capability **App Groups** på BÅDE targetet `App` og targetet `IStoedetWidget`,
   og opret gruppen `group.dk.alfanova.istoedet` på begge. Navnet skal matche
   `IStoedetPlugin.appGroup` og `PriceStore.appGroup`.
5. Byg og kør på en iPhone eller i simulatoren. Åbn appen én gang, så den sender priser.
   Tilføj derefter widget'en fra hjemmeskærmen.

## Sådan hænger det sammen

- Appen kalder `IStoedet.setWidgetData({ json })`, hver gang den har hentet priser, og når
  netselskab eller tillæg ændres. JSON-formatet laves af `widgetPayload()` i `src/app/view.js`:
  `{ updated, area, hours: [{ t, p }], cheapFrom, cheapTo }` med tid i sekunder siden 1970
  og pris i øre/kWh.
- Pluginet gemmer JSON'en i den delte App Group og beder WidgetKit om at opdatere.
- Widget'en henter intet selv. Den laver én tidslinje-post pr. kendt time og skifter derfor
  selv pris hver time. Når de kendte timer er brugt op, viser den «Åbn I stødet».
- Uden App Group-capability skriver appen til sit eget lager, og widget'en ser ingen data.
  Appen selv påvirkes ikke.
