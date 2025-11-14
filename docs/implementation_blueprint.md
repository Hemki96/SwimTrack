# SwimTrack Umsetzungs-Blueprint

## 1. Zielbild & Scope
### 1.1 Nutzerrollen & Erwartungen
- **Trainer:innen** dokumentieren tägliche Einheiten, erfassen Anwesenheit und Leistungsdaten und benötigen einen kompakten Überblick über offene Aufgaben und Teamstatus (vgl. Dashboard-Screen, `screens/dashboard_für_trainer_innen/code.html` Z. 120-189).
- **Cheftrainer:innen/Abteilungsleitung** überwachen Mannschaften, priorisieren Ressourcen und rufen Reports für Teams sowie einzelne Athlet:innen ab (vgl. Reports-Screen, `screens/datenexport_/_reports/code.html` Z. 33-120; Athletenreport, `screens/auswertungen_–_athlet__individualreport/code.html` Z. 33-121).
- **Optional: Athlet:innen** können Einsicht in eigene Entwicklung und individuelle Ziele erhalten, sofern spätere Self-Service-Funktionen vorgesehen werden (Orientierung am Athletenprofil, `screens/athletenprofil__trainingshistorie_&_entwicklung/code.html` Z. 120-258).

### 1.2 Systemziel
- Ganzheitliche Webanwendung zur Planung, Dokumentation und Analyse von Schwimmtrainings für Leistungs- und Nachwuchsteams.
- Integration von kurzfristigen Aufgaben (z. B. offene Dokumentationen) und langfristigen Auswertungen (Verläufe, Zielerreichung).

### 1.3 Umfangsdefinition
- **Must-have (MVP)**
  - Dashboard mit Schnellaktionen und Statusindikatoren für Dokumentation/Anwesenheit (`screens/dashboard_für_trainer_innen/code.html` Z. 120-189).
  - Trainingsübersicht inkl. Kalender, Filter und Zugang zur Detailansicht (`screens/trainingskalender_&_übersicht/code.html` Z. 120-188).
  - Detailansicht je Trainingseinheit mit Anwesenheit, Umfang und Kommentaren (abgeleitet aus Kalenderkarten und Anforderungen; Ergänzung notwendig).
  - Erfassung von Leistungsdaten/Zeitmessungen (`screens/leistungsdatenerfassung/code.html` Z. 46-203).
  - Athletenprofil mit Historie, Kennzahlen und Notizverwaltung (`screens/athletenprofil__trainingshistorie_&_entwicklung/code.html` Z. 120-258).
  - Mannschaftsverwaltung & Stammdatenpflege (`screens/mannschaftsverwaltung/code.html` Z. 40-195; `screens/einstellungen_/_stammdaten/code.html` Z. 25-180).
  - Basis-Reports (Team/Athlet) über Export- oder PDF-Funktionen (`screens/datenexport_/_reports/code.html` Z. 62-176).
- **Nice-to-have**
  - Mobile Schnellerfassung der Anwesenheit (verlinkt über Dashboard-Shortcut, Z. 124-125).
  - Vergleichende Team-Analysen mit Benchmarking (`screens/auswertungen_–_athlet__individualreport/code.html` Z. 122-228).
  - Automatisierte Erinnerungen/Benachrichtigungen und individuelle Self-Service-Zugänge.

## 2. Informationsarchitektur & Navigationskonzept
### 2.1 Hauptbereiche
1. **Dashboard** – Tagesüberblick, Schnellaktionen, Hinweise (`screens/dashboard_für_trainer_innen/code.html` Z. 120-189).
2. **Trainingsübersicht & Kalender** – Monats-/Wochenkalender, Filter, Einstieg zu Einheiten (`screens/trainingskalender_&_übersicht/code.html` Z. 90-188).
3. **Trainingseinheit-Detail** – Anwesenheit, Trainingsumfang, Kommentare, Leistungsdaten (konzeptionelle Erweiterung, über Kalenderkarten erreichbar).
4. **Leistungsdatenerfassung** – tabellarische Eingabe von Zeiten je Test/Set (`screens/leistungsdatenerfassung/code.html` Z. 86-203).
5. **Athleten**
   - **Profil** – Kennzahlen, Leistungsentwicklung, Notizen (`screens/athletenprofil__trainingshistorie_&_entwicklung/code.html` Z. 120-258).
   - **Analyse/Reports** – tiefe Auswertungen (Individualreport, `screens/auswertungen_–_athlet__individualreport/code.html` Z. 122-228).
6. **Mannschaften** – Verwaltung, Trainingstermine, Teamkennzahlen (`screens/mannschaftsverwaltung/code.html` Z. 40-195).
7. **Einstellungen/Stammdaten** – Pflege von Teams, Athlet:innen, Trainer:innen (`screens/einstellungen_/_stammdaten/code.html` Z. 25-180).
8. **Reports/Export** – Konfiguration, Filterung und Export von Berichten (`screens/datenexport_/_reports/code.html` Z. 93-176).

### 2.2 Navigationslogik
- Globales Seitenmenü/Topbar verweist auf Dashboard, Trainingsplanung, Athleten, Analyse/Reports, Einstellungen (siehe Navigationsleisten in mehreren Screens, z. B. `screens/dashboard_für_trainer_innen/code.html` Z. 106-115; `screens/leistungsdatenerfassung/code.html` Z. 46-73).
- Detailnavigation erfolgt kontextuell über Karten/Tabellen-Einträge (Kalenderkachel → Trainingseinheit; Athletenliste → Profil; Report-Filter → Export).

### 2.3 Typische Navigationspfade
- **Training dokumentieren**: Dashboard Schnellaktion → Trainingskalender gefiltert auf „offene Einheiten“ → Trainingseinheit-Detail → Anwesenheit & Umfang speichern → optional Leistungsdaten hinzufügen (`screens/dashboard_für_trainer_innen/code.html` Z. 120-189; `screens/trainingskalender_&_übersicht/code.html` Z. 120-188; `screens/leistungsdatenerfassung/code.html` Z. 86-203).
- **Anwesenheit erfassen**: Dashboard Shortcut oder Kalenderkarte → Trainingseinheit-Detail Anwesenheitsliste → Status setzen, Einheit als abgeschlossen markieren (Shortcut-Verweis Dashboard Z. 124-125, Kalenderkarten Z. 134-176).
- **Athletenentwicklung ansehen**: Navigation → Athletenliste → Athletenprofil → Drill-down in Individualreport (`screens/athletenprofil__trainingshistorie_&_entwicklung/code.html` Z. 120-258; `screens/auswertungen_–_athlet__individualreport/code.html` Z. 122-228).
- **Mannschaftsreport erstellen**: Navigation → Reports → Berichtstyp „Mannschaft“ wählen, Filter setzen, Export starten (`screens/datenexport_/_reports/code.html` Z. 114-176).

## 3. Domänenmodell (fachlich)
| Entität | Beschreibung | Wichtige Attribute | Beziehungen |
| --- | --- | --- | --- |
| **Mannschaft** | Trainingsgruppe mit Trainer:innen und Athlet:innen (`screens/mannschaftsverwaltung/code.html` Z. 88-180) | Name, Kürzel, Trainingszeiten, Standort, Trainerteam, Zielgruppe | 1:n zu Trainingseinheit, n:m zu Athlet:in, n:m zu Trainer:in |
| **Athlet:in** | Individuelle Sportler:in mit Historie (`screens/athletenprofil__trainingshistorie_&_entwicklung/code.html` Z. 120-258) | Personendaten, Jahrgang, Hauptstrecken, Ziele | n:m zu Mannschaft, 1:n zu Anwesenheit, 1:n zu Messwert |
| **Trainer:in** | Verantwortlich für Mannschaften (`screens/mannschaftsverwaltung/code.html` Z. 106-120) | Personendaten, Rolle, Zuständigkeiten | n:m zu Mannschaft, 1:n zu Trainingseinheit |
| **Trainingseinheit** | Termin mit Umfang, Inhalten, Anwesenheit (abgeleitet aus Kalender & Leistungsdatenerfassung) | Datum/Zeit, Ort, Inhalt/Setliste, Status (geplant/offen/erledigt), Kommentare | n:1 zu Mannschaft, 1:n zu Anwesenheit, 1:n zu Leistungsdatensatz |
| **Anwesenheit** | Teilnahme-Status pro Athlet:in und Einheit | Status (anwesend/entschuldigt/unentschuldigt), Bemerkung, Zeitstempel | n:1 zu Athlet:in, n:1 zu Trainingseinheit |
| **Messwert/Leistungsdaten** | Zeitmessungen, Splits, RPE (`screens/leistungsdatenerfassung/code.html` Z. 122-198) | Strecke, Zeit, Splits, Technik, Zusatzinfo, RPE, Notiz | n:1 zu Athlet:in, n:1 zu Trainingseinheit/Testset |
| **Report** | Aggregierte Auswertung (`screens/datenexport_/_reports/code.html` Z. 114-176) | Typ (Mannschaft/Athlet), Zeitraum, Filter, Ausgabeformat | nutzt Daten aus Mannschaft, Athlet:in, Trainingseinheit, Messwert |

## 4. Use-Cases & User-Flows nach Screen
### 4.1 Dashboard
- **Use Cases**: Offene Aufgaben prüfen, Schnellaktionen starten, Hinweise sichten (`screens/dashboard_für_trainer_innen/code.html` Z. 120-189).
- **Eingaben**: Shortcut-Klicks, Filter für Kennzahlen (später).
- **Ergebnis**: Weiterleitung zu spezifischen Workflows; Badge/Status-Updates nach erfolgreichem Abschluss (z. B. Kennzeichnung „Erledigt“ in Trainingsliste Z. 148-167).
- **Validierung**: Benutzerberechtigung (Trainer vs. Cheftrainer), Anzeige persönlicher Hinweise.

### 4.2 Trainingsübersicht & Kalender
- **Use Cases**: Monat/Woche blättern, Filter anwenden, Einheit öffnen, neue Einheit anlegen (`screens/trainingskalender_&_übersicht/code.html` Z. 90-188).
- **Eingaben**: Filterchips (Team, Trainer, Ort, Status, Zeitraum Z. 140-148), Kalendernavigation.
- **Ergebnis**: Gefilterte Terminanzeige; Klick öffnet Trainingseinheit-Detail.
- **Validierung**: Pflichtfelder bei neuer Einheit (Datum, Team, Trainer); Konfliktprüfung (Terminüberschneidung).

### 4.3 Trainingseinheit-Detail (Konzept)
- **Use Cases**: Anwesenheit erfassen, Umfang dokumentieren, Kommentare & Anhänge hinzufügen.
- **Eingaben**: Teilnehmerstatus, Umfangswerte (Distanz, Inhalte), Freitext.
- **Ergebnis**: Einheit erhält Status „Erledigt“ (vgl. Dashboard-Karten Z. 152-166), Anwesenheitsquote aktualisiert.
- **Validierung**: Anwesenheit benötigt Status für alle Athlet:innen; Umfang muss numerische Werte enthalten; Pflichtfelder Datum & Mannschaft unveränderbar nach Abschluss.

### 4.4 Leistungsdatenerfassung
- **Use Cases**: Test/Set auswählen, Zeiten für Athlet:innen erfassen, Teilnahme markieren (`screens/leistungsdatenerfassung/code.html` Z. 120-203).
- **Eingaben**: Drop-down „Test/Set“, Datum, tabellarische Eingaben (Zeit, Splits, Technik, Zusatzinfos, RPE, Notizen).
- **Ergebnis**: Speicherung je Messpunkt; optional als Referenz für Verläufe im Athletenprofil.
- **Validierung**: Zeitformat (MM:SS,ms), Splits optional aber Format-Check, RPE 1-10, Pflichtfeld Athlet + Strecke.

### 4.5 Athletenprofil
- **Use Cases**: Kennzahlen und Verlauf einsehen, Notizen pflegen, Vergleich mit Team (`screens/athletenprofil__trainingshistorie_&_entwicklung/code.html` Z. 120-258).
- **Eingaben**: Filter (Strecken-Selector Z. 182-187), neue Notiz.
- **Ergebnis**: Aktualisierte Notizliste, Chart-Refresh.
- **Validierung**: Notizen Pflichttext, max. Länge (z. B. 1000 Zeichen); Streckenliste aus Stammdaten.

### 4.6 Mannschaftsverwaltung & Stammdaten
- **Use Cases**: Mannschaft anlegen/bearbeiten, Trainerzuordnung, Kennzahlen prüfen (`screens/mannschaftsverwaltung/code.html` Z. 40-195; `screens/einstellungen_/_stammdaten/code.html` Z. 25-180).
- **Eingaben**: Formulare für Teamname, Kürzel, Trainingszeiten, Trainer:innen, Athlet:innen.
- **Ergebnis**: Aktualisierte Stammdaten, Anzeige in Tabellen.
- **Validierung**: Pflichtfelder Name/Kürzel, eindeutige Kürzel, Zeitformat.

### 4.7 Reports & Export
- **Use Cases**: Berichtstyp auswählen, Zeitraum & Filter setzen, Ausgabe erzeugen (`screens/datenexport_/_reports/code.html` Z. 114-176).
- **Eingaben**: Berichtstyp, Zeitraum, Filter (Team, Trainer, Athlet), Format (PDF/CSV), Zeitplan.
- **Ergebnis**: Generierte Datei, optionale Planung wiederkehrender Exporte.
- **Validierung**: Pflichtfelder Typ & Zeitraum, maximale Datenspanne, Berechtigungsprüfung.

### 4.8 Auswertungen (Individualreport)
- **Use Cases**: Analysezeitraum wählen, Kennzahlen interpretieren, Report exportieren (`screens/auswertungen_–_athlet__individualreport/code.html` Z. 122-228).
- **Eingaben**: Zeitraumchips, Druck/Download.
- **Ergebnis**: Aktualisierte Charts, Exportdatei.
- **Validierung**: Zeitraum darf nicht leer, Export verfügbar nur bei ausreichenden Datenpunkten.

## 5. API- & Backend-Blueprint (fachlich)
### 5.1 Kernservices
- `auth/login`, `auth/refresh`
- `teams/list`, `teams/get/{id}`, `teams/createOrUpdate`
- `athletes/list`, `athletes/get/{id}`, `athletes/updateProfile`, `athletes/getProgressMetrics`
- `trainings/listByTeam` (Filter: Zeitraum, Status), `trainings/get/{id}`, `trainings/create`, `trainings/update`, `trainings/complete`
- `attendance/saveForSession` (Batch von Status je Athlet), `attendance/getBySession`
- `metrics/getTeamSummary`, `metrics/getAthleteSummary`, `metrics/getAttendanceTrend`
- `performances/listBySession`, `performances/saveBatch`, `performances/getComparisons`
- `reports/generate` (Typ, Filter, Format), `reports/listScheduled`, `reports/schedule`
- `settings/listCoaches`, `settings/listLocations`, `settings/updateReferenceData`

### 5.2 Fachliche Request/Response-Struktur (vereinfacht)
- **trainings/listByTeam**
  - *Request*: Team-ID, Zeitraum, Status-Filter.
  - *Response*: Liste {Session-ID, Datum, Uhrzeit, Ort, Trainer, Status, Offene Aufgaben} (unterstützt Kalenderdarstellung Z. 134-168).
- **trainings/get/{id}**
  - *Response*: Stammdaten, Inhalte (Sätze/Distanzen), Anwesenheit, Messpunkte-Referenzen.
- **attendance/saveForSession**
  - *Request*: Session-ID, Array {Athlet-ID, Status, Kommentar}.
  - *Response*: Aktualisierte Anwesenheitsquote (Dashboard-Hinweis Z. 187-188) + Zeitstempel.
- **performances/saveBatch**
  - *Request*: Session-/Test-ID, Datum, Array {Athlet-ID, Strecke, Zeit, Splits, Technik, Zusatzinfo, RPE, Notiz} (`screens/leistungsdatenerfassung/code.html` Z. 122-198).
  - *Response*: Gespeicherte Messwert-IDs, Plausibilitätsfeedback (z. B. Abweichungen >X%).
- **metrics/getAthleteSummary**
  - *Response*: Kennzahlen (Gesamt-Trainings, Stunden, Anwesenheit) und Zeitreihen für Charts (`screens/athletenprofil__trainingshistorie_&_entwicklung/code.html` Z. 155-208).
- **reports/generate**
  - *Request*: Typ (Team/Athlet), Zeitraum, Filter (Team, Athlet, Trainer), Format (PDF/CSV), Aggregationsregeln (`screens/datenexport_/_reports/code.html` Z. 114-176).
  - *Response*: Download-Link, Meta (Erstellt am, Autor, Gültigkeit).

## 6. Frontend-Blueprint (fachliche Komponenten)
| Komponente | Beschreibung | Datenbedarf | Aktionen |
| --- | --- | --- | --- |
| **Schnellaktions-Leiste** | Buttons für Training dokumentieren, neue Einheit, Anwesenheit (`screens/dashboard_für_trainer_innen/code.html` Z. 120-126) | Benutzerrolle, Ziel-URLs | Navigationstrigger |
| **Trainingseinheiten-Liste** | Cards mit Team, Zeit, Ort, Status (`screens/dashboard_für_trainer_innen/code.html` Z. 133-167) | Sessionliste inkl. Status | Öffnen Detail, Statusanzeige |
| **Hinweis-Kachel** | Alerts für offene Dokumentationen, Anwesenheit (`screens/dashboard_für_trainer_innen/code.html` Z. 175-188) | Regelbasierte Hinweise | Link zu betroffener Einheit |
| **Kalendergrid** | Monatsansicht mit mehreren Events pro Tag (`screens/trainingskalender_&_übersicht/code.html` Z. 122-176) | Sessions mit Datum, Dauer, Teamfarben | Klick → Sessiondetail |
| **Filter-Chips** | Filter für Team/Trainer/Status/Zeitraum (`screens/trainingskalender_&_übersicht/code.html` Z. 140-148) | Stammdatenlisten | Aktualisiert Query |
| **Leistungsdatentabelle** | Zeilen pro Athlet für Messwerte (`screens/leistungsdatenerfassung/code.html` Z. 122-198) | Athletenliste, Testdefinition, bestehende Werte | Inline-Editing, Teilnahme toggeln |
| **Kennzahlen-Widget** | KPI-Karten (Sessions, Stunden, Anwesenheit) (`screens/athletenprofil__trainingshistorie_&_entwicklung/code.html` Z. 155-171) | Aggregierte Metriken | Drilldown zu Zeitraum |
| **Verlaufsdiagramm** | Linien-/Balkencharts (`screens/athletenprofil__trainingshistorie_&_entwicklung/code.html` Z. 173-208; `screens/auswertungen_–_athlet__individualreport/code.html` Z. 150-209) | Zeitreihen, Benchmarks | Filter ändern, Tooltip |
| **Notiz-Panel** | Textbereiche & Listen (`screens/athletenprofil__trainingshistorie_&_entwicklung/code.html` Z. 239-258) | Notizliste, Berechtigungen | Speichern, Historie |
| **Teamkarte** | Übersicht Team inkl. Trainer & Kennzahlen (`screens/mannschaftsverwaltung/code.html` Z. 106-185) | Teamdaten, Kennzahlen | Bearbeiten, Navigation |
| **Report-Konfigurator** | Segmented Control, Filter, Formatwahl (`screens/datenexport_/_reports/code.html` Z. 114-176) | Stammdaten, Filterdefinitionen | Preview, Export, Schedule |

## 7. Reporting- & Auswertungslogik
- **Teamkennzahlen**: Anzahl Sessions, Gesamtstunden, Distanz, Anwesenheitsquote (Aggregat aus Anwesenheitseinträgen; verlinkt zu Dashboard-Hinweisen Z. 187-188 und Teamkarten Z. 131-185).
- **Athletenkennzahlen**: Trainingsumfang, Stunden, Anwesenheit, persönliche Bestzeiten (`screens/athletenprofil__trainingshistorie_&_entwicklung/code.html` Z. 155-228).
- **Leistungsentwicklung**: Zeitreihen pro Strecke mit Benchmark vs. Team (`screens/auswertungen_–_athlet__individualreport/code.html` Z. 150-209).
- **Aggregationslogik**
  - Zeiträume: Woche, Monat, Saison, benutzerdefiniert (Zeitraumchips, `screens/auswertungen_–_athlet__individualreport/code.html` Z. 140-148; Reports-Filter Z. 114-176).
  - Filter: Team, Trainer, Standort, Test/Set.
  - Berechnung: Summen (Distanz/Std), Durchschnitte (RPE), Quoten (Anwesenheit), Trend (%-Veränderung vs. Referenzperiode).
- **Report-Typen**
  - *Athleten-Monatsreport*: Übersicht Kennzahlen, Verlauf der Hauptstrecken, Anwesenheitsquote, Notizen.
  - *Team-Wochenreport*: Sessions pro Tag, Durchschnittsdistanz, Anwesenheit, offene Aufgaben.
  - *Leistungsdiagnostik-Report*: Testzeiten mit Splits, Technikkommentare (`screens/leistungsdatenerfassung/code.html` Z. 122-198).

## 8. Priorisierung & MVP-Fahrplan
### 8.1 MVP (Version 1)
1. Benutzerverwaltung & Login.
2. Dashboard (Quick Wins + Hinweislogik).
3. Trainingskalender mit Einheitendetail & Anwesenheitserfassung.
4. Stammdaten (Teams, Athlet:innen, Trainer:innen).
5. Basisleistungsdaten (Tabellen-Eingabe) und Speicherung.
6. Einfache Team-/Athletenreports (PDF/CSV Export).

### 8.2 Ausbaustufen
- **Stufe 2**: Erweiterte Leistungsdatenerfassung (Splits-Import, RPE-Validierung), Athletenprofil-Charts.
- **Stufe 3**: Vergleichende Analysen & visuelle Dashboards (Individualreport, Benchmarking), automatisierte Erinnerungen.
- **Stufe 4**: Geplanter Datenexport, Report-Planung, mobile Schnellerfassung, Self-Service-Zugänge für Athlet:innen.

### 8.3 Technische Querschnittsthemen
- Rollenkonzept (Trainer vs. Cheftrainer) für Navigation & Berechtigungen.
- Audit-Logging (Wer hat Anwesenheit/Messwerte geändert?).
- Datenqualität: Pflichtfelder, Formatchecks, Konfliktprüfungen (z. B. doppelte Testeinträge).
- Schnittstellen für zukünftige Wearables/Timing-Systeme (offene Erweiterung in `performances/saveBatch`).

