# SwimTrack Design Guidelines

Diese Richtlinien leiten sich direkt aus den finalen HTML-Screens im Ordner `screens/` ab und dienen als Referenz für weitere Seiten oder Komponenten.

## Typografie
- **Primäre Schrift:** [`Lexend`](https://fonts.google.com/specimen/Lexend) in den Schnitten 400–900.
- **Basisgrößen:**
  - Fließtext: `text-sm` (14 px) oder `text-base` (16 px) je nach Kontext.
  - Überschriften: `text-2xl` für Screen-Titel, `text-lg` für Kartenüberschriften, `text-sm` für Sektionstitel.
- **Schriftstil:** Großgeschriebene, eng gesetzte `text-xs` Labels für Sektionstitel und Hilfetexte (`uppercase`, `tracking-wide`).

## Farben & Tokens
- **Primärfarbe:** `#137FEC` (`bg-primary`, `text-primary`).
- **Neutrale Flächen:**
  - Hellmodus: `#F6F7F8` (`bg-background-light`), Karten `#FFFFFF` (`bg-card-light`).
  - Dunkelmodus: `#101922` (`bg-background-dark`), Karten `#1A2530` (`bg-card-dark`).
- **Text:**
  - Hellmodus: `#182431` (`text-light-primary`) und `#6B7785` (`text-light-secondary`).
  - Dunkelmodus: `#E1E6EB` (`text-dark-primary`) und `#92ADC9` (`text-dark-secondary`).
- **Feedbackfarben:**
  - Erfolg `#22C55E` (`text-success`), Warnung `#FACC15`, Hinweis/Fehler `#F97316`.
- **Rahmen:** `#E5E7EB` (`border-light`) bzw. `#2A3947` (`border-dark`).

Alle Farben sind als Tailwind Utilities verfügbar (siehe `index.html` Tailwind-Konfiguration).

## Abstände & Ecken
- **Eckenradien:** Standard `rounded-xl` (12 px). Für Badges `rounded-full`.
- **Innenabstände:**
  - Karten: `p-5`/`p-6`.
  - Screen-Ränder: `p-6` auf mobilen Breakpoints, `p-10` ab `lg`.
- **Abstände zwischen Sektionen:** `space-y-6` bzw. `gap-6` in Grids.

## Layoutprinzipien
- **App-Shell:** Einheitliche Zweispaltenstruktur über alle Screens. Links eine feste Sidebar (`w-72`) mit `sticky top-0 h-screen overflow-y-auto`, rechts der Content-Bereich (`flex-1 overflow-y-auto`).
- **Navigation:** In der Sidebar zwei Gruppen (`data-nav-primary`, `data-nav-secondary`). Buttons nutzen die gemeinsame Klasse `flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-text-light-secondary dark:text-text-dark-secondary hover:bg-primary/10 dark:hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary`. Aktive Route = `bg-primary text-white shadow-card`.
- **Persistente Elemente:** Im unteren Navigationsblock befinden sich Theme-Toggle (`data-theme-toggle`), Link zu den Einstellungen und das User-Modul mit Avatar. Diese Elemente bleiben auf allen Seiten sichtbar.
- **Header:** Sticky (`h-20`, `border-b`) mit Titelblock links und Aktions-Buttons rechts. Hintergrund `bg-background-light/80 dark:bg-background-dark/80`, `backdrop-blur-sm`.
- **Grids:** Häufig `lg:grid-cols-[1.5fr_1fr]` oder `lg:grid-cols-3` für Karten-Layout.
- **Kartenstruktur:**
  - Überschrift (`text-lg`, `font-semibold`), optional Untertitel in `text-sm`.
  - Inhalt als Flex/Grid, Infochips mit `rounded-full`.

## Interaktion & Komponenten
- **Buttons:**
  - Primär: `bg-primary text-white shadow-card`.
  - Sekundär/Outline: `bg-card-light ring-1 ring-border-light` (dunkel: `bg-card-dark`).
- **Listen-/Cards:** Hovert `hover:-translate-y-0.5` + `hover:shadow-card` für klickbare Elemente.
- **Formulare:** Inputs/Selects mit `rounded-lg border border-border-light bg-transparent px-3 py-2`.
- **Dialoge:** Maximalbreite `max-w-xl`, Schatten `shadow-card`, dunkler Overlay `backdrop:bg-black/50`.

## Responsives Verhalten
- Karten stapeln sich mobil (`grid-cols-1`), ab `lg` mehrfach Spalten.
- Sidebar bleibt fix (Breite `w-72`, `sticky top-0`), Content scrollt innerhalb `main` (`overflow-y-auto`).

## Komponentenübersicht
- **Dashboard:** KPI-Grid (`md:grid-cols-2`, `xl:grid-cols-4`), Filterchips, Fortschrittsbalken (`h-3`, `rounded-full`).
- **Trainingsübersicht:** Filter-Toolbar oben, Listenkarte pro Einheit, Detailkarte und Anwesenheitsformular mit Grid-Aufteilung.
- **Leistungsdaten:** Tabellen mit alternierenden Zeilenfarben, Trendkarten als gestapelte Artikel.
- **Athletenprofil:** Zweispaltiges Layout (Liste + Detailkarte), Kennzahlen als Karten.
- **Mannschaften:** Karten mit Statistiken und separater Staff-Liste.
- **Reports:** Tab-Navigation (`data-tab`), Reportkarten, Exportbereich mit Formular-Kacheln.
- **Einstellungen:** Vier gleichgewichtete Karten (Benachrichtigungen, Datenschutz, Integrationen, Stammdaten) in einem `lg:grid-cols-2` Layout.

## Dark & Light Mode
- `html` schaltet den Modus über `class="dark"` und `data-theme`. `body` erbt das aktive Theme (siehe `theme.js`).
- Die Sidebar enthält einen Toggle (`[data-theme-toggle]`) für den Wechsel. Dieser muss pro Screen eingebunden sein und das aktuelle Theme widerspiegeln.
- Alle Komponenten verwenden Tailwind `dark:`-Utilities. Neue Komponenten müssen Hell- und Dunkelmodus parallel berücksichtigen.
- Theme-Persistenz erfolgt über `localStorage` (`swimtrack-theme`). Beim Initialisieren (`applySavedTheme`) muss der gespeicherte oder systemische Modus gesetzt werden.

## Asset- und Icon-Einsatz
- Icons: Google Material Symbols Outlined (`<span class="material-symbols-outlined">name</span>`).
- Logo/Icon Platzhalter: SVG mit Primärfarbe.

## Coding-Pattern
- Wiederverwendbare Komponenten befinden sich in `screens/` als HTML-Templates. Beim Anlegen neuer Screens diese Templates per `loadScreenTemplate` einbinden und IDs (`#...`) für dynamische Daten bereitstellen.
- Navigation erfolgt über `data-route` Attribute. Neue Links müssen `setupNavigation` unterstützen.
- Datenbindungen nutzen modulare Renderer in `src/scripts/views/` (Tailwind-Klassen verwenden, keine inline-Styles außerhalb Tokens).

Diese Leitlinien gewährleisten Konsistenz zwischen den gelieferten High-Fidelity Screens und zukünftigen Erweiterungen.
