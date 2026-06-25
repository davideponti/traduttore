/**
 * Translator - Gestisce la traduzione via MyMemory API e sintesi vocale
 * Versione Medicale: dizionario medico offline integrato
 */
class Translator {
  constructor() {
    this.sourceLang = 'it';
    this.targetLang = 'en';
    this.lastTranslation = '';
    this.translationHistory = [];
    this.maxHistory = 50;
    
    // Callbacks
    this.onTranslation = null;
    this.onTranslationError = null;
    this.onSuggestions = null;
  }

  setLang(source, target) {
    this.sourceLang = source;
    this.targetLang = target;
  }

  /**
   * Traduce il testo usando MyMemory API via proxy
   */
  async translate(text) {
    if (!text || !text.trim()) {
      return '';
    }

    // Prima controlla il dizionario medico offline
    const offlineResult = this._medicalOfflineTranslate(text.trim());
    if (offlineResult) {
      this.lastTranslation = offlineResult;
      this.translationHistory.unshift({
        source: text.trim(),
        target: offlineResult,
        match: 0.95,
        timestamp: Date.now()
      });
      if (this.translationHistory.length > this.maxHistory) {
        this.translationHistory.pop();
      }
      if (this.onTranslation) {
        this.onTranslation(offlineResult, 0.95);
      }
      return offlineResult;
    }

    try {
      const response = await fetch('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: text.trim(),
          sourceLang: this.sourceLang,
          targetLang: this.targetLang
        })
      });

      if (!response.ok) {
        throw new Error(`Errore HTTP: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error);
      }

      this.lastTranslation = data.translatedText;
      
      this.translationHistory.unshift({
        source: text.trim(),
        target: data.translatedText,
        match: data.match,
        timestamp: Date.now()
      });
      
      if (this.translationHistory.length > this.maxHistory) {
        this.translationHistory.pop();
      }

      if (this.onTranslation) {
        this.onTranslation(data.translatedText, data.match);
      }

      return data.translatedText;
    } catch (error) {
      console.error('Errore traduzione:', error);
      
      // Fallback a dizionario generico
      const fallback = this._offlineTranslate(text.trim());
      if (fallback) {
        this.lastTranslation = fallback;
        if (this.onTranslation) {
          this.onTranslation(fallback, 0.5);
        }
        return fallback;
      }
      
      if (this.onTranslationError) {
        this.onTranslationError(error.message);
      }
      return '';
    }
  }

  /**
   * Richiede suggerimenti per completare una parola tagliata
   */
  async getSuggestions(fragment) {
    if (!fragment || fragment.length < 2) {
      if (this.onSuggestions) this.onSuggestions([]);
      return [];
    }

    try {
      const response = await fetch('/api/suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fragment: fragment.toLowerCase(),
          lang: this.sourceLang
        })
      });

      if (!response.ok) {
        throw new Error(`Errore HTTP: ${response.status}`);
      }

      const data = await response.json();
      const suggestions = data.suggestions || [];
      
      if (this.onSuggestions) {
        this.onSuggestions(suggestions);
      }
      
      return suggestions;
    } catch (error) {
      console.warn('Errore suggerimenti:', error);
      if (this.onSuggestions) this.onSuggestions([]);
      return [];
    }
  }

  /**
   * Carica le frasi mediche dal server
   */
  async getMedicalPhrases(category = 'all') {
    try {
      const response = await fetch(`/api/medical-phrases?lang=${this.sourceLang}&category=${category}`);
      if (!response.ok) throw new Error('Errore caricamento frasi');
      const data = await response.json();
      return data.phrases || [];
    } catch (error) {
      console.warn('Errore caricamento frasi mediche:', error);
      return [];
    }
  }

  /**
   * Carica le risposte del paziente dal server
   */
  async getPatientResponses() {
    try {
      const response = await fetch('/api/patient-responses');
      if (!response.ok) throw new Error('Errore caricamento risposte');
      const data = await response.json();
      return data.responses || [];
    } catch (error) {
      console.warn('Errore caricamento risposte paziente:', error);
      return [];
    }
  }

  /**
   * Sintesi vocale del testo tradotto
   */
  speak(text, lang) {
    if (!text || !text.trim()) return;
    
    window.speechSynthesis.cancel();
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang || this.targetLang;
    utterance.rate = 0.95; // leggermente più lento per chiarezza in ambito medico
    utterance.pitch = 1.0;
    utterance.volume = 1.0;
    
    const voices = window.speechSynthesis.getVoices();
    const langCode = lang || this.targetLang;
    const voice = voices.find(v => v.lang.startsWith(langCode));
    if (voice) {
      utterance.voice = voice;
    }
    
    window.speechSynthesis.speak(utterance);
  }

  /**
   * Traduzione medica offline
   */
  _medicalOfflineTranslate(text) {
    const lower = text.toLowerCase().trim();
    
    const medicalDict = {
      // SINTOMI IT → EN
      'ho dolore': 'I have pain',
      'ho mal di testa': 'I have a headache',
      'ho mal di pancia': 'I have a stomach ache',
      'ho mal di schiena': 'I have back pain',
      'ho la febbre': 'I have a fever',
      'ho la tosse': 'I have a cough',
      'ho la nausea': 'I feel nauseous',
      'ho vomitato': 'I have vomited',
      'mi fa male': 'It hurts',
      'mi fa male qui': 'It hurts here',
      'non respiro bene': 'I have difficulty breathing',
      'ho le vertigini': 'I feel dizzy',
      'mi sento debole': 'I feel weak',
      'mi sento stanco': 'I feel tired',
      'ho sanguinamento': 'I am bleeding',
      'ho una ferita': 'I have a wound',
      'ho un taglio': 'I have a cut',
      'ho una frattura': 'I have a fracture',
      'ho una distorsione': 'I have a sprain',
      'ho un\'ustione': 'I have a burn',
      'ho un\'allergia': 'I have an allergy',
      'ho il diabete': 'I have diabetes',
      'ho l\'asma': 'I have asthma',
      'ho la pressione alta': 'I have high blood pressure',
      'ho la pressione bassa': 'I have low blood pressure',
      'ho problemi di cuore': 'I have heart problems',
      'non vedo bene': 'I cannot see well',
      'non sento bene': 'I cannot hear well',
      'ho difficoltà a deglutire': 'I have difficulty swallowing',
      'ho perso conoscenza': 'I lost consciousness',
      'ho avuto un infarto': 'I had a heart attack',
      'ho avuto un ictus': 'I had a stroke',
      'ho l\'emicrania': 'I have a migraine',
      'ho la diarrea': 'I have diarrhea',
      'ho la stitichezza': 'I am constipated',
      'ho prurito': 'I have an itch',
      'ho un\'eruzione cutanea': 'I have a rash',
      'ho gonfiore': 'I have swelling',
      'ho una infezione': 'I have an infection',
      'ho l\'influenza': 'I have the flu',
      'ho il raffreddore': 'I have a cold',
      'ho il mal di gola': 'I have a sore throat',
      'ho il mal d\'orecchi': 'I have an earache',
      'ho il mal di denti': 'I have a toothache',
      
      // CURE IT → EN
      'devo misurarle la pressione': 'I need to take your blood pressure',
      'devo prenderle la temperatura': 'I need to take your temperature',
      'devo farle un prelievo': 'I need to take a blood sample',
      'devo farle un\'iniezione': 'I need to give you an injection',
      'deve prendere questa medicina': 'You need to take this medicine',
      'deve prendere questa pillola': 'You need to take this pill',
      'deve bere più acqua': 'You need to drink more water',
      'deve mangiare': 'You need to eat',
      'deve riposare': 'You need to rest',
      'deve stare a digiuno': 'You must fast',
      'deve fare una radiografia': 'You need an X-ray',
      'deve fare una tac': 'You need a CT scan',
      'deve fare un\'ecografia': 'You need an ultrasound',
      'deve fare un intervento': 'You need surgery',
      'è allergico a qualche farmaco': 'Are you allergic to any medication',
      'prende medicine': 'Are you taking any medicines',
      'apra la bocca': 'Open your mouth',
      'faccia un respiro profondo': 'Take a deep breath',
      'trattenga il respiro': 'Hold your breath',
      'tossisca': 'Cough',
      'non si muova': 'Don\'t move',
      'si sdrai': 'Lie down',
      'si alzi': 'Stand up',
      'mi stringa la mano': 'Squeeze my hand',
      'apra gli occhi': 'Open your eyes',
      'mi guardi': 'Look at me',
      
      // RASSICURAZIONI IT → EN
      'non si preoccupi': 'Don\'t worry',
      'è tutto sotto controllo': 'Everything is under control',
      'respiri lentamente': 'Breathe slowly',
      'si calmi': 'Calm down',
      'va tutto bene': 'Everything is fine',
      'siamo qui con lei': 'We are here with you',
      'chiamerò il medico': 'I will call the doctor',
      'torno subito': 'I\'ll be right back',
      'ha fatto bene a chiamarci': 'You did well to call us',
      'non è niente di grave': 'It\'s nothing serious',
      
      // DOMANDE IT → EN
      'come si chiama': 'What is your name',
      'quanti anni ha': 'How old are you',
      'dove ha dolore': 'Where does it hurt',
      'da quanto tempo': 'How long',
      'da quanto tempo ha dolore': 'How long have you had pain',
      'quanto è forte il dolore': 'How strong is the pain',
      'ha febbre': 'Do you have a fever',
      'ha la nausea': 'Do you feel nauseous',
      'ha vomitato': 'Have you vomited',
      'ha difficoltà a respirare': 'Do you have difficulty breathing',
      'ha la tosse': 'Do you have a cough',
      'ha avuto un incidente': 'Have you had an accident',
      'ha perso conoscenza': 'Did you lose consciousness',
      'è incinta': 'Are you pregnant',
      'fuma': 'Do you smoke',
      'beve alcol': 'Do you drink alcohol',
      'capisce': 'Do you understand',
      'ha bisogno di aiuto': 'Do you need help',
      'ha bisogno di un dottore': 'Do you need a doctor',
      'vuole chiamare qualcuno': 'Do you want to call someone',
      'ha famiglia qui': 'Do you have family here',
      
      // EMERGENZA IT → EN
      'chiami un\'ambulanza': 'Call an ambulance',
      'aiuto emergenza': 'Help, emergency',
      'c\'è un\'emergenza': 'There is an emergency',
      'si svegli': 'Wake up',
      'mi sente': 'Can you hear me',
      'respira': 'Are you breathing',
      'non respira': 'He/she is not breathing',
      'ha un attacco di cuore': 'He/she is having a heart attack',
      'ha un attacco d\'asma': 'He/she is having an asthma attack',
      'ha una reazione allergica': 'He/she is having an allergic reaction',
      'sta avendo una crisi': 'He/she is having a seizure',
      'ha perso i sensi': 'He/she passed out',
      'non si addormenti': 'Don\'t fall asleep',
      'stia sveglio': 'Stay awake',
      'la portiamo in pronto soccorso': 'We are taking you to the emergency room',
      
      // PARTI DEL CORPO IT → EN
      'testa': 'Head',
      'collo': 'Neck',
      'spalla': 'Shoulder',
      'braccio': 'Arm',
      'gomito': 'Elbow',
      'polso': 'Wrist',
      'mano': 'Hand',
      'dito': 'Finger',
      'petto': 'Chest',
      'schiena': 'Back',
      'pancia': 'Stomach / Abdomen',
      'fianco': 'Hip / Side',
      'gamba': 'Leg',
      'ginocchio': 'Knee',
      'caviglia': 'Ankle',
      'piede': 'Foot',
      'occhio': 'Eye',
      'orecchio': 'Ear',
      'naso': 'Nose',
      'bocca': 'Mouth',
      'gola': 'Throat',
      'dente': 'Tooth',
      'lingua': 'Tongue',
      'pelle': 'Skin',
      'muscolo': 'Muscle',
      'osso': 'Bone',
      'cuore': 'Heart',
      'polmone': 'Lung',
      'fegato': 'Liver',
      'rene': 'Kidney',
      'stomaco': 'Stomach',
      'intestino': 'Intestine',
      'cervello': 'Brain',
      'sangue': 'Blood',
      
      // EN → IT
      'i have pain': 'Ho dolore',
      'i have a headache': 'Ho mal di testa',
      'i have a stomach ache': 'Ho mal di pancia',
      'i have back pain': 'Ho mal di schiena',
      'i have a fever': 'Ho la febbre',
      'i have a cough': 'Ho la tosse',
      'i feel nauseous': 'Ho la nausea',
      'i have vomited': 'Ho vomitato',
      'it hurts': 'Mi fa male',
      'it hurts here': 'Mi fa male qui',
      'i have difficulty breathing': 'Ho difficoltà a respirare',
      'i feel dizzy': 'Ho le vertigini',
      'i feel weak': 'Mi sento debole',
      'i am bleeding': 'Ho sanguinamento',
      'i have a wound': 'Ho una ferita',
      'i have a fracture': 'Ho una frattura',
      'i have a sprain': 'Ho una distorsione',
      'i have a burn': 'Ho un\'ustione',
      'i have diabetes': 'Ho il diabete',
      'i have asthma': 'Ho l\'asma',
      'i have high blood pressure': 'Ho la pressione alta',
      'i have heart problems': 'Ho problemi di cuore',
      'i lost consciousness': 'Ho perso conoscenza',
      'i had a heart attack': 'Ho avuto un infarto',
      'i had a stroke': 'Ho avuto un ictus',
      'i have diarrhea': 'Ho la diarrea',
      'i am constipated': 'Ho la stitichezza',
      'i have a rash': 'Ho un\'eruzione cutanea',
      'i have an infection': 'Ho una infezione',
      'i have the flu': 'Ho l\'influenza',
      'i have a cold': 'Ho il raffreddore',
      'i have a sore throat': 'Ho il mal di gola',
      'i have an earache': 'Ho il mal d\'orecchi',
      'i have a toothache': 'Ho il mal di denti',
      'where does it hurt': 'Dove ha dolore?',
      'how long have you had pain': 'Da quanto tempo ha dolore?',
      'do you have a fever': 'Ha la febbre?',
      'do you feel nauseous': 'Ha la nausea?',
      'are you bleeding': 'Sanguina?',
      'do you have difficulty breathing': 'Ha difficoltà a respirare?',
      'are you pregnant': 'È incinta?',
      'do you smoke': 'Fuma?',
      'call an ambulance': 'Chiami un\'ambulanza!',
      'wake up': 'Si svegli!',
      'can you hear me': 'Mi sente?',
      'are you breathing': 'Respira?',
      'open your mouth': 'Apra la bocca',
      'take a deep breath': 'Faccia un respiro profondo',
      'hold your breath': 'Trattenga il respiro',
      'cough': 'Tossisca',
      'lie down': 'Si sdrai',
      'don\'t move': 'Non si muova',
      'squeeze my hand': 'Mi stringa la mano',
      'open your eyes': 'Apra gli occhi',
      'don\'t worry': 'Non si preoccupi',
      'everything is under control': 'È tutto sotto controllo',
      'breathe slowly': 'Respiri lentamente',
      'everything is fine': 'Va tutto bene',
      'we are here with you': 'Siamo qui con lei',
      'what is your name': 'Come si chiama?',
      'how old are you': 'Quanti anni ha?',
      'do you understand': 'Capisce?',
      'do you need help': 'Ha bisogno di aiuto?',
      'do you need a doctor': 'Ha bisogno di un dottore?'
    };

    // Cerca corrispondenza esatta
    if (medicalDict[lower]) return medicalDict[lower];
    
    // Cerca corrispondenza parziale (frase contiene una chiave)
    for (const [key, value] of Object.entries(medicalDict)) {
      if (lower.includes(key)) {
        // Capitalizza prima lettera
        return value.charAt(0).toUpperCase() + value.slice(1);
      }
    }

    return null;
  }

  /**
   * Traduzione offline di base (fallback)
   */
  _offlineTranslate(text) {
    const lower = text.toLowerCase().trim();
    
    const genericDict = {
      'ciao': 'Hello',
      'buongiorno': 'Good morning',
      'buonasera': 'Good evening',
      'arrivederci': 'Goodbye',
      'grazie': 'Thank you',
      'per favore': 'Please',
      'prego': 'You\'re welcome',
      'scusa': 'Sorry',
      'scusi': 'Excuse me',
      'aiuto': 'Help',
      'si': 'Yes',
      'no': 'No',
      'ok': 'OK',
      'bene': 'Good',
      'male': 'Bad',
      'grande': 'Big',
      'piccolo': 'Small',
      'acqua': 'Water',
      'cibo': 'Food',
      'mangiare': 'Eat',
      'bere': 'Drink',
      'dormire': 'Sleep',
      'andare': 'Go',
      'venire': 'Come',
      'casa': 'Home',
      'amico': 'Friend',
      'lavoro': 'Work',
      'scuola': 'School',
      'nome': 'Name',
      'numero': 'Number',
      'telefono': 'Phone',
      'soldi': 'Money',
      'hello': 'Ciao',
      'good morning': 'Buongiorno',
      'goodbye': 'Arrivederci',
      'thank you': 'Grazie',
      'please': 'Per favore',
      'sorry': 'Scusa',
      'excuse me': 'Scusi',
      'help': 'Aiuto',
      'yes': 'Sì',
      'no': 'No',
      'good': 'Buono',
      'water': 'Acqua',
      'food': 'Cibo',
      'eat': 'Mangiare',
      'drink': 'Bere',
      'sleep': 'Dormire',
      'go': 'Andare',
      'come': 'Venire',
      'home': 'Casa',
      'friend': 'Amico',
      'name': 'Nome',
      'number': 'Numero',
      'phone': 'Telefono',
      'money': 'Soldi'
    };

    if (genericDict[lower]) return genericDict[lower];
    
    for (const [key, value] of Object.entries(genericDict)) {
      if (lower.includes(key)) {
        return value.charAt(0).toUpperCase() + value.slice(1);
      }
    }

    return null;
  }
}

// Esponi globalmente
window.Translator = Translator;
