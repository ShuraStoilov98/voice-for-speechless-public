export type Locale = 'en' | 'bg';
export const locales = {
  en: {
    language: 'English', title: 'Voice for Speechless', greeting: 'What would you like to say?',
    speak: 'Speak', stop: 'Stop', clear: 'Clear message', message: 'Your message', placeholder: 'Write a message...',
    quick: 'Quick phrases', suggestions: 'Next words', demo: 'Demo voice', connected: 'Personal voice',
    settings: 'Voice settings', close: 'Close settings', languageLabel: 'Language', mode: 'Voice',
    url: 'Backend URL', token: 'Installation credential', save: 'Save connection', saved: 'Connection saved',
    forget: 'Forget connection', predictions: 'Word suggestions',
    predictionNotice: 'When enabled, typed text is sent to your backend and Anthropic for suggestions.',
    connectedNotice: 'Messages are sent to your backend and ElevenLabs to generate speech.',
    webNotice: 'In browsers, the credential stays in memory and is cleared on reload.',
    error: 'Speech unavailable. Check your connection and try again.',
    noVoice: 'No voice is installed for this language. Install one in device settings or choose another language.',
    noConnection: 'Add a backend URL and installation credential in Voice settings.',
    urlError: 'Use an HTTPS URL. Local HTTP is allowed only in development.',
    tokenError: 'Enter a 64-character installation credential.',
    limitError: 'Usage limit reached. Try again later or contact the backend owner.',
    authError: 'Connection authorization failed. Update your installation credential.',
    demoHint: 'System voice', working: 'Preparing speech...', speaking: 'Speaking', ready: 'Ready',
    phraseList: ['Yes', 'No', 'I need water', 'Please help me', 'I am in pain', 'Thank you', 'I love you', 'I need a rest', 'Call a nurse', 'I am cold', 'I am warm']
  },
  bg: {
    language: 'Български', title: 'Глас без думи', greeting: 'Какво искате да кажете?',
    speak: 'Говори', stop: 'Спри', clear: 'Изчисти съобщението', message: 'Вашето съобщение', placeholder: 'Напишете съобщение...',
    quick: 'Бързи фрази', suggestions: 'Следващи думи', demo: 'Демо глас', connected: 'Личен глас',
    settings: 'Настройки на гласа', close: 'Затвори настройките', languageLabel: 'Език', mode: 'Глас',
    url: 'Адрес на сървъра', token: 'Ключ за инсталацията', save: 'Запази връзката', saved: 'Връзката е запазена',
    forget: 'Забрави връзката', predictions: 'Предложения за думи',
    predictionNotice: 'Когато са включени, текстът се изпраща до вашия сървър и Anthropic за предложения.',
    connectedNotice: 'Съобщенията се изпращат до вашия сървър и ElevenLabs за създаване на реч.',
    webNotice: 'В браузър ключът остава в паметта и се изчиства при презареждане.',
    error: 'Гласът не е достъпен. Проверете връзката и опитайте отново.',
    noVoice: 'Няма инсталиран глас за този език. Добавете глас от настройките на устройството или изберете друг език.',
    noConnection: 'Добавете адрес на сървъра и ключ за инсталацията в настройките.',
    urlError: 'Използвайте HTTPS адрес. Локален HTTP е разрешен само при разработка.',
    tokenError: 'Въведете ключ за инсталацията от 64 знака.',
    limitError: 'Лимитът е достигнат. Опитайте по-късно или се свържете със собственика на сървъра.',
    authError: 'Достъпът е отказан. Обновете ключа за инсталацията.',
    demoHint: 'Системен глас', working: 'Подготвя се реч...', speaking: 'Говори', ready: 'Готово',
    phraseList: ['Да', 'Не', 'Искам вода', 'Помогнете ми', 'Боли ме', 'Благодаря', 'Обичам те', 'Искам почивка', 'Повикайте медицинска сестра', 'Студено ми е', 'Топло ми е']
  }
} as const;
