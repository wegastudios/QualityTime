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
| `js/app.js` | Logica: persone, cronologie, estrazione casuale, salvataggio |
| `data/questions.json` | **L'archivio delle domande** — l'unico file da modificare per i contenuti |
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
- **Icone delle categorie**: sette piccole icone a tratto (cornice foto = Ricordi,
  cuore = Emozioni, stella = Sogni e futuro, pacco regalo = Gratitudine, due persone =
  Relazioni, tazza fumante = Vita quotidiana, gruppo di persone 4·2·1 = Famiglia).
  Sono definite una volta sola nello "sprite" SVG in cima a `index.html` e riusate
  nella domanda, nei pulsanti-sezione e nella cronologia.

## Modificare le domande

Apri `data/questions.json`. L'archivio è diviso in `"sezioni"`; ogni sezione ha:

- `id` – codice interno, **non cambiarlo** (è quello che viene salvato nei profili);
- `nome` – il nome mostrato all'utente;
- `icona` – una tra: `ricordi`, `emozioni`, `sogni`, `gratitudine`, `relazioni`, `quotidiano`, `famiglia`;
- `domande` – l'elenco delle frasi.

```json
{
  "sezioni": [
    {
      "id": "ricordi",
      "nome": "Ricordi",
      "icona": "ricordi",
      "domande": [
        "Prima domanda?",
        "Ultima domanda?"
      ]
    }
  ]
}
```

Per aggiungere una **nuova sezione** basta un nuovo blocco con un `id` nuovo; comparirà
da sola tra le caselle. Per aggiungere una nuova icona serve invece disegnarne una in
`index.html` (blocco `<svg class="sprite">`) e aggiungere il nome all'elenco in
`js/app.js` (`KNOWN_ICONS`).

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
