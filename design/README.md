# Rysunek i kod

Panel (`src/panel`) jest budowany z mockupu, który mieszka w Claude Design —
poza tym repozytorium i poza gitem. Ten katalog trzyma to, co da się trzymać
lokalnie, żeby rysunek i implementacja nie rozjechały się po cichu.

## Gdzie jest rysunek

**Projekt `7629d30f-1ea4-45a6-9f73-ec9b1ed97bf1` — „CNC Panel Controller UI",
plik `CNC Panel.dc.html`.**

Identyfikator musi być zapisany, bo `list_projects` w narzędziu DesignSync
pokazuje **wyłącznie projekty typu design-system**, a mockup nim nie jest. Bez
identyfikatora nie ma jak go znaleźć.

Nieaktualny: `2d2f27d0-55d9-4460-9997-b4ee99335575` / `CNCjs Panel.dc.html` —
starszy, mniejszy rysunek, dwie klatki 1024×600, kanty proste. Wszystko
zbudowane z niego przed 2026-09-21 jest zbudowane z niewłaściwego obrazka.

## Czego nie da się zrobić, i dlaczego

**Synchronizacja dwukierunkowa nie jest możliwa.** To nie brak konfiguracji,
tylko granica narzędzia:

- Mockup jest typu `PROJECT_TYPE_PROJECT` — zwykły projekt Design. DesignSync
  potrafi go **tylko czytać** (`list_files`, `get_file`).
- Zapis wymaga typu `PROJECT_TYPE_DESIGN_SYSTEM`, a **typ jest nadawany przy
  tworzeniu i niezmienny** — mockupu nie da się na taki przerobić.
- Kod nie wraca więc do rysunku. Rysunek jest źródłem, kod jest jego
  realizacją, i przepływ jest jednokierunkowy.

Sam DesignSync jest narzędziem sesji Claude'a, nie poleceniem powłoki. Nie ma
czego wstawić do `package.json`, żeby „ciągnęło samo".

## Co jest tutaj

| plik | co to jest |
| --- | --- |
| `tokens.expected.css` | bloki `:root` i przełączniki rysunku, skopiowane dosłownie przy ostatnim pobraniu |
| `HANDOFF-TODO.md` | specyfikacja wdrożenia z projektu Design, wersjonowana razem z kodem |

Samego `CNC Panel.dc.html` tu nie ma. To 107 kB wygenerowanego runtime'u React,
który zmienia się cały przy każdej edycji rysunku — w gicie byłby szumem, nie
historią. Mieszka tam, gdzie jego miejsce, i pobiera się go na żądanie.

## Co jest sprawdzane mechanicznie

`yarn design-check` (wpięte też w `yarn lint`) porównuje `tokens.expected.css`
z `src/panel/styles/tokens.css` i przewraca się, gdy któryś token z rysunku
zniknął albo ma inną wartość.

To jedyna część pytania „czy kod to wciąż ten projekt", na którą maszyna umie
odpowiedzieć — i akurat ta, która psuje się bez śladu. Zmieniony `#hex` w
rysunku wygląda w pull requeście jak nic. Układ, rytm i proporcje wymagają oczu
i porównania zrzutów ekran po ekranie.

Tokeny zadeklarowane u nas, a nieobecne w rysunku, są raportowane i dozwolone.
Część jest **wyliczona** z liczb rysunku, a nie wymyślona — `--jpad` to cztery
klawisze i przerwy między nimi, `--jcard` to wyrażenie wprost z mockupu. Rysunek
nie ma jak powiedzieć „to jest pochodna".

## Jak odświeżyć po zmianie rysunku

1. Powiedz Claude'owi: *pobierz rysunek*. Pobiera `CNC Panel.dc.html` i
   `HANDOFF-TODO.md` przez DesignSync i przepisuje `tokens.expected.css`.
2. `yarn design-check` — mówi dokładnie, które tokeny się ruszyły.
3. Rozjazdy w tokenach to decyzja, nie usterka: albo rysunek się zmienił i
   panel ma pójść za nim, albo ktoś ruszył panel ręcznie. Skrypt mówi *że*, nie
   *dlaczego*.
4. Układ porównuj obrazem. Mockup renderuje się lokalnie: obok
   `CNC Panel.dc.html` połóż `support.js` z projektu, dorzuć globalne UMD React
   i ReactDOM oraz przejściówkę `createRoot` → `render`, i otwórz w
   przeglądarce. Nawigacja działa, więc każdy z jedenastu ekranów da się
   sfotografować i postawić obok zrzutu z `/panel`.

## Jeśli kiedyś ma być przepływ w drugą stronę

Byłby to osobny projekt **typu design-system**, do którego wypychamy zbudowane
komponenty jako statyczne podglądy — nie ten mockup. Masz już dwa takie
projekty („Industry", „Dashboard Skin System"). To osobna robota: komponenty są
React + Tailwind, a design system chce samodzielnych plików HTML, więc trzeba
by kroku budowania, który je generuje. Nie jest zrobione i nie jest potrzebne,
dopóki rysunek pozostaje źródłem.
