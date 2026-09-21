# Handoff do implementacji — CNC Panel

Źródło prawdy: `CNC Panel.dc.html` (klikalny mockup, 1024×768, style inline = jawne wartości).
Cel: React + Tailwind, bez magicznych liczb w JSX.

## 1. Tokeny (zrobić pierwsze)

- [ ] Wyciągnąć paletę z `:root` / `[data-theme="dark"]` mockupu do `tailwind.config`:
      `bg, surf, panel, line, ink, mut, acc, accS, red, grn, amb, field` — dwa motywy, przełączane atrybutem `data-theme` na roocie.
- [ ] Typografia: UI = IBM Plex Sans, cyfry pozycji = Azeret Mono (zmienna `--num`, alternatywy: JetBrains Mono, Share Tech Mono, IBM Plex Mono).
- [ ] Skala odstępów: 4 / 8 / 14 / 18 px; `--pad` i `--gap` zależne od gęstości (`comfortable` / `compact`).
- [ ] Wysokości dotykowe: 40 / 52 / 64 px (nic poniżej 40 px na ekranie dotykowym).
- [ ] Promienie: 4 px (kontrolki), 6 px (karty). Obramowania zawsze `1px solid line`.
- [ ] Zasada akceptacji: żadnej wartości `#hex` ani `text-[13px]` w komponentach — tylko tokeny.

## 2. Komponenty (te miejsca w mockupie = jeden komponent)

- [ ] `SegmentedChoice` — krok XY, krok Z, prędkość jogu, G54–G57, widoki ISO/XY/XZ. Props: `options, value, onChange, size`.
- [ ] `AxisRow` — wiersz DRO: litera osi, duża wartość + jednostka, opcjonalna mniejsza pozycja maszynowa.
- [ ] `DroWidget` — tryby `work` / `machine` / `select` (selektor zera w nagłówku). Spójne linie i kafle we wszystkich trybach.
- [ ] `StatTile` — kafle pól sondy, narzędzia, obrotów. Props: `label, value, unit`.
- [ ] `JogPad` — krzyż XY + kolumna Z + przyciski home.
- [ ] `OverrideBar` — korekta posuwu / wrzeciona (label, %, pasek).
- [ ] `ProgressCard` — postęp zadania, linia, czas, START/PAUZA.
- [ ] `FileList` + `FileDetails` — lista z zaznaczeniem i panel szczegółów.
- [ ] `ProbeWizard` — kroki 1–4 po lewej, parametry i akcja po prawej.
- [ ] `AlarmLog` — wiersze czas / poziom / opis, kolory z tokenów poziomu.
- [ ] `IoIndicator` — kropka stanu + etykieta (diagnostyka).
- [ ] `TopBar` (stan maszyny, plik, motyw, STOP), `NavRail` / `NavTabs`, `StatusBar`.
- [ ] `CanvasPlaceholder` → docelowo widok three.js (ścieżka) i miniatura pliku.

## 3. Ekrany (11, nawigacja klikalna)

- [ ] Pulpit (dwa układy: `dro` i `viz` — podgląd na całą szerokość), Jog, Zerowanie, Pliki, Ścieżka, Sonda, Diagnostyka, Alarmy, Ustawienia, Bazowanie, MDI.
- [ ] Tryby panelu jako props/kontekst: `theme`, `density`, `navMode` (rail/tabs), `runLayout` (dro/viz), `droMode` (work/machine/select), `numFont`.

## 4. Stany brzegowe (mockup ich nie pokazuje — doprecyzować przed kodem)

- [ ] Hover / focus / active / disabled dla każdego przycisku (dotyk: wyraźny `:active`).
- [ ] Stan alarmu: co jest zablokowane (START, MDI, jog?), jak wygląda pasek górny.
- [ ] Brak bazowania: które akcje nieaktywne.
- [ ] Długie nazwy plików i brak USB / pusta lista.
- [ ] Utrata połączenia ze sterownikiem w trakcie pracy.
- [ ] Szerokości inne niż 1024 px (1280, 1920, pendant ~800 px) — co się skaluje, co zostaje.

## 5. Warstwa danych (grblHAL)

- [ ] Kontrakt statusu: `state, wpos[xyz], mpos[xyz], wco, feed, spindle, overrides, buffer, pins, line`.
- [ ] Transport i częstotliwość odpytywania; throttling renderu DRO (nie re-render całego ekranu na każdą ramkę).
- [ ] Kolejka komend MDI + obsługa `error:` / `ALARM:` na dziennik zdarzeń.
- [ ] Trwałość: aktywne zero, ostatni plik, motyw, gęstość.

## 6. Weryfikacja

- [ ] Render obok mockupu, ekran po ekranie, przy 1024×768, oba motywy, oba warianty gęstości.
- [ ] Sprawdzić rozjazdy tam, gdzie modele najczęściej dryfują: odstępy i wysokości przycisków.
- [ ] Lint/grep: brak wartości poza tokenami; brak zduplikowanych implementacji komponentów z sekcji 2.
