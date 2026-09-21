# Kickoff: podgląd ścieżki w panelu

Cel sesji: ekran **Ścieżka** w `/panel`. Nie „wizualizator" w ogóle — cztery
konkretne rzeczy, które Mateusz nazwał, plus jedna do zweryfikowania.

Ten plik jest punktem wyjścia, nie specyfikacją. Rzeczy podane tu jako fakty
zostały sprawdzone w kodzie 2026-09-21 i mają wskazane miejsce. Rzeczy
niepewne są w **Do rozstrzygnięcia** — tam się zaczyna, nie w kodzie.

---

## Zakres

1. **Ścieżka narzędzia** z wczytanego programu.
2. **Zarys maszyny** — obwiednia tego, gdzie maszyna w ogóle sięga.
3. **Zarys aktualnego obszaru roboczego.**
4. **Wybór rzutów.**
5. **Weryfikacja:** czy da się w przyszłości dołożyć poglądowy model maszyny,
   który się animuje. To jest rozpoznanie zakończone odpowiedzią i wpisem do
   backlogu, **nie** implementacja modelu.

Domyślny widok jest **izometryczny**, nie z góry. To była osobna decyzja
Mateusza i nie jest do ponownego otwierania.

---

## Czego nie trzeba budować — to już jest

**G-code przychodzi sam.** Serwer, gdy socket dopina się do portu, odtwarza
`gcode:load` z pełną treścią programu — `src/server/controllers/Grbl/GrblController.js:1385`:

```js
const { name, gcode, context } = this.sender.state;
if (gcode) {
  socket.emit('gcode:load', name, gcode, context);
}
```

Czyli panel po odświeżeniu strony dostaje wczytany program bez pytania i bez
wgrywania go po raz drugi. To rzadki przypadek, w którym serwer **pamięta** —
dziennik zdarzeń z `design/server-backlog.md` nie pamięta nic, a tu stan
sendera jest źródłem prawdy. Nasłuch jest już postawiony w
`src/panel/machine/useMachine.js`; dochodzi jeden handler.

**Geometria jest napisana i przetestowana.** W starej aplikacji leżą cztery
moduły bez Reacta, nasze własne, z testami w `__tests__`:

| plik | linii | co robi |
| --- | --- | --- |
| `toolpath-geometry.js` | 206 | `gcode-toolpath` → wierzchołki, z obsługą łuków |
| `toolpath-segments.js` | 194 | podział na odcinki, G0 osobno od G1 |
| `camera-fit.js` | 121 | dopasowanie kamery do bryły |
| `palette.js` | 66 | kolory ścieżki |

`three` jest już zależnością repozytorium w wersji **~0.186.0**, a
`gcode-toolpath` jest tym, czym parsujemy — `toolpath-geometry.js:1`.

**Ekran ma już swoje miejsce.** `src/panel/App.jsx:26` —
`{ id: 'path', label: 'Ścieżka', ready: false }`. Zmiana flagi na `true` to
ostatni krok, nie pierwszy.

**Ustawienia firmware'u są już w migawce.** `src/panel/machine/snapshot.js`
niesie `settings`, dołożone przy bazowaniu dla `$22`. Obwiednie czytają stamtąd
i nic nowego odpytywać nie trzeba.

---

## Fakty o maszynie, na których stoją obwiednie

Zmierzone na COM3 (Grbl 1.1h) przez `/api/controllers`:

- **`$130` / `$131` / `$132`** — zakres ruchu osi. Na COM3: `200.000` każda.
- **`$23`** — maska odwrócenia kierunku bazowania. Decyduje o **znaku** bryły:
  przy bazowaniu do maksimum zero maszynowe jest w rogu i objętość leży w
  `[-zakres, 0]`, nie w `[0, zakres]`. Narysowanie tego bez `$23` da obwiednię
  odbitą względem prawdy.
- **`$22` = 0 na COM3** — bazowanie wyłączone. To jest ważne i nie wolno tego
  ukryć: **dopóki maszyna nie jest zbazowana, zero maszynowe jest tam, gdzie ją
  włączono, więc obwiednia jest zgadywaniem.** Ekran ma to powiedzieć wprost,
  a nie narysować pewną siebie ramkę wokół niczego.
- **`wco`** (`mpos − wpos`) jest w **każdym** raporcie stanu, więc początek
  układu roboczego znamy bez pytania.
- **`parameters` (G54…G59) wróciło puste** z `/api/controllers`. Jeśli obszar
  roboczy ma znać inne układy niż aktualny, trzeba dosłać `$#` — i to jest
  kandydat do backlogu serwerowego, nie do obejścia po cichu.

---

## Ograniczenia, o które potknie się ktoś, kto ich nie zna

**Panelowi nie wolno importować ze starej aplikacji.** `eslint.config.mjs:263`
blokuje `app/**` poza `app/lib/controller`. Cztery moduły geometrii są po
zakazanej stronie. **Pierwsza decyzja sesji, przed kodem:** przenieść je do
miejsca wspólnego dla obu aplikacji, skopiować do `src/panel`, czy poszerzyć
regułę. Każda opcja ma koszt — przeniesienie rusza starą aplikację i jej testy,
kopia tworzy drugą prawdę, poszerzenie reguły robi w granicy dziurę, przez
którą wejdzie reszta. **Rekomendacja: przenieść**, bo są bezframeworkowe, mają
własne testy i są dokładnie tym rodzajem kodu, dla którego wspólne miejsce
istnieje.

Uwaga przy tym: `src/lib/` z CLAUDE.md **nie istnieje** — w `src/` są tylko
`app`, `electron-app`, `panel`, `server`. Katalog trzeba by założyć, i to też
jest decyzja, nie oczywistość.

**`max-lines: 250` w panelu.** Stary `Visualizer.jsx` ma **1663 linie**. Port
jeden do jednego jest niemożliwy z definicji i to jest dobra wiadomość: zmusza
do rozbicia na scenę, warstwy i sterowanie.

**Żadnych stylów inline** — `react/forbid-dom-props` na `style`. Kontener
canvasa dostaje rozmiar klasami, nie atrybutem.

**Reguła architektoniczna panelu obowiązuje tak samo:** ekran wybiera układ,
widget wybiera kształt, komponent kształtu **nie ma ifów**. Szerokość mierzy
`useIsPhone()` przez ResizeObserver — `matchMedia` kłamie w ramce podglądu.

**Wizualizator jest pisany ręcznie.** Gotowe przeglądarki G-code z npm były
przebadane i wszystkie zabierają canvas na własność; decyzja jest zapisana i
nie otwieramy jej ponownie. To **nie** przesądza pytania o `react-three-fiber`,
które jest czym innym — patrz niżej.

---

## Do rozstrzygnięcia z Mateuszem, zanim powstanie kod

1. **Co znaczy „zarys aktualnego obszaru roboczego"?** Trzy różne rzeczy dają
   trzy różne rysunki: (a) obwiednia maszyny wyrażona we współrzędnych
   roboczych, czyli dokąd sięgasz względem obecnego zera; (b) prostopadłościan
   wczytanego programu; (c) obszar miękko ograniczony, konfigurowany. Moje
   czytanie to **(a)**, a (b) jako osobna, słabsza linia — ale to zgadywanka i
   trzeba ją potwierdzić.
2. **Które rzuty i czy wybór ma być pamiętany?** Propozycja: izo (domyślny),
   góra, przód, prawy bok — cztery, bo tyle mieści się w pasku bez zwijania.
3. **`react-three-fiber` czy gołe three w `ref`?** R3F nie zabiera canvasa —
   zabiera pętlę renderowania i dokłada reconciler pod React 19. Istniejące
   moduły są gołym three. **Rekomendacja: gołe three**, R3F jest odpowiedzią na
   problem, którego tu nie ma.
4. **Czy Jog też dostaje mały podgląd**, czy Ścieżka jest jedynym miejscem?

---

## Weryfikacja modelu maszyny (punkt 5) — co faktycznie sprawdzić

Pytanie brzmi „czy przyszłościowo można", więc odpowiedź ma być **zmierzona**,
nie oszacowana. Trzy rzeczy do sprawdzenia w tej sesji:

1. **Schematyczny model nie wymaga niczego od serwera.** Trzy prostopadłościany
   (stół, brama, wrzeciono) napędzane `mpos` z `controller:state`, które panel
   już dostaje. To jest do udowodnienia od razu, małym szkicem.
2. **Płynność.** Serwer odpytuje `?` z dławieniem
   (`GrblController.js:890`, `queryStatusReport`), a nie co klatkę. Trzeba
   zmierzyć, czy ruch wygląda na ciągły, czy skacze — i jeśli skacze, czy
   wystarczy interpolacja między raportami.
3. **Prawdziwy model to nie grafika, to konfiguracja.** Potrzebuje geometrii na
   maszynę i miejsca, gdzie ją trzymać — a **serwer nie ma pojęcia „maszyna"**
   poza tym, co powie firmware. To jest wpis do `design/server-backlog.md`
   napisany tak jak pozostałe trzy: czego panel chciał, co serwer ma, jaki jest
   skutek dla interfejsu.

Wynik punktu 5 to akapit odpowiedzi i ewentualny wpis w backlogu. Nie model.

---

## Plan i kryteria

```
1. Rozstrzygnąć pytania 1-4 wyżej        → verify: Mateusz potwierdza na piśmie
2. Przenieść moduły geometrii            → verify: yarn lint czysty, testy geometrii przechodzą
3. Scena + ścieżka z gcode:load          → verify: wczytany program rysuje się po odświeżeniu strony
4. Obwiednia maszyny z $130-$132 i $23   → verify: bryła 200x200x200 na COM3, po właściwej stronie zera
5. Obszar roboczy wg ustalenia z pkt 1   → verify: przesunięcie zera przesuwa zarys o dokładnie wco
6. Rzuty                                 → verify: każdy rzut ustawia kamerę tam, gdzie mówi jego nazwa
7. Niezbazowana maszyna mówi, że nie wie → verify: przy $22=0 ekran to komunikuje, a nie udaje
8. Rozpoznanie modelu + wpis do backlogu → verify: akapit odpowiedzi, wpis, zmierzona płynność
9. ready: true dla 'path'                → verify: smoke przechodzi, ekran wchodzi z szyny
```

**Kryterium na koniec:** program wczytany w starej aplikacji jest widoczny w
`/panel` → Ścieżka po samym odświeżeniu, w izometrii, wpisany w obwiednię
maszyny, z działającym przełącznikiem rzutów — i nic z tego nie kłamie, gdy
maszyna nie jest zbazowana.

---

## Jak zacząć sesję

```
yarn dev                             # serwer + webpack (oba kompilatory)
node scripts/connect-machine.js      # otwiera COM3, żeby panel miał realną maszynę
node scripts/design-review.js        # przegląd z komentarzami na :8765
node scripts/wait-for-review.js      # czeka na uwagi - run_in_background, nigdy z &
```

Pętla przeglądu działa tak samo jak przy Jogu: Mateusz klika miejsce w żywym
panelu, uwaga trafia do `design/review.json`, poprawka idzie od razu, a watcher
biegnie **cały czas**, nie do pierwszej uwagi.

**COM3 to gołe Arduino bez mechaniki** — ruch można wywoływać swobodnie. To
przestaje obowiązywać w chwili, gdy podpięta jest maszyna.

**Do przeglądu przy okazji:** komunikat reguły lint w `eslint.config.mjs:260`
mówi jeszcze o `*.module.css`, a panel stoi na Tailwindzie od 2026-09-21.
