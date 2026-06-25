/**
 * SpeechRecognizer - Gestisce il riconoscimento vocale con supporto per:
 * - Parole tagliate (clipped words)
 * - Difficoltà di parola (bassa confidenza, pronunce difficili)
 * - Italiano e Inglese
 */
class SpeechRecognizer {
  constructor(options = {}) {
    this.options = {
      lang: 'it-IT',
      continuous: true,
      interimResults: true,
      maxAlternatives: 5,
      sensitivity: 0.7,
      difficultyMode: false,
      clipDetection: true,
      ...options
    };

    this.recognition = null;
    this.isListening = false;
    this.isStopped = false;
    this.finalTranscript = '';
    this.interimTranscript = '';
    this.lastProcessedIndex = -1;
    this.speechStartTime = null;
    this.silenceTimeout = null;
    this.speechSegments = [];
    this.currentSegment = '';
    
    // Per modalità difficoltà di parola
    this.difficultyBuffer = [];
    this.difficultyAttempts = 0;
    this.maxDifficultyAttempts = 3;
    this.difficultyCooldown = false;
    
    // Callbacks
    this.onInterim = null;
    this.onFinal = null;
    this.onClipDetected = null;
    this.onStatusChange = null;
    this.onAudioLevel = null;
    this.onError = null;
    
    this._initRecognition();
  }

  _initRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      throw new Error('Riconoscimento vocale non supportato dal browser');
    }

    this.recognition = new SpeechRecognition();
    this._applySettings();
    
    this.recognition.onresult = (event) => this._onResult(event);
    this.recognition.onstart = () => this._onStart();
    this.recognition.onend = () => this._onEnd();
    this.recognition.onerror = (event) => this._onError(event);
    this.recognition.onaudiostart = () => this._onAudioStart();
    this.recognition.onsoundstart = () => this._onSoundStart();
    this.recognition.onspeechend = () => this._onSpeechEnd();
    this.recognition.onsoundend = () => this._onSoundEnd();
    this.recognition.onaudioend = () => this._onAudioEnd();
    this.recognition.onnomatch = () => this._onNoMatch();
  }

  _applySettings() {
    this.recognition.lang = this.options.lang;
    this.recognition.continuous = this.options.continuous;
    this.recognition.interimResults = this.options.interimResults;
    this.recognition.maxAlternatives = this.options.maxAlternatives;
  }

  setLang(lang) {
    // Converti codice lingua per Web Speech API
    const langMap = {
      'it': 'it-IT',
      'en': 'en-US',
      'it-IT': 'it-IT',
      'en-US': 'en-US'
    };
    this.options.lang = langMap[lang] || lang;
    if (this.recognition) {
      this._restart(() => {
        this.recognition.lang = this.options.lang;
      });
    }
  }

  setSensitivity(value) {
    this.options.sensitivity = value / 100;
  }

  setDifficultyMode(enabled) {
    this.options.difficultyMode = enabled;
    if (enabled) {
      this.recognition.maxAlternatives = 10; // Più alternative per pronunce difficili
      this.recognition.continuous = true;
    } else {
      this.recognition.maxAlternatives = 5;
    }
  }

  setClipDetection(enabled) {
    this.options.clipDetection = enabled;
  }

  start() {
    if (this.isListening) return;
    
    this.isStopped = false;
    this.isListening = true;
    this.finalTranscript = '';
    this.lastProcessedIndex = -1;
    this.difficultyBuffer = [];
    this.difficultyAttempts = 0;
    
    try {
      this.recognition.start();
    } catch (e) {
      console.warn('Errore avvio riconoscimento, riprovo:', e);
      setTimeout(() => {
        try {
          this.recognition.start();
        } catch (e2) {
          this._notifyError('Impossibile avviare il microfono: ' + e2.message);
        }
      }, 200);
    }
  }

  stop() {
    this.isStopped = true;
    this.isListening = false;
    
    if (this.silenceTimeout) {
      clearTimeout(this.silenceTimeout);
      this.silenceTimeout = null;
    }
    
    try {
      this.recognition.stop();
    } catch (e) {
      // Ignora errori su stop
    }
    
    // Processa eventuali segmenti in sospeso
    if (this.currentSegment.trim()) {
      this._processDifficultySegment(this.currentSegment);
    }
    this.currentSegment = '';
  }

  _restart(callback) {
    const wasListening = this.isListening;
    if (wasListening) {
      this.isListening = false;
      try {
        this.recognition.stop();
      } catch (e) {}
      
      setTimeout(() => {
        if (callback) callback();
        if (wasListening) {
          this.start();
        }
      }, 300);
    } else {
      if (callback) callback();
    }
  }

  // === Eventi Riconoscimento ===

  _onStart() {
    this.isListening = true;
    this._notifyStatus('in ascolto...', 'listening');
  }

  _onEnd() {
    // Se non siamo stati fermati volontariamente, riavvia
    if (!this.isStopped && this.isListening) {
      setTimeout(() => {
        try {
          this.recognition.start();
        } catch (e) {}
      }, 100);
    } else {
      this.isListening = false;
      this._notifyStatus('in attesa...', '');
    }
  }

  _onResult(event) {
    // Aggrega risultati intermedi e finali
    let interim = '';
    let final = '';
    let bestConfidence = 0;
    let bestResult = '';

    for (let i = event.resultIndex; i < event.results.length; i++) {
      const result = event.results[i];
      
      if (result.isFinal) {
        const transcript = result[0].transcript.trim();
        final += transcript + ' ';
        
        // Aggrega tutte le alternative per modalità difficoltà
        const alternatives = [];
        for (let j = 0; j < result.length; j++) {
          alternatives.push({
            text: result[j].transcript.trim(),
            confidence: result[j].confidence
          });
        }
        
        // Trova il risultato con confidenza più alta
        const best = alternatives.reduce((a, b) => a.confidence > b.confidence ? a : b);
        bestResult = best.text;
        bestConfidence = best.confidence;
        
        // Salva per analisi difficoltà di parola
        if (this.options.difficultyMode) {
          this.difficultyBuffer.push({
            text: best.text,
            confidence: best.confidence,
            alternatives: alternatives,
            timestamp: Date.now()
          });
        }
        
        // Notifica livello audio simulato basato su confidenza
        const audioLevel = Math.min(100, Math.round(bestConfidence * 120));
        this._notifyAudioLevel(audioLevel);
        
      } else {
        interim += result[0].transcript;
        
        // Per risultati intermedi, usa la confidenza media per l'audio level
        let avgConfidence = 0;
        for (let j = 0; j < result.length; j++) {
          avgConfidence += result[j].confidence;
        }
        avgConfidence /= result.length;
        const audioLevel = Math.min(100, Math.round(avgConfidence * 120));
        this._notifyAudioLevel(audioLevel);
      }
    }

    this.interimTranscript = interim.trim();
    this._notifyInterim(this.interimTranscript);

    if (final.trim()) {
      this.finalTranscript = (this.finalTranscript + ' ' + final.trim()).trim();
      const newText = this.finalTranscript;
      
      // Rilevamento parole tagliate
      if (this.options.clipDetection) {
        this._detectClippedWords(bestResult || final.trim());
      }
      
      // Aggiorna il testo finale riconosciuto
      this._notifyFinal(newText, bestConfidence);
      
      // Reset del timer di silenzio
      this._resetSilenceTimer();
    }
  }

  _onError(event) {
    console.warn('Errore riconoscimento:', event.error);
    
    const errorMessages = {
      'no-speech': 'Nessun discorso rilevato. Prova a parlare più forte.',
      'aborted': 'Riconoscimento interrotto.',
      'audio-capture': 'Microfono non trovato o non accessibile.',
      'network': 'Errore di rete. Controlla la connessione.',
      'not-allowed': 'Permesso microfono negato. Concedi l\'accesso nelle impostazioni.',
      'service-not-allowed': 'Servizio di riconoscimento non disponibile.',
      'bad-grammar': 'Errore di grammatica nel riconoscimento.',
      'language-not-supported': 'Lingua non supportata.'
    };

    const message = errorMessages[event.error] || `Errore: ${event.error}`;
    
    // In modalità difficoltà, non mostrare errori per "no-speech" 
    if (this.options.difficultyMode && event.error === 'no-speech') {
      // Tenta di ottenere il miglior risultato dal buffer
      this._processDifficultyBuffer();
      return;
    }
    
    this._notifyStatus(message, 'error');
    this._notifyError(message);
    
    // Riavvio automatico per alcuni errori
    if (!this.isStopped && ['no-speech', 'aborted', 'network'].includes(event.error)) {
      setTimeout(() => {
        if (!this.isStopped && this.isListening) {
          try { this.recognition.start(); } catch (e) {}
        }
      }, 1000);
    }
  }

  _onAudioStart() {
    this._notifyStatus('microfono attivo...', 'listening');
  }

  _onSoundStart() {
    this.speechStartTime = Date.now();
    this._notifyStatus('parla pure...', 'listening');
  }

  _onSpeechEnd() {
    this._notifyStatus('elaborazione...', 'listening');
    
    // In modalità difficoltà, dai più tempo
    if (this.options.difficultyMode) {
      if (this.silenceTimeout) clearTimeout(this.silenceTimeout);
      this.silenceTimeout = setTimeout(() => {
        this._processDifficultyBuffer();
      }, 2000); // 2 secondi di silenzio prima di processare
    }
  }

  _onSoundEnd() {
    this._notifyAudioLevel(0);
  }

  _onAudioEnd() {
    // Non fare nulla, il riconoscimento continua
  }

  _onNoMatch() {
    if (this.options.difficultyMode) {
      this._processDifficultyBuffer();
    }
  }

  // === Rilevamento Parole Tagliate ===

  _detectClippedWords(text) {
    if (!text || !this.options.clipDetection) return;
    
    const words = text.split(/\s+/);
    const lastWord = words[words.length - 1];
    
    if (!lastWord || lastWord.length < 2) return;
    
    const clippedIndicators = [
      // Parola termina con trattino o sillaba incompleta
      () => lastWord.endsWith('-') || lastWord.endsWith('—'),
      // Parola molto corta per il contesto (1-3 lettere, non articoli/preposizioni)
      () => lastWord.length <= 2 && !['a', 'i', 'o', 'e', 'in', 'il', 'lo', 'la', 'le', 'li', 'an', 'to', 'be', 'at', 'on', 'is', 'it', 'or', 'as', 'so', 'my', 'by', 'we', 'he', 'no', 'go'].includes(lastWord.toLowerCase()),
      // Parola che sembra un prefisso (es. "pre", "re", "dis", "un", "in", "im", "mis", "over", "under")
      () => {
        const prefixes = ['pre', 're', 'dis', 'un', 'im', 'mis', 'ove', 'und', 'sub', 'inter', 'trans', 'super', 'anti', 'auto', 'bi', 'co', 'de', 'ex', 'extra', 'fore', 'hemi', 'hydro', 'hyper', 'il', 'ir', 'macro', 'mal', 'micro', 'mid', 'mini', 'mono', 'multi', 'non', 'out', 'over', 'peri', 'poly', 'post', 'pre', 'pro', 'pseudo', 're', 'semi', 'sub', 'super', 'supra', 'sur', 'tele', 'trans', 'tri', 'ultra', 'un', 'under', 'uni'];
        return prefixes.some(p => lastWord.toLowerCase() === p);
      },
      // Parola che termina con consonante e sembra incompleta (solo inglese)
      () => {
        const lang = this.options.lang.startsWith('en');
        if (!lang) return false;
        return lastWord.length >= 3 && /[^aeiou]$/i.test(lastWord) && lastWord.length <= 4 && !['the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'had', 'her', 'was', 'one', 'our', 'out', 'has', 'its', 'who', 'may', 'now', 'get', 'got'].includes(lastWord.toLowerCase());
      }
    ];

    const isClipped = clippedIndicators.some(check => check());
    
    if (isClipped) {
      this._notifyClipDetected(lastWord);
    }
  }

  // === Modalità Difficoltà di Parola ===

  _processDifficultySegment(segment) {
    // Accumula segmenti di testo
    this.currentSegment = segment;
    
    if (this.options.difficultyMode) {
      this.difficultyAttempts++;
      
      // Se abbiamo abbastanza tentativi, processa il buffer
      if (this.difficultyAttempts >= this.maxDifficultyAttempts) {
        this._processDifficultyBuffer();
        this.difficultyAttempts = 0;
      }
    }
  }

  _processDifficultyBuffer() {
    if (this.difficultyBuffer.length === 0) return;
    
    // In modalità difficoltà, cerca di aggregare risultati multipli
    // per trovare la trascrizione più probabile
    const textCounts = {};
    let bestText = '';
    let bestCount = 0;
    let bestConfidence = 0;
    
    for (const entry of this.difficultyBuffer) {
      const text = entry.text.toLowerCase();
      textCounts[text] = (textCounts[text] || 0) + 1;
      
      if (textCounts[text] > bestCount || 
          (textCounts[text] === bestCount && entry.confidence > bestConfidence)) {
        bestText = text;
        bestCount = textCounts[text];
        bestConfidence = entry.confidence;
      }
      
      // Considera anche alternative
      if (entry.alternatives) {
        for (const alt of entry.alternatives) {
          const altText = alt.text.toLowerCase();
          textCounts[altText] = (textCounts[altText] || 0) + 0.5; // peso ridotto
          
          if (textCounts[altText] > bestCount && alt.confidence > 0.3) {
            bestText = altText;
            bestCount = textCounts[altText];
            bestConfidence = alt.confidence;
          }
        }
      }
    }
    
    // Se abbiamo un risultato aggregato migliore, notificalo
    if (bestText && bestCount > 1) {
      // Normalizza la prima lettera maiuscola
      const normalized = bestText.charAt(0).toUpperCase() + bestText.slice(1);
      this._notifyFinal(normalized, bestConfidence);
    }
    
    // Pulisci buffer
    this.difficultyBuffer = [];
    this.difficultyAttempts = 0;
  }

  _resetSilenceTimer() {
    if (this.silenceTimeout) {
      clearTimeout(this.silenceTimeout);
    }
    
    // In modalità difficoltà, usa un timeout più lungo
    const timeout = this.options.difficultyMode ? 5000 : 3000;
    
    this.silenceTimeout = setTimeout(() => {
      this._notifyStatus('in ascolto...', 'listening');
    }, timeout);
  }

  // === Notifiche ===

  _notifyInterim(text) {
    if (this.onInterim) this.onInterim(text);
  }

  _notifyFinal(text, confidence) {
    if (this.onFinal) this.onFinal(text, confidence);
  }

  _notifyClipDetected(fragment) {
    if (this.onClipDetected) this.onClipDetected(fragment);
  }

  _notifyStatus(message, type) {
    if (this.onStatusChange) this.onStatusChange(message, type);
  }

  _notifyAudioLevel(level) {
    if (this.onAudioLevel) this.onAudioLevel(level);
  }

  _notifyError(message) {
    if (this.onError) this.onError(message);
  }

  // === Utility ===

  isSupported() {
    return !!(window.SpeechRecognition || window.webkitSpeechRecognition);
  }

  destroy() {
    this.stop();
    this.recognition = null;
    this.onInterim = null;
    this.onFinal = null;
    this.onClipDetected = null;
    this.onStatusChange = null;
    this.onAudioLevel = null;
    this.onError = null;
  }
}

// Esponi globalmente
window.SpeechRecognizer = SpeechRecognizer;
