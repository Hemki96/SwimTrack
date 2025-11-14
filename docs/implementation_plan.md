# SwimTrack Blueprint Umsetzung – Schritt-für-Schritt-Anleitung

Diese Anleitung beschreibt ein iteratives Vorgehen zur Implementierung des in `docs/implementation_blueprint.md` definierten Zielbilds. Die Schritte sind so gegliedert, dass nach jeder Phase ein nutzbarer Mehrwert entsteht und fachliche Risiken früh adressiert werden.

## Phase 0 – Projektstart & Grundlage schaffen
1. **Anforderungen konsolidieren**
   - Blueprint lesen und relevante Screens im Verzeichnis `screens/` sichten.
   - Stakeholder-Feedback zu offenen Fragen (z. B. Detailumfang Trainingseinheit-Detail) einholen.
2. **Arbeitsweise festlegen**
   - Repository-Struktur für Frontend/Backend definieren (Mono-Repo oder getrennt).
   - CI/CD-Pipeline und Quality-Gates (Linting, Tests) beschließen.
3. **Technische Basis entscheiden**
   - Technologie-Stack (Frontend-Framework, Backend-Framework, Datenbank) auswählen.
   - Hosting-/Deployment-Strategie und Sicherheitsanforderungen festlegen.
4. **UX-Assets aufbereiten**
   - Mockups/Wireframes aus `screens/` in ein zentrales Tool importieren.
   - Design-Tokens, Komponentenbibliothek und Styleguide definieren.

## Phase 1 – Authentifizierung & Stammdaten
1. **Domänenmodell verfeinern**
   - Entitäten & Beziehungen aus Blueprint §3 als ER-Modell konkretisieren.
   - Datenbank-Schema und Migrationen vorbereiten.
2. **Benutzerverwaltung & Login umsetzen**
   - Auth-Endpoints (`auth/login`, `auth/refresh`) implementieren.
   - Rollen (Trainer:in, Cheftrainer:in) im Backend modellieren.
3. **Stammdaten-Services bauen**
   - Teams (`teams/list`, `teams/createOrUpdate`), Athlet:innen, Trainer:innen.
   - Seed-Daten/Sample-Datasets anlegen.
4. **Einstellungs-UI entwickeln**
   - Screen „Einstellungen / Stammdaten“ nach Blueprint §6.6 & Screens umsetzen.
   - Validierungslogik (Pflichtfelder, eindeutige Kürzel) integrieren.
5. **Berechtigungslogik testen**
   - Zugriff auf Stammdaten nur für berechtigte Rollen freischalten.

## Phase 2 – Trainingskalender & Einheiten-Detail
1. **Trainings-Backend erweitern**
   - Endpoints `trainings/create`, `trainings/listByTeam`, `trainings/get/{id}` implementieren.
   - Status-Workflow (geplant → offen → erledigt) abbilden.
2. **Kalender-Frontend realisieren**
   - Hauptnavigation inkl. Zugriff auf Kalender (Blueprint §2.1/§2.2).
   - Kalender-Komponente mit Filterchips und Termin-Karten (`screens/trainingskalender_&_übersicht`).
3. **Trainingseinheit-Detail bauen**
   - Formular- und Tab-Struktur für Anwesenheit, Umfang, Kommentare (Blueprint §4.3).
   - Speichern/Abschließen-Logik mit Validierungen.
4. **Anwesenheit-Service implementieren**
   - Endpoint `attendance/getBySession` + `attendance/saveForSession`.
   - Frontend-Komponente „Athletenliste mit Anwesenheitsstatus“ (Blueprint §6).
5. **Dashboard-Basics**
   - Schnellaktionen + Liste offener Einheiten (Blueprint §4.1).
   - Backend-Logik für Kennzahlen (offene Dokumentationen).

## Phase 3 – Leistungsdatenerfassung & Athletenprofil
1. **Leistungsdatenmodell ausprägen**
   - Messwert-Entität aus Blueprint §3 um technische Felder erweitern.
   - Relation zu Trainingseinheit/Testset definieren.
2. **Endpoints für Leistungsdaten**
   - `performances/listBySession`, `performances/saveBatch` inkl. Plausibilitätschecks.
3. **Frontend „Leistungsdatenerfassung“**
   - Tabelle mit Inline-Editing, Teilnahme-Toggle (Blueprint §4.4 & §6).
   - Validierung (Zeitformat, RPE-Bereich) implementieren.
4. **Athletenprofil mit Kennzahlen**
   - Backend: `athletes/get/{id}`, `athletes/getProgressMetrics`.
   - Frontend: Kennzahlen-Widgets, Verlaufsdiagramme, Notiz-Panel (Blueprint §4.5, §6).
5. **Datenfluss testen**
   - Zusammenspiel Anwesenheit ↔ Leistungsdaten ↔ Athletenmetriken sichern.

## Phase 4 – Reporting & Auswertungen
1. **Metrik-Services**
   - `metrics/getTeamSummary`, `metrics/getAthleteSummary`, `metrics/getAttendanceTrend` (Blueprint §5.1/§7).
2. **Report-Generator**
   - `reports/generate`, `reports/listScheduled`, `reports/schedule`.
   - Aggregationslogik (Zeiträume, Filter, Kennzahlen) gem. Blueprint §7.
3. **Reports-Frontend**
   - Screen „Reports/Export“ nach Blueprint §4.7 & Komponentenliste.
   - Export/Download-Handling, Statusanzeige geplanter Exporte.
4. **Individualreport integrieren**
   - Screen `screens/auswertungen_–_athlet__individualreport` mit Drill-down.
   - Vergleichswerte/Benchmarks implementieren.
5. **Dashboard erweitern**
   - KPI-Widgets mit Daten aus Metrik-Services befüllen.

## Phase 5 – Qualitätssicherung & Rollout
1. **End-to-End-Tests & Abnahme**
   - Flows „Training dokumentieren“, „Anwesenheit erfassen“, „Athletenentwicklung ansehen“, „Mannschaftsreport erstellen“ durchtesten.
2. **Performance- & Security-Audits**
   - Datenbank-Abfragen optimieren, Rollen/Berechtigungen prüfen.
3. **Dokumentation finalisieren**
   - Nutzer-Handbuch, API-Referenz, Betriebshandbuch.
4. **Pilotbetrieb & Feedback**
   - Mit ausgewähltem Trainerteam starten, Feedback sammeln.
5. **Plan für Ausbaustufen erstellen**
   - Roadmap an Blueprint §8.2 angleichen (z. B. mobile Schnellerfassung, Erinnerungen).

## Ergänzende Checklisten
- **Datenmigration**: Legacy-Daten importieren (falls vorhanden), Konsistenzprüfungen durchführen.
- **Monitoring**: Logging, Metrics & Alerts für kritische Endpoints einrichten.
- **Schulung**: Trainer:innen und Cheftrainer:innen in Kernflows einweisen.

Diese Schritt-für-Schritt-Anleitung sollte gemeinsam mit dem Blueprint gepflegt und nach jedem Release-Feedback aktualisiert werden.
