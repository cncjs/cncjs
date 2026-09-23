# Czego brakuje po stronie serwera

Rzeczy, które panel chciałby zrobić, a `src/server` ich nie udostępnia. Wpisy
powstają w trakcie budowania panelu, **nie są zweryfikowane** i nie są prośbą o
zmianę serwera — są listą do przejrzenia, gdy zdecydujemy, co z nimi zrobić.

Każdy wpis mówi: czego panel potrzebował, co serwer ma dzisiaj, i jaki jest
skutek dla interfejsu. Bez tego ostatniego wpis jest tylko życzeniem.

---

## Bazowanie pojedynczej osi

**Panel chciał:** osobnych przycisków „bazuj XY" i „bazuj Z" — tak je rysuje
mockup, i tak wygląda praca: Z bazuje się częściej i osobno.

**Serwer ma:** jedną komendę `homing`, bez argumentu osi. Każdy sterownik
zamienia ją na ruch całej maszyny:

| sterownik | komenda |
| --- | --- |
| Grbl | `$H` |
| Smoothie | `$H` |
| Marlin | `G28` |
| TinyG | `G28.2 X0 Y0 Z0` |

**Skutek:** dwa przyciski zastąpione jednym „BAZUJ", który bazuje wszystko.
Panel nie udaje możliwości, której nie ma.

**Do sprawdzenia, gdyby wracać:** Grbl 1.1 zna `$HX`, `$HY`, `$HZ`, ale tylko
gdy firmware skompilowano z `HOMING_SINGLE_AXIS_COMMANDS` — więc nawet po
stronie serwera nie dałoby się tego obiecać bez odpytania maszyny. Marlin ma
`G28 X`, `G28 Z`. Smoothie i TinyG wymagałyby sprawdzenia.

---

## Dziennik zdarzeń

**Panel chciałby:** pokazywać w stopce ostatnią rzecz, która się wydarzyła, ze
znacznikiem czasu — `ok · zero robocze G54 ustawione 13:58`. Tak rysuje to
mockup i to jest realnie przydatne przy maszynie: „czy to zero się zapisało",
„czy ta komenda przeszła".

**Serwer ma:** zdarzenia na bieżąco (`controller:state`, `serialport:read`,
`sender:status`), ale **nic ich nie zapamiętuje**. Klient, który dołączy
później albo przeładuje stronę, nie ma skąd wziąć historii.

**Skutek:** stopka pokazuje zadanie, bo to jedyne, co da się odtworzyć ze
stanu. Dziennik jest niezbudowany.

---

## Pozycja parkowania

**Panel chciał:** przycisku „Park" — dojazd do znanego miejsca, gdzie wymienia
się narzędzie albo ogląda materiał.

**Serwer ma:** nic takiego. Nie ma pojęcia „pozycja parkowania" ani w API, ani
w konfiguracji maszyny.

**Skutek:** przycisk narysowany i wyłączony. Do zdecydowania jest nie tylko
implementacja, ale sama definicja — czy park to stała pozycja maszynowa, czy
coś ustawianego per maszyna, i czy dojazd ma być przez `G53`.

---

## Układy współrzędnych G54–G59 nigdy nie są odpytywane

**Panel chciał:** narysować na ekranie Ścieżka, gdzie w maszynie leżą kolejne
zera robocze — „czy moje G55 jest tam, gdzie je zostawiłem". Mateusz wymienił
to wprost jako jedną z warstw podglądu (2026-09-21).

**Serwer ma:** kompletny parser i żadnego pytania.
`GrblLineParserResultParameters` rozpoznaje linie `[G54:0.000,0.000,0.000]`,
`GrblRunner` składa je w `settings.parameters`, a `GrblController` odsyła to
klientom w `controller:settings`. Tylko że **`$#` nie pada nigdzie w `src/server`**.
Sterownik odpytuje `$G` z dławieniem (`queryParserState`) i czyta `$$` przy
otwarciu portu, ale `$#` nie jest wysyłane ani razu. `parameters` jest więc
pustym obiektem u każdego klienta, dopóki ktoś nie wpisze `$#` ręcznie w
konsolę.

**Skutek:** panel pyta sam, przy dopięciu do portu —
`src/panel/machine/workOffsets.js`. To działa, ale jest w złym miejscu: każdy
klient pyta osobno, a stara aplikacja nie pyta wcale i ma tę samą lukę.

**I nie działa wcale, gdy maszyna jest w alarmie — zmierzone 2026-09-23.**
Pytanie panelu idzie przez feeder, a każdy z czterech sterowników zaczyna
swoje `feeder.on('data')` od `if (this.runner.isAlarm()) { this.feeder.reset();
return; }`. Linia ginie na serwerze, przed kablem, ze wpisem `Stopped sending
G-code commands in Alarm mode` w logu i niczym na łączu. Maszyna z włączonym
bazowaniem siedzi w alarmie od włączenia zasilania aż do zbazowania — czyli
dokładnie wtedy, gdy panel się otwiera, żeby na nią popatrzeć. Komentarz w
`workOffsets.js` twierdził coś odwrotnego i został poprawiony.

**To samo dotyczy każdej komendy `gcode` z panelu, nie tylko `$#`.** Ekran
Zerowania wyłącza swoje przyciski w alarmie i mówi dlaczego
(`readings.canSendGcode`) — bo naciśnięcie kładło `G10 L20 P1 Z0` na gnieździe
i nie zmieniało żadnego przesunięcia, bez słowa na ekranie.

**Do propozycji dochodzi więc:** `$#` musi iść kanałem serwera (obok `$$`),
a nie feederem, bo tylko wtedy przejdzie w alarmie. I warto zapytać ponownie
po wyjściu z alarmu.

**Propozycja:** `$#` obok `$$` przy otwarciu portu, i ponownie po `G10`/`G92`,
bo to są komendy, które te wartości zmieniają. Wtedy `parameters` jest
prawdziwe u wszystkich i panel może skasować swoje pytanie.

---

## ~~Serwer mówi tylko po HTTP~~ — ZROBIONE 2026-09-23 (PR #70)

`src/server/index.js` podnosi `https.createServer`, gdy dostanie
`--tls-key` i `--tls-cert`; `--tls-ca` wystawia urząd do pobrania pod
`/panel/cnc-ca.crt` i opisuje go pod `/panel/cnc-ca.json`. Certyfikaty robi
`yarn certs` — bez argumentów, dla maszyny, na której stoi — a urząd jest
name-constrained, więc poświadcza wyłącznie `.lan`, `localhost` i adresy
prywatne.

Zostaje wpisane, bo to jedyna pozycja z tej listy, która była blokadą dla
całej reszty pendanta, i łatwiej ją tu przeczytać niż odtworzyć z historii.

## Magazyn sesji na Windows nie działa i rośnie bez końca

**Panel chciał:** tylko się zalogować. `POST /api/signin` bez ciała, raz na
załadowanie strony — `src/panel/machine/session.js` niczego nie cache'uje.

**Serwer ma:** magazyn sesji w plikach, w `~/.cncjs-sessions`, zapisywany
przez `rename` z pliku tymczasowego. Na Windows ten `rename` **pada**:

```
Error: EPERM: operation not permitted, rename
  'C:\Users\mateu\.cncjs-sessions\7qve….json.986713542'
  -> 'C:\Users\mateu\.cncjs-sessions\7qve….json'
```

Zmierzone 2026-09-23: **529 takich błędów** w logu jednego popołudnia i
**424 pliki sesji** (680 KB), najstarsze sprzed wielu dni. Nic ich nie kasuje.

**Skutek:** nic widocznego — i to jest najgorsza część. Logowanie zwraca token,
panel działa, a log serwera zapełnia się błędami, w których ginie wszystko
inne. Przy szukaniu przyczyny czegokolwiek innego to jest pierwsza rzecz,
która wpada w oko i ostatnia, która ma znaczenie.

**Nie zweryfikowane:** czy to ma związek z pojedynczym `400` na
`/socket.io/?…&transport=polling&sid=…`, który wypada mniej więcej w co drugim
pełnym przebiegu smoke (opisany w `e2e/fixtures.js`). Sprawdzone: dziesięć
kolejnych `POST /api/signin` **nie** dołożyło ani jednego `EPERM`, więc te dwie
rzeczy najpewniej nie są tą samą rzeczą. Zostawione jako trop, nie jako
rozpoznanie.

**Do rozważenia:** magazyn w pamięci wystarcza instalacji, która ma jednego
operatora i jedną maszynę, a pliki sesji nie przeżywają restartu serwera w
żaden użyteczny sposób. Jeśli mają zostać — kasowanie wygasłych i zapis bez
`rename`.

---

## Geometria maszyny — serwer nie ma pojęcia „maszyna"

**Panel chciałby:** poglądowy model maszyny w scenie ekranu Ścieżka — stół,
brama, wrzeciono — poruszający się razem z pozycją. Rozpoznanie zlecone przez
Mateusza (2026-09-21, punkt 5).

**Wynik rozpoznania — model schematyczny nie potrzebuje od serwera niczego.**
Trzy prostopadłościany napędzane `mpos` z `controller:state`, które panel już
dostaje i już rysuje z nich znacznik narzędzia. Żadnego nowego zdarzenia,
żadnego nowego API.

**Ale płynność jest ograniczona przez serwer, nie przez scenę.** Zmierzone na
COM3 podczas `$J=G91 X-30 F600`: pozycja zmienia się co **254 ms w medianie**
(min 250, średnia 332, 19 zmian). To jest `queryTimer` w `GrblController.js`,
`setInterval(…, 250)` — czyli około 4 Hz, niezależnie od tego, ile klatek
rysuje przeglądarka. Przy 600 mm/min to skok 2,5 mm na aktualizację, a przy
posuwie szybkim odpowiednio więcej. Model animowany wprost z tych raportów
będzie skakał.

Interpolacja między raportami wygładzi obraz, ale kosztem opóźnienia o pełen
okres — a pozycja narzędzia to odczyt, nie ozdoba. To jest decyzja do podjęcia
świadomie, nie domyślnie.

**Czego naprawdę brakuje:** serwer nie ma pojęcia „maszyna" poza tym, co
powie firmware. `$130`–`$132` dają pudło zakresu ruchu i nic więcej — ani
wymiarów stołu, ani wysokości bramy, ani wysięgu wrzeciona. Prawdziwy model
to **konfiguracja per maszyna**, a nie grafika, i nie ma dziś miejsca, gdzie
ją trzymać.

**Skutek:** model nie jest zbudowany. Zbudowany jest znacznik narzędzia, który
odpowiada na to samo pytanie („gdzie jest narzędzie") bez zgadywania geometrii,
której nikt nam nie podał.

---

## Częstotliwość odpytywania o stan — wpisana na sztywno

**Panel chciał:** stanu maszyny na tyle świeżego, żeby dało się na nim
**działać**, a nie tylko go wyświetlać. Jog zmienia kierunek przez anulowanie
i ponowny wyjazd, a Grbl odrzuca nowy jog, póki hamuje — więc „czy już
stanęła" musi być aktualne. Przy raportach co 250 ms bywało ćwierć sekundy
nieaktualne, co wystarczało, żeby przełączanie klawiszy gubiło ruch.

**Serwer ma:** jedną liczbę w `GrblController.js` — `setInterval(…)` pętli
zapytań. To ta sama stała, którą mierzy wpis „Model maszyny" wyżej (254 ms
mediany). **Zmieniona 2026-09-22 z 250 na 100 ms, w kodzie**, bo nie ma jak
jej podać ani w `.cncrc`, ani przez API, ani przy otwieraniu portu.

**Skutek:** działa — zmierzone 4,3 → 8,9 aktualizacji pozycji na sekundę — ale
każdy, kto chce inaczej, musi edytować źródło i przebudować serwer. Wartość
jest kompromisem: szybsza reakcja kosztem ruchu na łączu (rachunkiem ~4,3%
zamiast ~1,7% przy 115200 8N1). `?` jest komendą czasu rzeczywistego i nie
wchodzi do bufora planera, więc nie opóźnia ruchu — ale przy gęstym programie
na prawdziwej maszynie dzieli kabel ze strumieniem G-code i może wymagać
cofnięcia do 150–200 ms.

**Do zrobienia:** wystawić jako ustawienie. Najbliżej sensu byłoby obok
`baudrate` w opcjach otwarcia portu (bo to właściwość połączenia z konkretną
maszyną) albo w `.cncrc` per sterownik. Warto przy okazji objąć tym pozostałe
okresy, dziś też zahardkodowane: `$G` co 500 ms i kontrolne `?` co 2000 ms.

**Uwaga dla każdego, kto to ruszy:** serwer w trybie dev ładuje
`output/cncjs/server-cli`, nie źródła — zmiana w `src/server` nie działa,
dopóki nie przejdzie przez babel do `output/`.

---

## Jog ciągły — serwer daje tylko prymitywy

**Panel chciał:** trzymanego klawisza, który jedzie, daje się skręcić w locie i
zatrzymuje się natychmiast po puszczeniu.

**Serwer ma:** dwie rzeczy i nic poza nimi — `gcode` (dowolna linia, więc i
`$J=`) oraz `jogCancel` (`0x85`). Nie ma pojęcia „jog ciągły", nie prowadzi
strumienia, nie śledzi kolejki planera. Stara aplikacja też tego nie ma —
`$J=` nie pada w `src/app` ani razu.

**Skutek:** cała logika jest w przeglądarce (`machine/jog-stream.js`,
`ui/useJogStream.jsx`). Ciągły ruch to strumień krótkich `$J=` wysyłanych co
200 ms, każdy na 220 ms jazdy. Skręt polega na tym, że **następny** odcinek
idzie gdzie indziej; puszczenie klawisza to `jogCancel`.

**Dlaczego nie jeden długi `$J=`:** bo długiego ruchu nie da się skręcić
inaczej niż anulując go, a anulowanie jest wyścigiem. Zmierzone: dołożenie
drugiego klawisza dawało osiem odrzuconych prób startu pod rząd, a puszczenie
klawisza wysyłało `jogCancel`, który wyprzedzał właśnie zaakceptowany jog —
maszyna jechała dalej bez trzymania czegokolwiek.

**Czego brakuje, żeby zrobić to porządnie:** serwer siedzi przy porcie i widzi
`Bf:` w raporcie stanu, czyli ile miejsca zostało w planerze. Strumień
prowadzony tam mógłby wysyłać odcinek wtedy, gdy jest miejsce, zamiast
zgadywać rytm zegarem w przeglądarce — a zegar w przeglądarce jest czuły na
obciążenie karty i na to, że stosunek długości odcinka do interwału wysyłki
musi być dobrany ręcznie (przy 260 ms jazdy co 120 ms kolejka rosła i skos w
ogóle nie dochodził). Serwer zna też `$120`–`$122`, więc wiedziałby, ile
naprawdę trwa hamowanie.

**Do rozważenia:** `jogStart(dir, feedrate)` / `jogStop()` po stronie serwera,
z odcinkami dobieranymi do wolnego miejsca w planerze. Wtedy panel mówiłby
„jedź tam", a nie odmierzał milisekundy.

---
