const express = require('express');
const axios = require('axios');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3001;

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

// Proxy per MyMemory Translation API
app.post('/api/translate', async (req, res) => {
  try {
    const { text, sourceLang, targetLang } = req.body;
    if (!text || !text.trim()) return res.status(400).json({ error: 'Testo richiesto' });
    const langPair = `${sourceLang || 'it'}|${targetLang || 'en'}`;
    const response = await axios.get('https://api.mymemory.translated.net/get', {
      params: { q: text, langpair: langPair, de: 'davide@traduttore.com' }
    });
    res.json({
      translatedText: response.data.responseData.translatedText,
      match: response.data.responseData.match
    });
  } catch (error) {
    console.error('Errore traduzione:', error.message);
    res.status(500).json({ error: 'Errore durante la traduzione', details: error.message });
  }
});

// Suggerimenti di completamento parole
app.post('/api/suggest', async (req, res) => {
  try {
    const { fragment, lang } = req.body;
    if (!fragment || fragment.length < 2) return res.json({ suggestions: [] });
    const suggestions = findWordCompletions(fragment.toLowerCase(), lang || 'en');
    res.json({ suggestions: suggestions.slice(0, 10) });
  } catch (error) {
    console.error('Errore suggerimenti:', error.message);
    res.json({ suggestions: [] });
  }
});

// Frasi mediche predefinite
app.get('/api/medical-phrases', (req, res) => {
  const { lang, category } = req.query;
  const phrases = getMedicalPhrases(lang || 'it', category || 'all');
  res.json({ phrases });
});

// Risposte del paziente
app.get('/api/patient-responses', (req, res) => {
  const responses = getPatientResponses();
  res.json({ responses });
});

// Dizionario medico per completamento parole tagliate
function findWordCompletions(fragment, lang) {
  const dictionaries = {
    en: [
      'pain', 'fever', 'cough', 'cold', 'flu', 'headache', 'stomachache',
      'toothache', 'backpain', 'sorethroat', 'nausea', 'vomit', 'dizziness',
      'weakness', 'fatigue', 'fracture', 'wound', 'bleeding', 'swelling',
      'infection', 'allergy', 'asthma', 'diabetes', 'pressure', 'heart',
      'breathing', 'chest', 'abdomen', 'throat', 'nose', 'ear', 'eye',
      'mouth', 'tongue', 'teeth', 'skin', 'bone', 'muscle', 'joint',
      'blood', 'urine', 'stool', 'temperature', 'weight', 'height',
      'medicine', 'tablet', 'injection', 'cream', 'drop', 'syrup',
      'surgery', 'operation', 'xray', 'scan', 'test', 'analysis',
      'doctor', 'nurse', 'patient', 'hospital', 'clinic', 'pharmacy',
      'ambulance', 'emergency', 'ward', 'bed', 'wheelchair', 'stretcher',
      'breath', 'cough', 'sneeze', 'sweat', 'chills', 'shiver',
      'broken', 'sprain', 'strain', 'cut', 'burn', 'rash', 'itch',
      'diarrhea', 'constipation', 'indigestion', 'hiccup', 'snore',
      'conscious', 'unconscious', 'awake', 'asleep', 'alert', 'confused',
      'hungry', 'thirsty', 'comfortable', 'uncomfortable', 'better', 'worse',
      'pregnant', 'delivery', 'birth', 'baby', 'child', 'adult', 'elderly',
      'feverish', 'dizzy', 'sleepy', 'restless', 'calm', 'anxious',
      'depressed', 'scared', 'nervous', 'relaxed', 'peaceful',
      'hospital', 'doctor', 'nurse', 'surgeon', 'specialist',
      'appointment', 'prescription', 'diagnosis', 'therapy', 'treatment',
      'intravenous', 'oral', 'topical', 'inhale', 'inject', 'swallow',
      'pharmacy', 'medication', 'dosage', 'sideaffect', 'allergic',
      'hypertension', 'hypotension', 'tachycardia', 'bradycardia',
      'arrhythmia', 'anemia', 'leukemia', 'pneumonia', 'bronchitis',
      'gastritis', 'hepatitis', 'nephritis', 'arthritis', 'dermatitis',
      'migraine', 'epilepsy', 'stroke', 'infarct', 'embolism', 'thrombosis',
      'insulin', 'antibiotic', 'antiviral', 'antifungal', 'antiseptic',
      'analgesic', 'anesthetic', 'antihistamine', 'antidepressant',
      'vaccine', 'serum', 'transfusion', 'transplant', 'dialysis',
      'chemotherapy', 'radiotherapy', 'physiotherapy', 'rehabilitation',
      'intensive', 'isolation', 'quarantine', 'sanitation', 'hygiene',
      'oxygen', 'ventilator', 'defibrillator', 'pacemaker', 'stent',
      'catheter', 'syringe', 'scalpel', 'forceps', 'stethoscope',
      'thermometer', 'sphygmomanometer', 'otoscope', 'ophthalmoscope'
    ],
    it: [
      'dolore', 'febbre', 'tosse', 'raffreddore', 'influenza', 'malditesta',
      'maldistomaco', 'maldedenti', 'maldischiena', 'maldigola', 'nausea',
      'vomito', 'vertigini', 'debolezza', 'stanchezza', 'frattura',
      'ferita', 'sanguinamento', 'gonfiore', 'infezione', 'allergia',
      'asma', 'diabete', 'pressione', 'cuore', 'respirazione', 'petto',
      'addome', 'gola', 'naso', 'orecchio', 'occhio', 'bocca', 'lingua',
      'denti', 'pelle', 'osso', 'muscolo', 'articolazione', 'sangue',
      'urina', 'feci', 'temperatura', 'peso', 'altezza',
      'medicina', 'compressa', 'iniezione', 'crema', 'goccia', 'sciroppo',
      'chirurgia', 'operazione', 'radiografia', 'tac', 'esame', 'analisi',
      'medico', 'infermiere', 'paziente', 'ospedale', 'clinica', 'farmacia',
      'ambulanza', 'emergenza', 'reparto', 'letto', 'sedia', 'barella',
      'respiro', 'colpo', 'starnuto', 'sudore', 'brividi', 'tremore',
      'rotto', 'distorsione', 'strappo', 'taglio', 'ustione', 'eruzione', 'prurito',
      'diarrea', 'stitichezza', 'indigestione', 'singhiozzo', 'russare',
      'cosciente', 'incosciente', 'sveglio', 'addormentato', 'attento', 'confuso',
      'affamato', 'assetato', 'comodo', 'scomodo', 'meglio', 'peggio',
      'incinta', 'parto', 'nascita', 'bambino', 'bambina', 'adulto', 'anziano',
      'febbricitante', 'stordito', 'assonnato', 'irrequieto', 'calmo', 'ansioso',
      'depresso', 'spaventato', 'nervoso', 'rilassato', 'tranquillo',
      'ospedale', 'dottore', 'infermiera', 'chirurgo', 'specialista',
      'appuntamento', 'prescrizione', 'diagnosi', 'terapia', 'cura',
      'endovenoso', 'orale', 'topico', 'inalare', 'iniettare', 'deglutire',
      'farmacia', 'farmaco', 'dosaggio', 'effettosecondario', 'allergico',
      'ipertensione', 'ipotensione', 'tachicardia', 'bradicardia',
      'aritmia', 'anemia', 'leucemia', 'polmonite', 'bronchite',
      'gastrite', 'epatite', 'nefrite', 'artrite', 'dermatite',
      'emicrania', 'epilessia', 'ictus', 'infarto', 'embolia', 'trombosi',
      'insulina', 'antibiotico', 'antivirale', 'antifungino', 'antisettico',
      'analgesico', 'anestetico', 'antistaminico', 'antidepressivo',
      'vaccino', 'siero', 'trasfusione', 'trapianto', 'dialisi',
      'chemioterapia', 'radioterapia', 'fisioterapia', 'riabilitazione',
      'terapiaintensiva', 'isolamento', 'quarantena', 'sanificazione', 'igiene',
      'ossigeno', 'ventilatore', 'defibrillatore', 'pacemaker', 'stent',
      'catetere', 'siringa', 'bisturi', 'pinza', 'stetoscopio',
      'termometro', 'sfigmomanometro', 'otoscopio', 'oftalmoscopio'
    ]
  };

  const dict = dictionaries[lang] || dictionaries.en;
  const results = [];

  for (const word of dict) {
    if (word.startsWith(fragment)) results.push(word);
  }

  if (results.length < 3) {
    for (const word of dict) {
      if (!results.includes(word) && fuzzyMatch(fragment, word)) results.push(word);
    }
  }

  if (fragment.length > 3 && !results.includes(fragment)) {
    if (dict.some(w => w === fragment)) results.unshift(fragment);
  }

  return [...new Set(results)];
}

function fuzzyMatch(fragment, word) {
  const frag = fragment.toLowerCase();
  const w = word.toLowerCase();
  if (w.startsWith(frag)) return true;
  const maxDist = Math.min(2, Math.floor(frag.length / 3));
  if (levenshteinDistance(frag, w.substring(0, frag.length)) <= maxDist) return true;
  if (levenshteinDistance(frag, w) <= maxDist + 1) return true;
  const fConsonants = frag.replace(/[aeiou]/g, '');
  const wConsonants = w.replace(/[aeiou]/g, '');
  if (fConsonants.length > 2 && wConsonants.startsWith(fConsonants)) return true;
  return false;
}

function levenshteinDistance(a, b) {
  const matrix = [];
  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b[i - 1] === a[j - 1]) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(matrix[i - 1][j - 1] + 1, matrix[i][j - 1] + 1, matrix[i - 1][j] + 1);
      }
    }
  }
  return matrix[b.length][a.length];
}

// Frasi risposte del paziente (paziente parla inglese, infermiere vede IT)
function getPatientResponses() {
  return [
    { english: 'I have pain here', italian: 'Ho dolore qui', emoji: '\u{1F623}' },
    { english: 'It hurts a lot', italian: 'Fa molto male', emoji: '\u{1F616}' },
    { english: 'I feel better', italian: 'Mi sento meglio', emoji: '\u{1F642}' },
    { english: 'I feel worse', italian: 'Mi sento peggio', emoji: '\u{1F630}' },
    { english: 'I feel nauseous', italian: 'Ho la nausea', emoji: '\u{1F922}' },
    { english: 'I need to vomit', italian: 'Devo vomitare', emoji: '\u{1F92E}' },
    { english: 'I am dizzy', italian: 'Ho le vertigini', emoji: '\u{1F635}' },
    { english: 'I cannot breathe', italian: 'Non riesco a respirare', emoji: '\u{1F624}' },
    { english: 'I am thirsty', italian: 'Ho sete', emoji: '\u{1F4A7}' },
    { english: 'I am hungry', italian: 'Ho fame', emoji: '\u{1F37D}' },
    { english: 'I am cold', italian: 'Ho freddo', emoji: '\u{1F976}' },
    { english: 'I am hot', italian: 'Ho caldo', emoji: '\u{1F975}' },
    { english: 'Yes', italian: 'S\u00ec', emoji: '\u2705' },
    { english: 'No', italian: 'No', emoji: '\u274C' },
    { english: 'I do not understand', italian: 'Non capisco', emoji: '\u{1F937}' },
    { english: 'Please repeat', italian: 'Ripeta per favore', emoji: '\u{1F504}' },
    { english: 'I am scared', italian: 'Ho paura', emoji: '\u{1F628}' },
    { english: 'Call the doctor', italian: 'Chiami il medico', emoji: '\u{1F198}' },
    { english: 'I need water', italian: 'Ho bisogno di acqua', emoji: '\u{1F6B0}' },
    { english: 'I need to use the bathroom', italian: 'Devo andare in bagno', emoji: '\u{1F6BB}' },
    { english: 'I cannot sleep', italian: 'Non riesco a dormire', emoji: '\u{1F634}' },
    { english: 'I am allergic to...', italian: 'Sono allergico a...', emoji: '\u26A0' },
    { english: 'I am diabetic', italian: 'Sono diabetico', emoji: '\u{1F489}' },
    { english: 'I have high blood pressure', italian: 'Ho la pressione alta', emoji: '\u{1F9E1}\uFE0F' },
    { english: 'I take medicine for...', italian: 'Prendo medicine per...', emoji: '\u{1F48A}' },
    { english: 'When can I go home?', italian: 'Quando posso tornare a casa?', emoji: '\u{1F3E0}' },
    { english: 'Thank you', italian: 'Grazie', emoji: '\u{1F64F}' },
    { english: 'Where is the bathroom?', italian: 'Dov\'e il bagno?', emoji: '\u{1F6BB}' },
    { english: 'Help!', italian: 'Aiuto!', emoji: '\u{1F198}' },
    { english: 'I cannot see well', italian: 'Non vedo bene', emoji: '\u{1F453}' },
    { english: 'I cannot hear well', italian: 'Non sento bene', emoji: '\u{1F9BE}' },
    { english: 'My head hurts', italian: 'Mi fa male la testa', emoji: '\u{1F915}' },
    { english: 'My neck hurts', italian: 'Mi fa male il collo', emoji: '\u{1F915}' },
    { english: 'My shoulder hurts', italian: 'Mi fa male la spalla', emoji: '\u{1F915}' },
    { english: 'My arm hurts', italian: 'Mi fa male il braccio', emoji: '\u{1F915}' },
    { english: 'My elbow hurts', italian: 'Mi fa male il gomito', emoji: '\u{1F915}' },
    { english: 'My wrist hurts', italian: 'Mi fa male il polso', emoji: '\u{1F915}' },
    { english: 'My hand hurts', italian: 'Mi fa male la mano', emoji: '\u{1F915}' },
    { english: 'My finger hurts', italian: 'Mi fa male il dito', emoji: '\u{1F915}' },
    { english: 'My chest hurts', italian: 'Mi fa male il petto', emoji: '\u{1F915}' },
    { english: 'My back hurts', italian: 'Mi fa male la schiena', emoji: '\u{1F915}' },
    { english: 'My stomach hurts', italian: 'Mi fa male la pancia', emoji: '\u{1F912}' },
    { english: 'My side hurts', italian: 'Mi fa male il fianco', emoji: '\u{1F915}' },
    { english: 'My leg hurts', italian: 'Mi fa male la gamba', emoji: '\u{1F915}' },
    { english: 'My knee hurts', italian: 'Mi fa male il ginocchio', emoji: '\u{1F915}' },
    { english: 'My ankle hurts', italian: 'Mi fa male la caviglia', emoji: '\u{1F915}' },
    { english: 'My foot hurts', italian: 'Mi fa male il piede', emoji: '\u{1F915}' },
    { english: 'Everything hurts', italian: 'Mi fa male tutto', emoji: '\u{1F629}' },
    { english: 'I have a fever', italian: 'Ho la febbre', emoji: '\u{1F321}' },
    { english: 'I am bleeding', italian: 'Sto sanguinando', emoji: '\u{1F9F9}' },
    { english: 'I fell down', italian: 'Sono caduto', emoji: '\u{1F915}' },
  ];
}

// Frasi mediche predefinite - SENZA emergenza
function getMedicalPhrases(lang, category) {
  const allPhrases = {
    it: [
      { category: 'accoglienza', text: 'Buongiorno, come si sente oggi?', translation: 'Good morning, how are you feeling today?' },
      { category: 'accoglienza', text: 'Mi chiamo [nome] e sono il suo infermiere', translation: 'My name is [name] and I am your nurse' },
      { category: 'accoglienza', text: 'Non si preoccupi, siamo qui per aiutarla', translation: "Don't worry, we are here to help you" },
      { category: 'accoglienza', text: 'Ha bisogno di qualcosa?', translation: 'Do you need anything?' },
      { category: 'accoglienza', text: 'Chiami pure se ha bisogno', translation: 'Just call if you need anything' },
      { category: 'accoglienza', text: 'Ha capito cosa le ho detto?', translation: 'Did you understand what I said?' },
      { category: 'accoglienza', text: 'Vuole che chiami un interprete?', translation: 'Would you like me to call an interpreter?' },

      { category: 'sintomi', text: 'Dove ha dolore?', translation: 'Where does it hurt?' },
      { category: 'sintomi', text: 'Da quanto tempo ha questo dolore?', translation: 'How long have you had this pain?' },
      { category: 'sintomi', text: 'Su una scala da 1 a 10, quanto è forte il dolore?', translation: 'On a scale of 1 to 10, how strong is the pain?' },
      { category: 'sintomi', text: 'Il dolore è costante o va e viene?', translation: 'Is the pain constant or does it come and go?' },
      { category: 'sintomi', text: 'Ha febbre?', translation: 'Do you have a fever?' },
      { category: 'sintomi', text: 'Ha la nausea?', translation: 'Do you feel nauseous?' },
      { category: 'sintomi', text: 'Ha vomitato?', translation: 'Have you vomited?' },
      { category: 'sintomi', text: 'Ha difficoltà a respirare?', translation: 'Do you have difficulty breathing?' },
      { category: 'sintomi', text: 'Ha la tosse?', translation: 'Do you have a cough?' },
      { category: 'sintomi', text: 'Ha avuto una ferita?', translation: 'Have you had an injury?' },
      { category: 'sintomi', text: 'Sanguina?', translation: 'Are you bleeding?' },
      { category: 'sintomi', text: 'Ha vertigini?', translation: 'Do you feel dizzy?' },
      { category: 'sintomi', text: 'Si sente debole?', translation: 'Do you feel weak?' },
      { category: 'sintomi', text: 'Ha problemi a urinare?', translation: 'Do you have trouble urinating?' },
      { category: 'sintomi', text: 'Ha avuto cambiamenti di peso?', translation: 'Have you had weight changes?' },

      { category: 'corpo', text: 'Dove sente preciso il dolore?', translation: 'Where exactly do you feel the pain?' },
      { category: 'corpo', text: 'Mi mostri con il dito dove fa male', translation: 'Show me with your finger where it hurts' },
      { category: 'corpo', text: 'Le fa male qui? (tocco)', translation: 'Does it hurt here? (touch)' },
      { category: 'corpo', text: 'Ha dolore al petto?', translation: 'Do you have chest pain?' },
      { category: 'corpo', text: 'Ha dolore alla testa?', translation: 'Do you have a headache?' },
      { category: 'corpo', text: 'Ha dolore alla pancia?', translation: 'Do you have a stomach ache?' },
      { category: 'corpo', text: 'Ha dolore alla schiena?', translation: 'Do you have back pain?' },
      { category: 'corpo', text: 'Ha dolore alle braccia o alle gambe?', translation: 'Do you have pain in your arms or legs?' },

      { category: 'cure', text: 'Devo misurarle la pressione', translation: 'I need to take your blood pressure' },
      { category: 'cure', text: 'Devo prenderle la temperatura', translation: 'I need to take your temperature' },
      { category: 'cure', text: 'Devo prelevarle il sangue', translation: 'I need to take a blood sample' },
      { category: 'cure', text: "Devo farle un'iniezione", translation: 'I need to give you an injection' },
      { category: 'cure', text: 'Deve prendere questa medicina', translation: 'You need to take this medicine' },
      { category: 'cure', text: 'Deve prendere questa pillola', translation: 'You need to take this pill' },
      { category: 'cure', text: 'Mettiamo una flebo', translation: 'We are putting in an IV' },
      { category: 'cure', text: 'Deve bere più acqua', translation: 'You need to drink more water' },
      { category: 'cure', text: 'Deve mangiare qualcosa', translation: 'You need to eat something' },
      { category: 'cure', text: 'Deve riposare', translation: 'You need to rest' },
      { category: 'cure', text: 'Dobbiamo fare una radiografia', translation: 'We need to do an X-ray' },
      { category: 'cure', text: 'Dobbiamo fare una TAC', translation: 'We need to do a CT scan' },
      { category: 'cure', text: "Dobbiamo fare un'ecografia", translation: 'We need to do an ultrasound' },
      { category: 'cure', text: 'Le mettiamo una benda', translation: 'We are putting on a bandage' },
      { category: 'cure', text: 'Dobbiamo suturare la ferita', translation: 'We need to stitch the wound' },
      { category: 'cure', text: 'Deve stare a digiuno', translation: 'You must fast (not eat)' },
      { category: 'cure', text: 'È allergico a qualche farmaco?', translation: 'Are you allergic to any medication?' },
      { category: 'cure', text: 'Prende già qualche medicina?', translation: 'Are you already taking any medicine?' },
      { category: 'cure', text: 'Ha malattie croniche? (diabete, pressione...)', translation: 'Do you have chronic diseases? (diabetes, blood pressure...)' },
      { category: 'cure', text: 'Le serve un antidolorifico?', translation: 'Do you need pain relief?' },

      { category: 'anagrafica', text: 'Come si chiama?', translation: 'What is your name?' },
      { category: 'anagrafica', text: 'Quanti anni ha?', translation: 'How old are you?' },
      { category: 'anagrafica', text: 'Ha un documento?', translation: 'Do you have an ID?' },
      { category: 'anagrafica', text: 'Sa se ha qualche allergia?', translation: 'Do you know if you have any allergies?' },
      { category: 'anagrafica', text: 'Qual è il suo gruppo sanguigno?', translation: 'What is your blood type?' },
      { category: 'anagrafica', text: 'Ha già avuto operazioni?', translation: 'Have you had any surgeries before?' },
      { category: 'anagrafica', text: 'Prende farmaci regolarmente?', translation: 'Do you take regular medication?' },
      { category: 'anagrafica', text: 'Fuma o beve alcol?', translation: 'Do you smoke or drink alcohol?' },
      { category: 'anagrafica', text: 'È incinta? (potrebbe essere?)', translation: 'Are you pregnant? (Could you be?)' },

      { category: 'rassicurazioni', text: 'Non si preoccupi, è tutto sotto controllo', translation: "Don't worry, everything is under control" },
      { category: 'rassicurazioni', text: 'Respiri lentamente, si calmi', translation: 'Breathe slowly, calm down' },
      { category: 'rassicurazioni', text: 'Va tutto bene, siamo qui con lei', translation: 'Everything is fine, we are here with you' },
      { category: 'rassicurazioni', text: 'La terapia sta funzionando', translation: 'The treatment is working' },
      { category: 'rassicurazioni', text: 'Si sta riprendendo bene', translation: 'You are recovering well' },
      { category: 'rassicurazioni', text: 'Chiameremo il medico per lei', translation: 'We will call the doctor for you' },
      { category: 'rassicurazioni', text: 'Ha fatto bene a chiamarci', translation: 'You did well to call us' },
      { category: 'rassicurazioni', text: 'Non è niente di grave', translation: "It's nothing serious" },
      { category: 'rassicurazioni', text: 'Dobbiamo solo tenerla in osservazione', translation: 'We just need to keep you under observation' },

      { category: 'dimissioni', text: 'Può tornare a casa oggi', translation: 'You can go home today' },
      { category: 'dimissioni', text: 'Deve continuare a prendere queste medicine a casa', translation: 'You need to continue taking these medicines at home' },
      { category: 'dimissioni', text: 'Torni subito se peggiora', translation: 'Come back immediately if you get worse' },
      { category: 'dimissioni', text: 'Fissiamo un appuntamento di controllo', translation: "Let's schedule a follow-up appointment" },
      { category: 'dimissioni', text: 'Deve riposare per qualche giorno', translation: 'You need to rest for a few days' },
      { category: 'dimissioni', text: 'Non deve fare sforzi', translation: 'You must not exert yourself' },
      { category: 'dimissioni', text: 'Può mangiare normalmente', translation: 'You can eat normally' },
      { category: 'dimissioni', text: 'Deve seguire una dieta leggera', translation: 'You need to follow a light diet' },

      { category: 'procedure', text: 'Devo visitarla, si spogli dalla vita in su', translation: 'I need to examine you, undress from the waist up' },
      { category: 'procedure', text: 'Devo visitarla, si spogli dalla vita in giù', translation: 'I need to examine you, undress from the waist down' },
      { category: 'procedure', text: 'Si sdrai sul lettino, per favore', translation: 'Lie down on the bed, please' },
      { category: 'procedure', text: 'Faccia un respiro profondo', translation: 'Take a deep breath' },
      { category: 'procedure', text: 'Trattenga il respiro', translation: 'Hold your breath' },
      { category: 'procedure', text: 'Tossisca, per favore', translation: 'Cough, please' },
      { category: 'procedure', text: 'Apra la bocca', translation: 'Open your mouth' },
      { category: 'procedure', text: 'Dica "aaa"', translation: 'Say "ahh"' },
      { category: 'procedure', text: 'Mi stringa la mano', translation: 'Squeeze my hand' },
      { category: 'procedure', text: 'Mi guardi negli occhi', translation: 'Look into my eyes' },
      { category: 'procedure', text: 'Segua la luce con gli occhi', translation: 'Follow the light with your eyes' },
      { category: 'procedure', text: 'Non si muova, la prego', translation: "Don't move, please" },
      { category: 'procedure', text: 'Può essere un po\' freddo/ fastidioso', translation: "It might be a bit cold/uncomfortable" },
      { category: 'procedure', text: 'Quasi finito, ancora un momento', translation: 'Almost done, just a moment more' }
    ]
  };

  const phrases = allPhrases[lang] || allPhrases.it;
  if (category && category !== 'all') {
    return phrases.filter(p => p.category === category);
  }
  return phrases;
}

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🏥 Traduttore Vocale Medico avviato su http://0.0.0.0:${PORT}`);
});
