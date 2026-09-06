# QualityTime

Piccola app pensata per ambienti familiari: aiuta a **rompere il ghiaccio** e trovare
argomenti di conversazione, per esempio per passare del tempo con una persona anziana
ma lucida. A ogni pressione del pulsante **Nuova domanda** propone una domanda a caso
dall'archivio.

È una web-app installabile (PWA): si apre nel browser e si può aggiungere alla schermata
Home di Android come una normale app, funzionando poi anche offline. Non serve Android
Studio né alcun SDK.

## Come funziona

1. **Schermata iniziale** – si scrive il nome della persona con cui si gioca e si preme
   *Inizia*. I nomi già usati restano nell'elenco "Persone salvate" e si riprende la
   sessione toccandoli: cronologia e sezioni scelte vengono ricaricate. Nessuna password.
2. **Cestino** – accanto a ogni persona c'è un'icona cestino che, previa conferma,
   elimina quella persona e tutta la sua cronologia.
3. **Gioco** – il pulsante *Nuova domanda* estrae una domanda a caso (mai due volte di
   fila la stessa) dalle sezioni attive. Sopra la domanda compare la sua **categoria**
   con un'icona. La freccia in alto a sinistra torna alla schermata iniziale.
4. **Sezioni** – subito **sotto il pulsante** *Nuova domanda*, sempre visibili, ci sono
   i pulsanti-etichetta delle sezioni: quelli accesi (colorati) sono in gioco, quelli
   spenti no. Si toccano per accendere/spegnere. Di default sono **tutte accese**; il
   link *Tutte* le riaccende tutte in un colpo. La scelta è **salvata nel profilo della
   persona**. Se non ne resta nessuna accesa, *Nuova domanda* si disattiva.
5. **Cronologia** (icona orologio, in alto) – elenco delle domande estratte dalla
   persona corrente, ognuna con l'icona della sua categoria.

Tutti i dati (persone, sezioni scelte, cronologie) restano **solo sul dispositivo**,
nel browser.

## Struttura dei file

| File | A cosa serve |
|------|--------------|
| `index.html` | Pagina unica: schermata iniziale + schermata gioco |
| `css/style.css` | Aspetto grafico, tema chiaro/scuro automatico, testi e pulsanti grandi |
| `js/app.js` | Logica: persone, cronologie, estrazione casuale, salvataggio, lettura del CSV |
| `domande.csv` | **L'archivio che usa l'app**: una riga per domanda, `Sezione;Numero;Domanda` |
| `manifest.webmanifest` | Dati per l'installazione come app |
| `service-worker.js` | Funzionamento offline |
| `icons/icon.svg` | Logo dell'app |
| `serve.ps1` | Server locale per le prove sul PC |

## Logo e colori

- **Logo**: due fumetti di conversazione sovrapposti (avorio e verde salvia) su fondo
  terracotta arrotondato. Richiama "parlare insieme" e resta leggibile anche piccolo.
- **Palette** (in cima a `css/style.css`, variabili `--*`):
  - Terracotta `#b85c3c` — pulsante principale e dettagli
  - Verde salvia `#4e7a6c` — accento secondario
  - Avorio caldo `#f6f1e7` — sfondo
  - Cocoa `#2c2620` — testo
  - Rosso mattone `#b23b3b` — solo per il cestino / azioni che eliminano
  Tinte pensate per un ambiente domestico: calde, riposanti, con buon contrasto e
  caratteri grandi per una lettura comoda.
- **Icone delle categorie** (una per sezione): cornice foto = Ricordi e Radici,
  stella = Passioni ed Esperienze, medaglia = Valori e Visioni, tavolozza = Gusto e
  Creatività, lampadina = Curiosità e Immaginazione, cuore = L'Amore e i Sentimenti,
  valigetta = Il Lavoro e le Realizzazioni, persona con zaino e bastone da trekking =
  La Vita e il Percorso Personale, gruppo di persone (4·2·1) = Famiglia. Sono definite
  una volta sola nello "sprite" SVG in cima a `index.html` e riusate nella domanda, nei
  pulsanti-sezione e nella cronologia.

## Modificare le domande

Si lavora **solo su `domande.csv`**. Ogni riga è una domanda, tre colonne separate da
punto e virgola: `Sezione;Numero;Domanda`. La prima riga è l'intestazione. Il campo
`Numero` è solo indicativo, l'app non lo usa.

```
"Sezione";"Numero";"Domanda"
"Ricordi e Radici";1;"Prima domanda?"
"Ricordi e Radici";2;"Seconda domanda?"
"Famiglia";43;"Un'altra domanda?"
```

- Per **aggiungere/togliere domande**: aggiungi o cancella righe.
- Per una **sezione nuova**: usa un nome di `Sezione` nuovo; comparirà da sola tra i
  pulsanti-filtro. L'icona si assegna in `js/app.js`, nella mappa `SECTION_ICONS`
  (nome sezione → nome icona). In alternativa si può aggiungere una 4ª colonna `Icona`
  nel CSV con il nome dell'icona su ogni riga della sezione.
- Icone disponibili: `ricordi`, `sogni`, `valori`, `creativita`, `curiosita`,
  `emozioni`, `lavoro`, `percorso`, `famiglia`. Una nuova va disegnata nello "sprite"
  SVG in cima a `index.html` e aggiunta a `KNOWN_ICONS` in `js/app.js`.

**Salvare da Excel:** usa *File → Salva con nome → CSV UTF-8 (delimitato da separatore
di elenco)*. L'app riconosce sia `;` che `,` come separatore e prova sia UTF-8 sia la
codifica ANSI di Windows, ma il formato "CSV UTF-8" è quello più sicuro per gli accenti.

Con l'app già installata, riaprendola online l'archivio si aggiorna da solo.

## Provare sul PC

Il doppio clic sul file non basta (il browser blocca la lettura del file delle domande).
Avvia il server locale incluso:

```bash
powershell -ExecutionPolicy Bypass -File serve.ps1
```

Poi apri `http://localhost:8080`.

## Pubblicare e installare su Android

La PWA va servita via HTTPS. Opzione gratuita più semplice: **Netlify Drop** o **GitHub Pages**.

1. Carica l'intera cartella `QualityTime` come sito statico.
2. Sul telefono apri l'URL con Chrome.
3. Menu di Chrome → **Aggiungi a schermata Home** / **Installa app**.

Da quel momento l'icona apre l'app a schermo intero e funziona senza rete.

## Note

- Cronologia: fino a 50 voci per persona.
- L'estrazione non ripete mai due volte di fila la stessa domanda; per il resto è
  completamente casuale e uniforme su tutto l'archivio.
- Per un'icona con resa ottimale su ogni dispositivo si possono aggiungere in seguito
  `icons/icon-192.png` e `icons/icon-512.png` e reinserirli nel `manifest.webmanifest`.
