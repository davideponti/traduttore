/**
 * App principale - Traduttore Medico
 * Collega SpeechRecognizer, Translator e UI
 */
class TraduttoreApp {
  constructor() {
    this.recognizer = null;
    this.translator = null;
    this.currentText = '';
    this.currentTranslation = '';
    this.currentConfidence = 0;
    this.isRecording = false;
    this.allMedicalPhrases = [];
    this.translationHistory = [];
    
    // Riferimenti DOM
    this.dom = {};
    
    this._init();
  }

  _init() {
    if (!this._checkSupport()) return;

    this._cacheDom();
    this._initRecognizer();
    this._initTranslator();
    this._bindEvents();
    this._loadVoices();
    this._loadMedicalPhrases();
    this._loadPatientResponses();
    
    console.log('🏥 Traduttore Medico pronto!');
  }

  _checkSupport() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      this.dom.status.textContent = '❌ Riconoscimento vocale non supportato. Usa Chrome o Edge.';
      this.dom.status.className = 'status error';
      this.dom.startBtn.disabled = true;
      return false;
    }
    return true;
  }

  _cacheDom() {
    this.dom = {
      startBtn: document.getElementById('startBtn'),
      stopBtn: document.getElementById('stopBtn'),
      speakBtn: document.getElementById('speakBtn'),
      copyBtn: document.getElementById('copyBtn'),
      clearBtn: document.getElementById('clearBtn'),
      modeITEN: document.getElementById('modeITEN'),
      modeENIT: document.getElementById('modeENIT'),
      status: document.getElementById('status'),
      audioBar: document.getElementById('audioBar'),
      interimText: document.getElementById('interimText'),
      finalText: document.getElementById('finalText'),
      translationResult: document.getElementById('translationResult'),
      translationMicContainer: document.getElementById('translationMicContainer'),
      translationMicBtn: document.getElementById('translationMicBtn'),
      suggestionsPanel: document.getElementById('suggestionsPanel'),
      suggestionsList: document.getElementById('suggestionsList'),
      fragmentBadge: document.getElementById('fragmentBadge'),
      confidenceInfo: document.getElementById('confidenceInfo'),
      confidenceValue: document.getElementById('confidenceValue'),
      confidenceFill: document.getElementById('confidenceFill'),
      sensitivitySlider: document.getElementById('sensitivitySlider'),
      sensitivityValue: document.getElementById('sensitivityValue'),
      difficultyMode: document.getElementById('difficultyMode'),
      clipMode: document.getElementById('clipMode'),
      autoTranslate: document.getElementById('autoTranslate'),
      autoSpeak: document.getElementById('autoSpeak'),
      phrasesAccordion: document.getElementById('phrasesAccordion'),
      patientResponsesAccordion: document.getElementById('patientResponsesAccordion'),
      historyPanel: document.getElementById('historyPanel'),
      historyList: document.getElementById('historyList')
    };
  }

  _initRecognizer() {
    try {
      this.recognizer = new SpeechRecognizer({
        lang: 'it-IT',
        continuous: true,
        interimResults: true,
        maxAlternatives: 5
      });

      this.recognizer.onInterim = (text) => {
        this.dom.interimText.textContent = text || '';
      };

      this.recognizer.onFinal = (text, confidence) => {
        this.currentText = text;
        this.currentConfidence = confidence || 0;
        this._updateFinalText(text);
        this._updateConfidence(confidence);
        
        if (this.dom.autoTranslate.checked) {
          this._translate(text);
        }
      };

      this.recognizer.onClipDetected = (fragment) => {
        this._showSuggestions(fragment);
      };

      this.recognizer.onStatusChange = (message, type) => {
        this.dom.status.textContent = message;
        this.dom.status.className = type ? `status ${type}` : 'status';
      };

      this.recognizer.onAudioLevel = (level) => {
        this.dom.audioBar.style.width = level + '%';
        if (level > 70) {
          this.dom.audioBar.style.background = 'linear-gradient(90deg, #FF6584, #FFC107)';
        } else if (level > 40) {
          this.dom.audioBar.style.background = 'linear-gradient(90deg, #6C63FF, #FF6584)';
        } else {
          this.dom.audioBar.style.background = 'linear-gradient(90deg, #6C63FF, #5A52D5)';
        }
      };

      this.recognizer.onError = (message) => {
        console.warn('Errore riconoscitore:', message);
      };
    } catch (e) {
      this.dom.status.textContent = '❌ ' + e.message;
      this.dom.status.className = 'status error';
      this.dom.startBtn.disabled = true;
    }
  }

  _initTranslator() {
    this.translator = new Translator();

    this.translator.onTranslation = (text, match) => {
      this.currentTranslation = text;
      this.dom.translationResult.textContent = text;
      this.dom.translationResult.style.borderLeftColor = match > 0.6 ? '#4CAF50' : '#FFC107';
      this.dom.speakBtn.disabled = false;
      this.dom.copyBtn.disabled = false;
      
      // Aggiungi a storico
      this._addToHistory(this.currentText, text);
      
    // Mostra microfono animato per riprodurre la traduzione
    this._showTranslationMic(text);

      if (this.dom.autoSpeak.checked) {
        const targetLang = this.translator.targetLang === 'it' ? 'it-IT' : 'en-US';
        setTimeout(() => {
          this.translator.speak(text, targetLang);
        }, 300);
      }
    };

    this.translator.onTranslationError = (message) => {
      console.warn('Errore traduzione:', message);
    };

    this.translator.onSuggestions = (suggestions) => {
      this._renderSuggestions(suggestions);
    };

    this.translator.onSpeakStart = () => {
      this._startMicAnimation();
    };

    this.translator.onSpeakEnd = () => {
      this._stopMicAnimation();
    };
  }

  _bindEvents() {
    // Pulsanti registrazione
    this.dom.startBtn.addEventListener('click', () => this._startRecording());
    this.dom.stopBtn.addEventListener('click', () => this._stopRecording());
    
    // Pulsanti traduzione
    this.dom.speakBtn.addEventListener('click', () => this._speak());
    this.dom.copyBtn.addEventListener('click', () => this._copy());
    this.dom.clearBtn.addEventListener('click', () => this._clear());
    
    // Microfono animato della traduzione
    this.dom.translationMicBtn.addEventListener('click', () => this._speak());
    
    // Modalità
    this.dom.modeITEN.addEventListener('click', () => this._setMode('it', 'en'));
    this.dom.modeENIT.addEventListener('click', () => this._setMode('en', 'it'));
    
    // Impostazioni
    this.dom.sensitivitySlider.addEventListener('input', (e) => {
      const val = e.target.value;
      this.dom.sensitivityValue.textContent = val + '%';
      if (this.recognizer) {
        this.recognizer.setSensitivity(val);
      }
    });

    this.dom.difficultyMode.addEventListener('change', (e) => {
      if (this.recognizer) {
        this.recognizer.setDifficultyMode(e.target.checked);
      }
    });

    this.dom.clipMode.addEventListener('change', (e) => {
      if (this.recognizer) {
        this.recognizer.setClipDetection(e.target.checked);
      }
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'BUTTON') return;
      
      if (e.code === 'Space' && !e.repeat) {
        e.preventDefault();
        if (this.isRecording) {
          this._stopRecording();
        } else {
          this._startRecording();
        }
      }
      
      if (e.code === 'Escape' && this.isRecording) {
        this._stopRecording();
      }
    });
  }

  // === Risposte del Paziente ===

  async _loadPatientResponses() {
    try {
      this.patientResponses = await this.translator.getPatientResponses();
      this._renderPatientResponses();
    } catch (e) {
      console.warn('Errore caricamento risposte paziente:', e);
    }
  }

  _renderPatientResponses() {
    if (!this.dom.patientResponsesAccordion) return;
    this.dom.patientResponsesAccordion.innerHTML = '';
    if (!this.patientResponses || this.patientResponses.length === 0) return;

    const groups = {
      '😣 Pain and Symptoms': { keywords: ['pain', 'hurt', 'nauseous', 'vomit', 'dizzy', 'bleeding', 'fever', 'head', 'stomach'], emoji: '😣' },
      '😤 Difficulties and Emergencies': { keywords: ['cannot', 'breathe', 'help', 'scared', 'call', 'cold', 'hot', 'sleep', 'see', 'hear', 'fell'], emoji: '😤' },
      '🙂 Needs and Conditions': { keywords: ['thirsty', 'hungry', 'water', 'bathroom', 'medicine', 'allergic', 'diabetic', 'pressure'], emoji: '🙂' },
      '📝 Basic Responses': { keywords: ['yes', 'no', 'understand', 'repeat', 'thank', 'better', 'worse', 'when'], emoji: '📝' }
    };

    const unassigned = [...this.patientResponses];

    Object.entries(groups).forEach(([groupName, groupInfo]) => {
      const matched = [];
      const remaining = [];
      
      unassigned.forEach(resp => {
        const matchText = resp.english.toLowerCase();
        const found = groupInfo.keywords.some(k => matchText.includes(k));
        if (found) matched.push(resp);
        else remaining.push(resp);
      });

      unassigned.length = 0;
      unassigned.push(...remaining);

      if (matched.length === 0) return;

      const details = document.createElement('details');
      details.className = 'accordion-item';

      const summary = document.createElement('summary');
      summary.className = 'accordion-summary';
      summary.innerHTML = `<span class="accordion-summary-icon">${groupInfo.emoji}</span><span class="accordion-label">${groupName}</span><span class="accordion-count">${matched.length}</span>`;
      details.appendChild(summary);

      const content = document.createElement('div');
      content.className = 'accordion-content';

      matched.forEach(resp => {
        const isEN = this.translator.sourceLang === 'it';
        const displayText = isEN ? resp.english : resp.italian;
        const translateTo = isEN ? resp.italian : resp.english;

        const btn = document.createElement('button');
        btn.className = 'patient-resp-accordion-btn';
        btn.innerHTML = `<span class="resp-emoji">${resp.emoji}</span><span class="phrase-text">${displayText}</span><span class="resp-translate">${translateTo}</span>`;
        btn.title = translateTo;

        btn.addEventListener('click', () => {
          this._usePatientResponse(displayText, translateTo, isEN ? 'en-US' : 'it-IT');
        });

        content.appendChild(btn);
      });

      details.appendChild(content);
      this.dom.patientResponsesAccordion.appendChild(details);
    });

    // Ultimo gruppo: ciò che resta
    if (unassigned.length > 0) {
      const details = document.createElement('details');
      details.className = 'accordion-item';
      const summary = document.createElement('summary');
      summary.className = 'accordion-summary';
      summary.innerHTML = `<span class="accordion-summary-icon">🗯️</span><span class="accordion-label">Other responses</span><span class="accordion-count">${unassigned.length}</span>`;
      details.appendChild(summary);
      const content = document.createElement('div');
      content.className = 'accordion-content';

      unassigned.forEach(resp => {
        const isEN = this.translator.sourceLang === 'it';
        const displayText = isEN ? resp.english : resp.italian;
        const translateTo = isEN ? resp.italian : resp.english;
        const btn = document.createElement('button');
        btn.className = 'patient-resp-accordion-btn';
        btn.innerHTML = `<span class="resp-emoji">${resp.emoji}</span><span class="phrase-text">${displayText}</span><span class="resp-translate">${translateTo}</span>`;
        btn.addEventListener('click', () => {
          this._usePatientResponse(displayText, translateTo, isEN ? 'en-US' : 'it-IT');
        });
        content.appendChild(btn);
      });

      details.appendChild(content);
      this.dom.patientResponsesAccordion.appendChild(details);
    }
  }

  _usePatientResponse(text, translation, speakLang) {
    this.currentText = text;
    this._updateFinalText(text);
    
    this.currentTranslation = translation;
    this.dom.translationResult.textContent = translation;
    this.dom.translationResult.style.borderLeftColor = '#4CAF50';
    this.dom.speakBtn.disabled = false;
    this.dom.copyBtn.disabled = false;
    
    this._addToHistory(text, translation);
    
    // Mostra microfono animato per riprodurre la traduzione
    this._showTranslationMic(translation);
    
    // Leggi la risposta in italiano per l'infermiere
    setTimeout(() => {
      this.translator.speak(translation, 'it-IT');
    }, 300);
  }

  _loadVoices() {
    if (window.speechSynthesis) {
      window.speechSynthesis.getVoices();
      window.speechSynthesis.onvoiceschanged = () => {
        window.speechSynthesis.getVoices();
      };
    }
  }

  // === Frasi Mediche ===

  async _loadMedicalPhrases() {
    try {
      this.allMedicalPhrases = await this.translator.getMedicalPhrases();
      this._renderMedicalPhrases('all');
    } catch (e) {
      console.warn('Errore caricamento frasi mediche:', e);
    }
  }

  _renderMedicalPhrases(category) {
    if (!this.dom.phrasesAccordion) return;

    const categories = ['accoglienza', 'sintomi', 'corpo', 'cure', 'procedure', 'anagrafica', 'rassicurazioni', 'dimissioni'];
    const categoryLabels = {
      accoglienza: '🙋 Accoglienza', sintomi: '🩺 Sintomi', corpo: '👤 Parti del corpo',
      cure: '💊 Cure e Medicine', procedure: '🛏️ Procedure', anagrafica: '📄 Anagrafica',
      rassicurazioni: '💙 Rassicurazioni', dimissioni: '🏠 Dimissioni'
    };

    this.dom.phrasesAccordion.innerHTML = '';

    categories.forEach(cat => {
      const phrases = this.allMedicalPhrases.filter(p => p.category === cat);
      if (phrases.length === 0) return;

      const details = document.createElement('details');
      details.className = 'accordion-item';

      const summary = document.createElement('summary');
      summary.className = 'accordion-summary';
      summary.innerHTML = `<span class="accordion-summary-icon">📋</span><span class="accordion-label">${categoryLabels[cat] || cat}</span><span class="accordion-count">${phrases.length}</span>`;
      details.appendChild(summary);

      const content = document.createElement('div');
      content.className = 'accordion-content';

      phrases.forEach(phrase => {
        const isITtoEN = this.translator.sourceLang === 'it';
        const icon = isITtoEN ? '🇮🇹' : '🇬🇧';
        const text = isITtoEN ? phrase.text : phrase.translation;
        const translation = isITtoEN ? phrase.translation : phrase.text;

        const btn = document.createElement('button');
        btn.className = 'accordion-phrase-btn';
        btn.innerHTML = `<span class="lang-icon">${icon}</span><span class="phrase-text">${text}</span><span class="phrase-arrow">🔊</span>`;
        btn.title = translation;

        btn.addEventListener('click', () => {
          this._useMedicalPhrase(text, translation);
        });

        content.appendChild(btn);
      });

      details.appendChild(content);
      this.dom.phrasesAccordion.appendChild(details);
    });
  }

  _useMedicalPhrase(text, translation) {
    // Mostra la frase nel pannello di riconoscimento
    this.currentText = text;
    this._updateFinalText(text);
    
    // Traduci subito
    this.currentTranslation = translation;
    this.dom.translationResult.textContent = translation;
    this.dom.translationResult.style.borderLeftColor = '#4CAF50';
    this.dom.speakBtn.disabled = false;
    this.dom.copyBtn.disabled = false;
    
    // Aggiungi a storico
    this._addToHistory(text, translation);
    
    // Mostra microfono animato per riprodurre la traduzione
    this._showTranslationMic(translation);
    
    // Leggi automaticamente
    const targetLang = this.translator.targetLang === 'it' ? 'it-IT' : 'en-US';
    setTimeout(() => {
      this.translator.speak(translation, targetLang);
    }, 300);
  }

  // === Microfono animato per riproduzione traduzione ===

  _showTranslationMic(text) {
    if (!this.dom.translationMicContainer) return;
    this.dom.translationMicContainer.style.display = 'flex';
    this.dom.translationMicContainer.classList.remove('speaking');
    this.dom.translationMicBtn.title = `Ascolta: ${text}`;
  }

  _startMicAnimation() {
    if (!this.dom.translationMicContainer) return;
    this.dom.translationMicContainer.classList.add('speaking');
  }

  _stopMicAnimation() {
    if (!this.dom.translationMicContainer) return;
    this.dom.translationMicContainer.classList.remove('speaking');
  }

  // === Storico ===

  _addToHistory(source, translated) {
    this.translationHistory.unshift({
      source,
      translated,
      time: new Date().toLocaleTimeString()
    });
    
    if (this.translationHistory.length > 20) {
      this.translationHistory.pop();
    }
    
    this._renderHistory();
  }

  _renderHistory() {
    if (!this.dom.historyList) return;
    
    if (this.translationHistory.length === 0) {
      this.dom.historyPanel.style.display = 'none';
      return;
    }
    
    this.dom.historyPanel.style.display = 'block';
    this.dom.historyList.innerHTML = '';
    
    this.translationHistory.forEach(entry => {
      const item = document.createElement('div');
      item.className = 'history-item';
      item.innerHTML = `
        <div class="source">${entry.source}</div>
        <div class="translated">${entry.translated}</div>
        <div class="time">${entry.time}</div>
      `;
      this.dom.historyList.appendChild(item);
    });
  }

  // === Recording ===

  _startRecording() {
    if (!this.recognizer || this.isRecording) return;
    
    this.isRecording = true;
    
    this.dom.startBtn.classList.add('recording');
    this.dom.startBtn.disabled = true;
    this.dom.stopBtn.disabled = false;
    this.dom.interimText.textContent = '';
    
    this.recognizer.start();
  }

  _stopRecording() {
    if (!this.recognizer || !this.isRecording) return;
    
    this.isRecording = false;
    
    this.dom.startBtn.classList.remove('recording');
    this.dom.startBtn.disabled = false;
    this.dom.stopBtn.disabled = true;
    
    this.recognizer.stop();
    this.dom.audioBar.style.width = '0%';
  }

  // === UI Updates ===

  _updateFinalText(text) {
    if (text) {
      this.dom.finalText.innerHTML = text;
    }
  }

  _updateConfidence(confidence) {
    if (confidence > 0) {
      this.dom.confidenceInfo.style.display = 'block';
      const percent = Math.round(confidence * 100);
      this.dom.confidenceValue.textContent = percent + '%';
      this.dom.confidenceFill.style.width = percent + '%';
      
      if (percent > 70) {
        this.dom.confidenceFill.style.background = '#4CAF50';
      } else if (percent > 40) {
        this.dom.confidenceFill.style.background = '#FFC107';
      } else {
        this.dom.confidenceFill.style.background = '#FF6584';
      }
    }
  }

  _showSuggestions(fragment) {
    if (!this.dom.clipMode.checked) return;
    
    this.dom.fragmentBadge.textContent = `"${fragment}"`;
    this.dom.suggestionsPanel.style.display = 'block';
    
    this.translator.getSuggestions(fragment);
  }

  _renderSuggestions(suggestions) {
    this.dom.suggestionsList.innerHTML = '';
    
    if (!suggestions || suggestions.length === 0) {
      this.dom.suggestionsList.innerHTML = '<span class="suggestion-chip" style="opacity:0.6;">Nessun suggerimento trovato</span>';
      return;
    }
    
    suggestions.forEach(word => {
      const chip = document.createElement('button');
      chip.className = 'suggestion-chip';
      chip.textContent = word;
      chip.addEventListener('click', () => {
        this._applySuggestion(word);
      });
      this.dom.suggestionsList.appendChild(chip);
    });
  }

  _applySuggestion(word) {
    const text = this.currentText;
    const words = text.split(/\s+/);
    if (words.length > 0) {
      words[words.length - 1] = word;
      const newText = words.join(' ');
      this.currentText = newText;
      this._updateFinalText(newText);
    }
    
    this.dom.suggestionsPanel.style.display = 'none';
    
    if (this.dom.autoTranslate.checked) {
      this._translate(this.currentText);
    }
  }

  // === Translation ===

  async _translate(text) {
    if (!text || !text.trim()) return;
    await this.translator.translate(text);
  }

  _speak() {
    if (this.currentTranslation) {
      const targetLang = this.translator.targetLang === 'it' ? 'it-IT' : 'en-US';
      this.translator.speak(this.currentTranslation, targetLang);
      this._startMicAnimation();
    }
  }

  _copy() {
    if (this.currentTranslation) {
      navigator.clipboard.writeText(this.currentTranslation)
        .then(() => {
          const original = this.dom.copyBtn.innerHTML;
          this.dom.copyBtn.innerHTML = '<span class="icon">✅</span><span class="label">Copiato!</span>';
          setTimeout(() => {
            this.dom.copyBtn.innerHTML = original;
          }, 2000);
        })
        .catch(err => console.warn('Errore copia:', err));
    }
  }

  _clear() {
    this.currentText = '';
    this.currentTranslation = '';
    this.currentConfidence = 0;
    
    this.dom.finalText.innerHTML = '<span class="placeholder">Il testo riconosciuto apparirà qui...</span>';
    this.dom.interimText.textContent = '';
    this.dom.translationResult.innerHTML = '<span class="placeholder">La traduzione apparirà qui...</span>';
    this.dom.translationMicContainer.style.display = 'none';
    this.dom.translationMicContainer.classList.remove('speaking');
    this.dom.suggestionsPanel.style.display = 'none';
    this.dom.confidenceInfo.style.display = 'none';
    this.dom.audioBar.style.width = '0%';
    this.dom.speakBtn.disabled = true;
    this.dom.copyBtn.disabled = true;
    
    if (this.recognizer) {
      this.recognizer.finalTranscript = '';
      this.recognizer.difficultyBuffer = [];
      this.recognizer.difficultyAttempts = 0;
    }
  }

  // === Mode ===

  _setMode(source, target) {
    this.translator.setLang(source, target);
    
    if (this.recognizer) {
      this.recognizer.setLang(source);
    }
    
    this.dom.modeITEN.classList.toggle('active', source === 'it');
    this.dom.modeENIT.classList.toggle('active', source === 'en');
    
    // Ricarica frasi e risposte con lingua aggiornata
    this._loadMedicalPhrases();
    this._loadPatientResponses();
    
    if (this.isRecording) {
      this._clear();
    }
    
    console.log(`Modalità: ${source} → ${target}`);
  }
}

// === Avvio ===
document.addEventListener('DOMContentLoaded', () => {
  window.app = new TraduttoreApp();
});
