# 🏥 Traduttore Medico — Voice Translator for Healthcare

Un'applicazione web di **traduzione vocale Italiano ↔ Inglese** progettata per **infermieri e personale sanitario** che devono comunicare con pazienti stranieri. Include supporto per **parole tagliate** e **pazienti con difficoltà di parola**.

![Versione](https://img.shields.io/badge/versione-1.0.0-blue)
![Licenza](https://img.shields.io/badge/licenza-MIT-green)

## ✨ Caratteristiche

### 🎤 Riconoscimento Vocale
- Riconoscimento vocale in tempo reale (Italiano e Inglese)
- **Rilevamento parole tagliate**: se il paziente non finisce una parola, l'app suggerisce il completamento corretto (es. "antibi" → "antibiotico")
- **Modalità difficoltà di parola**: per pazienti che parlano lentamente o con difficoltà; aggrega più tentativi di riconoscimento per trovare la frase più probabile
- Barra della confidenza visiva per capire la qualità del riconoscimento

### 📋 102 Frasi Mediche Rapide
Organizzate in **8 categorie** per accesso immediato:

| Categoria | Frasi | Descrizione |
|-----------|-------|-------------|
| 🏥 Accoglienza | 7 | Presentarsi, chiedere come sta |
| 🤒 Sintomi | 14 | Dolore, febbre, nausea, vertigini |
| 👁 Parti del corpo | 8 | Identificare la zona del dolore |
| 💊 Cure | 18 | Prelievi, iniezioni, medicine |
| 🩺 Procedure | 14 | Esami, posizioni, istruzioni |
| 🚨 **Emergenza** | **12** | **Frasi urgenti** |
| 💙 Rassicurazioni | 8 | Calmare e rassicurare |
| 🏠 Dimissioni | 7 | Istruzioni per il ritorno a casa |

### 🔄 Traduzione
- **MyMemory API** (gratuita) per traduzioni di alta qualità
- **Dizionario medico offline** integrato con oltre 100 termini/frasi — funziona anche senza internet
- Traduzione automatica opzionale
- Sintesi vocale della traduzione (leggi il risultato al paziente)
- Storico della conversazione

### ⌨️ Scorciatoie
- `Spazio` — Avvia / Ferma registrazione
- `Esc` — Ferma registrazione

## 🚀 Installazione

### Prerequisiti
- [Node.js](https://nodejs.org/) (v16 o superiore)
- Un browser basato su Chromium (Chrome, Edge) per il riconoscimento vocale
- Microfono funzionante

### Installazione rapida

```bash
# Entra nella directory
cd traduttore

# Installa le dipendenze
npm install

# Avvia il server
PORT=3001 node server.js
```

### Utilizzo

1. Apri il browser all'indirizzo `http://localhost:3001`
2. Concedi il permesso per il microfono
3. Scegli la direzione di traduzione (IT→EN o EN→IT)
4. Premi **🎤 Avvia Microfono** (o premi `Spazio`) e parla
5. La traduzione appare automaticamente nel pannello di destra
6. Usa le **Frasi Mediche Rapide** per comunicare velocemente
7. Premi **🔊 Ascolta** per far leggere la traduzione al paziente

### Modalità avanzate

- **Modalità difficoltà di parola**: attivala dalle impostazioni per pazienti che parlano con difficoltà. L'app ripete il riconoscimento più volte e sceglie il risultato più frequente.
- **Rilevamento parole tagliate**: se una parola viene troncata, l'app mostra suggerimenti di completamento. Clicca su un suggerimento per sostituirlo.
- **Sensibilità microfono**: regolabile dalle impostazioni per ambienti rumorosi o silenziosi.

## 🏗 Struttura del Progetto

```
traduttore/
├── server.js              # Server Express + API proxy + dizionario fuzzy match
├── package.json
├── README.md
└── public/
    ├── index.html          # Interfaccia utente
    ├── css/
    │   └── style.css       # Stile tema scuro medicale
    └── js/
        ├── app.js          # Controller principale
        ├── speech-recognizer.js  # Riconoscimento vocale avanzato
        └── translator.js   # Traduzione (online + offline medicale)
```

## ⚙️ API Endpoints

| Endpoint | Metodo | Descrizione |
|----------|--------|-------------|
| `/api/translate` | POST | Traduce testo (sourceLang, targetLang, text) |
| `/api/suggest` | POST | Suggerisce completamenti per parole tagliate |
| `/api/medical-phrases` | GET | Restituisce frasi mediche (lang, category) |

## 🌐 Supporto Browser

| Browser | Riconoscimento Vocale | Sintesi Vocale |
|---------|----------------------|----------------|
| ✅ Chrome | Completo | Completo |
| ✅ Edge | Completo | Completo |
| ✅ Firefox | Parziale | Completo |
| ❌ Safari | Non supportato | Completo |

## 🔧 Personalizzazione

### Aggiungere frasi mediche
Modifica `server.js`, funzione `getMedicalPhrases()`, aggiungendo oggetti con:
```javascript
{ category: 'tua-categoria', text: 'Frase in italiano', translation: 'English translation' }
```

### Aggiungere termini al dizionario medico offline
Modifica `public/js/translator.js`, aggiungendo coppie nel `medicalDict`.

### Aggiungere termini al dizionario per parole tagliate
Modifica `server.js`, array `dictionaries.en` o `dictionaries.it` in `findWordCompletions()`.

## 📝 Note Tecniche

- Il riconoscimento vocale utilizza la **Web Speech API** (SpeechRecognition) del browser
- La traduzione online passa attraverso **MyMemory API** (gratuita, limite indicativo ~1000 traduzioni/giorno)
- Il dizionario offline garantisce il funzionamento di base anche senza connessione
- Il fuzzy matching usa **distanza di Levenshtein** e **Soundex-like** per capire pronunce imperfette
- La porta predefinita è 3001 (modificabile con `PORT`)

## 📄 Licenza

MIT

---

*Creato per il personale sanitario che ogni giorno si prende cura di pazienti di tutto il mondo.* 🌍
