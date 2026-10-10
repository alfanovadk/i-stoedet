# I stødet · widget

Hjemmeskærms-widget, der viser prisen lige nu og det næste billige tidsrum.

## Status

Widget'en er et target (`IStoedetWidget`) i `ios/App/App.xcodeproj` og bliver indlejret i
appen (`App.app/PlugIns/IStoedetWidget.appex`). Projektet bygger til simulator med Xcode 27,
og appen skriver prisdata til den delte App Group, når den kører i simulatoren.

| Del | Fil | Kontrolleret hvordan |
|---|---|---|
| Datamodel og time-logik | `PriceStore.swift` | Kompileret og kørt: `PriceStoreCheck.swift` (alle kontroller består) |
| Visning og konfiguration | `IStoedetWidget.swift` | Bygget i widget-targetet. Visningen er renderet til billeder og set igennem |
| Appen sender data | `../App/IStoedetPlugin.swift` (`setWidgetData`) | Kørt i simulator: data ligger i App Group-containeren |
| JS-format | `widgetPayload()` i `src/app/view.js` | `test/view.test.mjs` |

Ikke kontrolleret: widget'en er ikke lagt på en hjemmeskærm og set køre dér, og der er ikke
bygget med rigtig signering til en fysisk iPhone.

Kør logik-kontrollen fra repo-roden (kræver kun Swift-kommandolinjeværktøjerne):

```sh
swiftc ios/App/IStoedetWidget/PriceStore.swift ios/App/IStoedetWidget/PriceStoreCheck.swift -o /tmp/pricestore-check && /tmp/pricestore-check
```

## Det der mangler før TestFlight og App Store

1. Åbn projektet i Xcode med Apple-kontoen for team `7HP79DYM29` og byg til en iPhone.
   Automatisk signering opretter så App ID'et `dk.alfanova.istoedet.widget` og App Group'en
   `group.dk.alfanova.istoedet` i udviklerportalen. Det kan ikke gøres uden kontoen.
2. Åbn appen én gang, så den sender priser. Tilføj derefter widget'en fra hjemmeskærmen
   og tjek, at prisen passer med appen.

## Sådan hænger det sammen

- Appen kalder `IStoedet.setWidgetData({ json })`, hver gang den har hentet priser, og når
  netselskab eller tillæg ændres. JSON-formatet laves af `widgetPayload()` i `src/app/view.js`:
  `{ updated, area, hours: [{ t, p }], cheapFrom, cheapTo }` med tid i sekunder siden 1970
  og pris i øre/kWh.
- Pluginet gemmer JSON'en i den delte App Group og beder WidgetKit om at opdatere.
- Widget'en henter intet selv. Den laver én tidslinje-post pr. kendt time og skifter derfor
  selv pris hver time. Når de kendte timer er brugt op, beder den brugeren åbne appen.
- App Group'en står i `../App/App.entitlements` og `IStoedetWidget.entitlements`. Navnet
  skal matche `IStoedetPlugin.appGroup` og `PriceStore.appGroup`.
- `PriceStoreCheck.swift` og denne README ligger i mappen, men er ikke med i noget target.
