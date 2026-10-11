// Every UI string, with its translations side by side. `{name}`-style
// placeholders are filled in by t(); keys used with plural() hold the forms
// separated by "|" (en: one|other, lv: zero|one|other, ru: one|few|many).
type Entry = { en: string; lv: string; ru: string };

export const STRINGS = {
  // Common
  'common.cancel': { en: 'Cancel', lv: 'Atcelt', ru: 'Отмена' },
  'common.done': { en: 'Done', lv: 'Gatavs', ru: 'Готово' },
  'common.save': { en: 'Save', lv: 'Saglabāt', ru: 'Сохранить' },
  'common.error': { en: 'Error', lv: 'Kļūda', ru: 'Ошибка' },
  'common.notChosen': { en: 'Not chosen yet', lv: 'Vēl nav izvēlēti', ru: 'Пока не выбраны' },
  'common.loveLanguages': { en: 'Love languages', lv: 'Mīlestības valodas', ru: 'Языки любви' },
  'common.interests': { en: 'Interests', lv: 'Intereses', ru: 'Интересы' },
  'common.privacy': { en: 'Privacy', lv: 'Privātums', ru: 'Конфиденциальность' },
  'common.terms': { en: 'Terms of Use', lv: 'Lietošanas noteikumi', ru: 'Условия использования' },
  'common.me': { en: 'Me', lv: 'Es', ru: 'Я' },
  'common.today': { en: 'today', lv: 'šodien', ru: 'сегодня' },
  // Used as {name} when the partner's name isn't known yet.
  'common.partnerFallback': { en: 'your partner', lv: 'partneris', ru: 'партнёра' },
  'common.partner': { en: 'Partner', lv: 'Partneris', ru: 'Партнёр' },
  'common.checkConnection': {
    en: 'Check your connection and try again.',
    lv: 'Pārbaudiet savienojumu un mēģiniet vēlreiz.',
    ru: 'Проверьте соединение и попробуйте снова.',
  },
  'common.weekdaysShort': {
    en: 'Mon|Tue|Wed|Thu|Fri|Sat|Sun',
    lv: 'P|O|T|C|Pk|S|Sv',
    ru: 'Пн|Вт|Ср|Чт|Пт|Сб|Вс',
  },

  // Plurals
  'plural.days': { en: 'day|days', lv: 'dienu|diena|dienas', ru: 'день|дня|дней' },
  'plural.inDays': { en: 'day|days', lv: 'dienām|dienas|dienām', ru: 'день|дня|дней' },
  'plural.entries': { en: 'entry|entries', lv: 'ierakstu|ieraksts|ieraksti', ru: 'запись|записи|записей' },
  'plural.words': { en: 'word|words', lv: 'vārdu|vārds|vārdi', ru: 'слово|слова|слов' },

  // Greetings
  'greeting.night': { en: 'Good night', lv: 'Labu nakti', ru: 'Доброй ночи' },
  'greeting.morning': { en: 'Good morning', lv: 'Labrīt', ru: 'Доброе утро' },
  'greeting.afternoon': { en: 'Good afternoon', lv: 'Labdien', ru: 'Добрый день' },
  'greeting.evening': { en: 'Good evening', lv: 'Labvakar', ru: 'Добрый вечер' },

  // Entry types
  'entryType.worry': { en: 'Worry', lv: 'Pārdzīvojums', ru: 'Переживание' },
  'entryType.joy': { en: 'Joy', lv: 'Prieks', ru: 'Радость' },
  'entryType.gratitude': { en: 'Gratitude', lv: 'Pateicība', ru: 'Благодарность' },
  'entryType.wish': { en: 'Wish', lv: 'Vēlēšanās', ru: 'Пожелание' },
  'entryType.thought': { en: 'Thought', lv: 'Doma', ru: 'Мысль' },

  // Emotions
  'emotion.joy': { en: 'Joy', lv: 'Prieks', ru: 'Радость' },
  'emotion.sadness': { en: 'Sadness', lv: 'Skumjas', ru: 'Грусть' },
  'emotion.irritation': { en: 'Irritation', lv: 'Aizkaitinājums', ru: 'Раздражение' },
  'emotion.anxiety': { en: 'Anxiety', lv: 'Trauksme', ru: 'Тревога' },
  'emotion.love': { en: 'Love', lv: 'Mīlestība', ru: 'Любовь' },
  'emotion.hurt': { en: 'Hurt', lv: 'Aizvainojums', ru: 'Обида' },
  'emotion.calm': { en: 'Calm', lv: 'Miers', ru: 'Спокойствие' },
  'emotion.doubt': { en: 'Doubt', lv: 'Nedrošība', ru: 'Неуверенность' },
  'emotion.gratitude': { en: 'Gratitude', lv: 'Pateicība', ru: 'Благодарность' },

  // Love languages
  'love.words': { en: 'Words of affirmation', lv: 'Atbalsta vārdi', ru: 'Слова поддержки' },
  'love.time': { en: 'Quality time', lv: 'Kopā pavadīts laiks', ru: 'Совместное время' },
  'love.gifts': { en: 'Gifts', lv: 'Dāvanas', ru: 'Подарки' },
  'love.service': { en: 'Acts of service', lv: 'Palīdzība mājās', ru: 'Помощь по дому' },
  'love.touch': { en: 'Physical touch', lv: 'Pieskārieni', ru: 'Прикосновения' },
  'love.words.desc': {
    en: 'Warm words, sincere compliments and support said out loud mean more to you than anything else.',
    lv: 'Silti vārdi, patiesi komplimenti un atbalsts, kas izteikts skaļi, jums nozīmē vairāk par visu citu.',
    ru: 'Тёплые слова, искренние комплименты и поддержка вслух значат для вас больше, чем что-либо ещё.',
  },
  'love.time.desc': {
    en: 'Your partner’s attention and time spent together without distractions are what fill you with love.',
    lv: 'Partnera uzmanība un kopā pavadīts laiks bez traucēkļiem — tas jūs piepilda ar mīlestību.',
    ru: 'Внимание партнёра и время, проведённое вместе без отвлечений, — вот что наполняет вас любовью.',
  },
  'love.gifts.desc': {
    en: 'A small, heartfelt token of attention tells you “I was thinking of you”.',
    lv: 'Neliels, no sirds sagādāts uzmanības apliecinājums jums saka: “Es domāju par tevi”.',
    ru: 'Небольшой знак внимания, сделанный от души, говорит вам «я думал(а) о тебе».',
  },
  'love.service.desc': {
    en: 'When your partner takes on chores and helps around the house, you feel cared for and supported.',
    lv: 'Kad partneris uzņemas darbus un palīdz mājas darbos, jūs jūtat rūpes un atbalstu.',
    ru: 'Когда партнёр берёт на себя дела и помогает по хозяйству, вы чувствуете заботу и поддержку.',
  },
  'love.touch.desc': {
    en: 'Hugs, touch and physical closeness are the most important way for you to feel connected.',
    lv: 'Apskāvieni, pieskārieni un fiziska tuvība jums ir svarīgākais veids, kā sajust saikni.',
    ru: 'Объятия, прикосновения и физическая близость — для вас важнейший способ почувствовать связь.',
  },
  'loveInfo.title': { en: 'What are love languages?', lv: 'Kas ir mīlestības valodas?', ru: 'Что такое языки любви?' },
  'loveInfo.intro': {
    en: 'Love languages are the ways people feel and express love. Most people have one or two main ones: knowing yours and your partner’s makes it easier to show care in a way your partner will notice.',
    lv: 'Mīlestības valodas ir veidi, kā cilvēki sajūt un izrāda mīlestību. Parasti katram ir viena vai divas galvenās: zinot savējo un partnera, ir vieglāk izrādīt rūpes tā, lai partneris tās sadzirdētu.',
    ru: 'Языки любви — это способы, которыми люди чувствуют и выражают любовь. У каждого обычно есть один-два главных: зная свой и партнёра, легче показывать заботу так, чтобы партнёр услышал.',
  },

  // Photos
  'photo.title': { en: 'Photo', lv: 'Foto', ru: 'Фото' },
  'photo.profileTitle': { en: 'Profile photo', lv: 'Profila foto', ru: 'Фото профиля' },
  'photo.take': { en: 'Take photo', lv: 'Uzņemt foto', ru: 'Сделать фото' },
  'photo.choose': { en: 'Choose from library', lv: 'Izvēlēties no galerijas', ru: 'Выбрать из галереи' },
  'photo.remove': { en: 'Remove photo', lv: 'Dzēst foto', ru: 'Удалить фото' },
  'photo.noAccess': { en: 'No access', lv: 'Nav piekļuves', ru: 'Нет доступа' },
  'photo.libraryPermission': {
    en: 'Allow photo access in Settings to choose an image.',
    lv: 'Atļaujiet piekļuvi fotoattēliem iestatījumos, lai izvēlētos attēlu.',
    ru: 'Разрешите доступ к фото в настройках, чтобы выбрать изображение.',
  },
  'photo.cameraPermission': {
    en: 'Allow camera access in Settings to take a photo.',
    lv: 'Atļaujiet piekļuvi kamerai iestatījumos, lai uzņemtu foto.',
    ru: 'Разрешите доступ к камере в настройках, чтобы сделать фото.',
  },
  'photo.tooLarge': { en: 'Photo is too large', lv: 'Foto ir pārāk liels', ru: 'Фото слишком большое' },
  'photo.tryAnother': { en: 'Try choosing another photo.', lv: 'Mēģiniet izvēlēties citu foto.', ru: 'Попробуйте выбрать другое фото.' },
  'photo.retake': { en: 'Try taking the photo again.', lv: 'Mēģiniet uzņemt foto vēlreiz.', ru: 'Попробуйте сделать снимок заново.' },

  // Tabs
  'tabs.home': { en: 'Home', lv: 'Sākums', ru: 'Главная' },
  'tabs.calendar': { en: 'Calendar', lv: 'Kalendārs', ru: 'Календарь' },
  'tabs.profile': { en: 'Profile', lv: 'Profils', ru: 'Профиль' },
  'tabs.partnerJoinedTitle': { en: 'Your partner joined! 💞', lv: 'Partneris pievienojās! 💞', ru: 'Партнёр присоединился! 💞' },
  'tabs.partnerJoinedBody': {
    en: '{name} is now with you in Together.',
    lv: '{name} tagad ir kopā ar jums lietotnē Together.',
    ru: '{name} теперь с вами в Together.',
  },

  // Welcome / auth
  'welcome.tagline': { en: 'a gentle space for two', lv: 'maiga vieta diviem', ru: 'нежное пространство для двоих' },
  'welcome.hero': {
    en: 'Write about your feelings.\nUnderstand each other.',
    lv: 'Rakstiet par sajūtām.\nSaprotiet viens otru.',
    ru: 'Пишите о чувствах.\nПонимайте друг друга.',
  },
  'welcome.title': { en: 'Welcome', lv: 'Laipni lūdzam', ru: 'Добро пожаловать' },
  'welcome.body': {
    en: 'A little care every week. No blame, no rush.',
    lv: 'Katru nedēļu — mazliet rūpju. Bez pārmetumiem, bez steigas.',
    ru: 'Каждую неделю — немного заботы. Без обвинений, без спешки.',
  },
  'auth.createAccount': { en: 'Create account', lv: 'Izveidot kontu', ru: 'Создать аккаунт' },
  'auth.signIn': { en: 'Sign in', lv: 'Pieteikties', ru: 'Войти' },
  'auth.password': { en: 'Password', lv: 'Parole', ru: 'Пароль' },
  'login.failed': {
    en: 'Couldn’t sign in. Check your connection.',
    lv: 'Neizdevās pieteikties. Pārbaudiet savienojumu.',
    ru: 'Не удалось войти. Проверьте соединение.',
  },
  'login.title': { en: 'Welcome back 🌿', lv: 'Prieks jūs atkal redzēt 🌿', ru: 'С возвращением 🌿' },
  'login.subtitle': { en: 'Good to see you again', lv: 'Priecājamies, ka esat atpakaļ', ru: 'Рады снова вас видеть' },
  'login.noAccount': { en: 'Don’t have an account?', lv: 'Nav konta?', ru: 'Нет аккаунта?' },
  'login.signUp': { en: 'Sign up', lv: 'Reģistrēties', ru: 'Зарегистрироваться' },
  'social.soonTitle': { en: 'Coming soon', lv: 'Drīzumā', ru: 'Скоро' },
  'social.soonBody': {
    en: 'Signing in with social networks is coming in a future update.',
    lv: 'Pieteikšanās ar sociālajiem tīkliem būs pieejama kādā no nākamajiem atjauninājumiem.',
    ru: 'Вход через соцсети появится в одном из следующих обновлений.',
  },
  'social.failedTitle': { en: 'Couldn’t sign in', lv: 'Neizdevās pieteikties', ru: 'Не удалось войти' },
  'social.appleNoData': {
    en: 'Apple didn’t provide sign-in details. Please try again.',
    lv: 'Apple nenodeva pieteikšanās datus. Lūdzu, mēģiniet vēlreiz.',
    ru: 'Apple не передал данные для входа. Попробуйте ещё раз.',
  },
  'social.or': { en: 'or continue with', lv: 'vai turpiniet ar', ru: 'или продолжить с' },
  'signup.failed': {
    en: 'Couldn’t create the account. Check your connection.',
    lv: 'Neizdevās izveidot kontu. Pārbaudiet savienojumu.',
    ru: 'Не удалось создать аккаунт. Проверьте соединение.',
  },
  'signup.title': { en: 'Let’s get to know you 🌷', lv: 'Iepazīsimies 🌷', ru: 'Начнём знакомство 🌷' },
  'signup.subtitle': { en: 'It takes less than a minute', lv: 'Tas aizņems mazāk par minūti', ru: 'Это займёт меньше минуты' },
  'signup.name': { en: 'Name', lv: 'Vārds', ru: 'Имя' },
  'signup.namePlaceholder': { en: 'What should we call you?', lv: 'Kā jūs saukt?', ru: 'Как вас называть?' },
  'signup.passwordPlaceholder': { en: 'At least 6 characters', lv: 'Vismaz 6 rakstzīmes', ru: 'Минимум 6 символов' },
  'signup.agreePrefix': {
    en: 'By creating an account, you agree to the',
    lv: 'Izveidojot kontu, jūs piekrītat',
    ru: 'Создавая аккаунт, вы соглашаетесь с',
  },
  'signup.terms': { en: 'terms of use', lv: 'lietošanas noteikumiem', ru: 'условиями использования' },
  'signup.and': { en: 'and', lv: 'un', ru: 'и' },
  'signup.privacy': { en: 'privacy policy', lv: 'privātuma politikai', ru: 'политикой конфиденциальности' },
  'signup.haveAccount': { en: 'Already have an account?', lv: 'Jau ir konts?', ru: 'Уже есть аккаунт?' },

  // Couple
  'couple.createFailed': { en: 'Couldn’t create a couple', lv: 'Neizdevās izveidot pāri', ru: 'Не удалось создать пару' },
  'couple.joinFailed': {
    en: 'Couldn’t join. Check the code.',
    lv: 'Neizdevās pievienoties. Pārbaudiet kodu.',
    ru: 'Не удалось присоединиться. Проверьте код.',
  },
  'couple.copyFailed': {
    en: 'Couldn’t copy the code. Use “Share”.',
    lv: 'Neizdevās nokopēt kodu. Izmantojiet “Dalīties”.',
    ru: 'Не удалось скопировать код. Используйте «Поделиться».',
  },
  'couple.shareMessage': {
    en: 'Join me on Together! Invite code: {code}',
    lv: 'Pievienojies man lietotnē Together! Ielūguma kods: {code}',
    ru: 'Присоединяйся ко мне в Together! Код приглашения: {code}',
  },
  'couple.title': { en: 'Connect your hearts 💞', lv: 'Savienojiet sirdis 💞', ru: 'Соедините сердца 💞' },
  'couple.subtitle': {
    en: 'Create a couple or join with your partner’s code',
    lv: 'Izveidojiet pāri vai pievienojieties ar partnera kodu',
    ru: 'Создайте пару или присоединитесь по коду партнёра',
  },
  'couple.create': { en: 'Create a couple', lv: 'Izveidot pāri', ru: 'Создать пару' },
  'couple.haveCode': { en: 'I have a code', lv: 'Man ir kods', ru: 'Есть код' },
  'couple.yourCode': { en: 'Your invite code', lv: 'Jūsu ielūguma kods', ru: 'Ваш код приглашения' },
  'couple.copied': { en: 'Copied!', lv: 'Nokopēts!', ru: 'Скопировано!' },
  'couple.tapToCopy': {
    en: 'Tap the code to copy it, or send it to your partner',
    lv: 'Pieskarieties kodam, lai to nokopētu, vai nosūtiet to partnerim',
    ru: 'Нажмите на код, чтобы скопировать, или отправьте его партнёру',
  },
  'couple.holdToCopy': {
    en: 'Press and hold the code to select and copy it, or send it to your partner',
    lv: 'Turiet nospiestu kodu, lai to atlasītu un nokopētu, vai nosūtiet to partnerim',
    ru: 'Зажмите код, чтобы выделить и скопировать, или отправьте его партнёру',
  },
  'couple.copy': { en: 'Copy', lv: 'Kopēt', ru: 'Скопировать' },
  'couple.share': { en: 'Share', lv: 'Dalīties', ru: 'Поделиться' },
  'couple.noCode': {
    en: 'You don’t have an invite code yet',
    lv: 'Jums vēl nav ielūguma koda',
    ru: 'У вас пока нет кода приглашения',
  },
  'couple.createCode': { en: 'Create code', lv: 'Izveidot kodu', ru: 'Создать код' },
  'couple.inviteCode': { en: 'Invite code', lv: 'Ielūguma kods', ru: 'Код приглашения' },
  'couple.continue': { en: 'Continue', lv: 'Turpināt', ru: 'Продолжить' },
  'couple.join': { en: 'Join', lv: 'Pievienoties', ru: 'Присоединиться' },
  'couple.skip': { en: 'Skip for now', lv: 'Pagaidām izlaist', ru: 'Пропустить пока' },

  // Home
  'home.notifPermissionDenied': {
    en: 'Notification permission wasn’t granted',
    lv: 'Atļauja paziņojumiem netika piešķirta',
    ru: 'Разрешение на уведомления не получено',
  },
  'home.dayChangeFailed': {
    en: 'Couldn’t change the report day',
    lv: 'Neizdevās mainīt pārskata dienu',
    ru: 'Не удалось изменить день отчёта',
  },
  'home.timeChangeFailed': {
    en: 'Couldn’t change the report time',
    lv: 'Neizdevās mainīt pārskata laiku',
    ru: 'Не удалось изменить время отчёта',
  },
  'home.notifEnableFailed': {
    en: 'Couldn’t turn on notifications. Please try again later.',
    lv: 'Neizdevās ieslēgt paziņojumus. Lūdzu, mēģiniet vēlāk.',
    ru: 'Не удалось включить уведомления. Попробуйте позже.',
  },
  'home.subGreeting': { en: 'So glad you’re here', lv: 'Cik labi, ka esat šeit', ru: 'Как хорошо, что вы здесь' },
  'home.invite': { en: 'Invite', lv: 'Uzaicināt', ru: 'Пригласить' },
  'home.partnerSoon': {
    en: '{name}’s moments open soon',
    lv: 'Drīz atvērsies notikumi: {name}',
    ru: 'Скоро откроются события {name}',
  },
  'home.untilNext': { en: 'Until the next report', lv: 'Līdz nākamajam pārskatam', ru: 'До следующего отчёта' },
  'home.hours': { en: 'hours', lv: 'stundas', ru: 'часов' },
  'home.minutes': { en: 'minutes', lv: 'minūtes', ru: 'минут' },
  'home.seconds': { en: 'seconds', lv: 'sekundes', ru: 'секунд' },
  'home.reportTitle': { en: 'Your story of the week', lv: 'Jūsu nedēļas stāsts', ru: 'Ваша история недели' },
  'home.reportPaywall': {
    en: 'Get Together Plus to receive the report',
    lv: 'Abonējiet Together Plus, lai saņemtu pārskatu',
    ru: 'Оформите Together Plus, чтобы получить отчёт',
  },
  'home.reportReady': { en: 'Ready to read 💌', lv: 'Gatavs — varat lasīt 💌', ru: 'Готово — можно прочитать 💌' },
  'home.reportScheduled': {
    en: 'Arrives on the report schedule',
    lv: 'Parādīsies pēc pārskata grafika',
    ru: 'Появится по расписанию отчёта',
  },
  'home.share': { en: 'Share an emotion', lv: 'Dalīties ar emociju', ru: 'Поделиться эмоцией' },
  'home.settingsTitle': { en: 'Report settings', lv: 'Pārskata iestatījumi', ru: 'Настройки отчёта' },
  'home.reportDay': { en: 'Report day', lv: 'Pārskata diena', ru: 'День отчёта' },
  'home.reportTime': { en: 'Report time', lv: 'Pārskata laiks', ru: 'Время отчёта' },
  'home.scheduleHint': {
    en: 'You can change the day and time up to 3 times a week',
    lv: 'Dienu un laiku var mainīt ne vairāk kā 3 reizes nedēļā',
    ru: 'Менять день и время можно не чаще 3 раз в неделю',
  },
  'home.reportNotif': { en: 'New report notification', lv: 'Paziņojums par jaunu pārskatu', ru: 'Уведомление о новом отчёте' },
  'home.reportNotifHint': {
    en: 'Sent to your phone when the report is ready',
    lv: 'Pienāks tālrunī, kad pārskats būs gatavs',
    ru: 'Придёт на телефон, когда отчёт будет готов',
  },
  'home.partnerNotif': { en: 'Partner shared', lv: 'Partneris dalījās', ru: 'Партнёр поделился' },
  'home.partnerNotifHint': {
    en: 'A notification when your partner adds an entry (no details)',
    lv: 'Paziņojums, kad partneris pievieno ierakstu (bez detaļām)',
    ru: 'Уведомление, когда партнёр добавил запись (без деталей)',
  },
  'home.journalReminder': { en: 'Journal reminder', lv: 'Atgādinājums rakstīt', ru: 'Напоминание вести дневник' },
  'home.journalReminderHint': {
    en: 'If you haven’t added any entries, we’ll remind you the day before the report',
    lv: 'Ja neesat pievienojis ierakstus, atgādināsim dienu pirms pārskata',
    ru: 'Если вы не добавляли записи — напомним за день до отчёта',
  },

  // Calendar
  'calendar.loadFailed': { en: 'Couldn’t load entries', lv: 'Neizdevās ielādēt ierakstus', ru: 'Не удалось загрузить записи' },
  'calendar.inDays': { en: 'in {n} {days}', lv: 'pēc {n} {days}', ru: 'через {n} {days}' },
  'calendar.subtitlePartner': {
    en: 'Pick a day and whose entries — yours or your partner’s',
    lv: 'Izvēlieties dienu un kura ierakstus — savus vai partnera',
    ru: 'Выберите день и кто именно — вы или партнёр',
  },
  'calendar.subtitleSolo': {
    en: 'Pick a day to see its entries',
    lv: 'Izvēlieties dienu, lai redzētu ierakstus',
    ru: 'Выберите день, чтобы увидеть записи',
  },
  'calendar.myEntries': { en: 'Your entries', lv: 'Jūsu ieraksti', ru: 'Ваши записи' },
  'calendar.partnerEntries': { en: '{name}’s entries', lv: 'Ieraksti: {name}', ru: 'Записи {name}' },
  'calendar.partnerAdded': {
    en: 'Your partner added something — it will open {when}',
    lv: 'Partneris kaut ko pievienoja — tas atvērsies {when}',
    ru: 'Партнёр кое-что добавил(а) — откроется {when}',
  },
  'calendar.partnerAddedNoDate': {
    en: 'Your partner added something — it will open later',
    lv: 'Partneris kaut ko pievienoja — tas atvērsies vēlāk',
    ru: 'Партнёр кое-что добавил(а) — откроется',
  },
  'calendar.noEntries': { en: 'No entries for this day', lv: 'Šajā dienā ierakstu nav', ru: 'Записей за этот день нет' },
  'calendar.addEntry': { en: 'Add entry', lv: 'Pievienot ierakstu', ru: 'Добавить запись' },

  // Profile
  'profile.edit': { en: 'Edit', lv: 'Rediģēt', ru: 'Редактировать' },
  'profile.pairedWith': { en: '💞 paired with {name}', lv: '💞 pārī ar {name}', ru: '💞 в паре с {name}' },
  'profile.waiting': {
    en: '⏳ waiting for your partner to join',
    lv: '⏳ gaidām, kad partneris pievienosies',
    ru: '⏳ ждём, когда партнёр присоединится',
  },
  'profile.showCode': { en: 'Show code', lv: 'Rādīt kodu', ru: 'Показать код' },
  'profile.invite': { en: '💌 invite your partner', lv: '💌 uzaicināt partneri', ru: '💌 пригласить партнёра' },
  'profile.daysTogether': { en: 'Together for {n} {days}', lv: 'Kopā jau {n} {days}', ru: 'Вместе уже {n} {days}' },
  'profile.about': { en: 'About me', lv: 'Par mani', ru: 'О себе' },
  'profile.relationshipStart': {
    en: 'Relationship start date',
    lv: 'Attiecību sākuma datums',
    ru: 'Дата начала отношений',
  },
  'profile.language': { en: 'Language', lv: 'Valoda', ru: 'Язык' },
  'profile.languageHint': {
    en: 'Reports switch to your language too. You can change it once a day.',
    lv: 'Arī pārskati pārslēgsies uz jūsu valodu. To var mainīt reizi dienā.',
    ru: 'Отчёты тоже переключатся на ваш язык. Менять его можно раз в день.',
  },
  'profile.languageFailed': {
    en: 'Couldn’t change the language',
    lv: 'Neizdevās mainīt valodu',
    ru: 'Не удалось сменить язык',
  },
  'profile.logout': { en: 'Log out', lv: 'Iziet', ru: 'Выйти' },

  // Edit profile
  'edit.title': { en: 'Edit profile', lv: 'Rediģēt profilu', ru: 'Редактировать профиль' },
  'edit.exportTitle': { en: 'My Together data', lv: 'Mani Together dati', ru: 'Мои данные Together' },
  'edit.exportFailed': {
    en: 'Couldn’t export your data. Please try again.',
    lv: 'Neizdevās eksportēt datus. Lūdzu, mēģiniet vēlreiz.',
    ru: 'Не удалось экспортировать данные. Попробуйте ещё раз.',
  },
  'edit.saveFailed': { en: 'Couldn’t save the profile', lv: 'Neizdevās saglabāt profilu', ru: 'Не удалось сохранить профиль' },
  'edit.leaveTitle': { en: 'Leave the couple?', lv: 'Izjaukt pāri?', ru: 'Убрать пару?' },
  'edit.leaveWithPartner': {
    en: 'You will no longer be paired with {name}.',
    lv: 'Jūs vairs nebūsiet pārī ar {name}.',
    ru: 'Вы перестанете быть в паре с {name}.',
  },
  'edit.leaveInvite': {
    en: 'The invitation will be cancelled and the code will stop working.',
    lv: 'Ielūgums tiks atcelts, un kods vairs nedarbosies.',
    ru: 'Приглашение будет отменено, и код перестанет действовать.',
  },
  'edit.leaveConfirm': { en: 'Leave', lv: 'Izjaukt', ru: 'Убрать' },
  'edit.leaveFailed': {
    en: 'Couldn’t leave the couple. Please try again.',
    lv: 'Neizdevās izjaukt pāri. Lūdzu, mēģiniet vēlreiz.',
    ru: 'Не удалось убрать пару. Попробуйте ещё раз.',
  },
  'edit.deleteTitle': { en: 'Delete account?', lv: 'Dzēst kontu?', ru: 'Удалить аккаунт?' },
  'edit.deleteWithPartner': {
    en: 'All your entries will be permanently deleted, and your couple with {name} will be dissolved.',
    lv: 'Visi jūsu ieraksti tiks neatgriezeniski dzēsti, un jūsu pāris ar {name} tiks izjaukts.',
    ru: 'Все ваши записи будут удалены без возможности восстановления, а ваша пара с {name} расторгнута.',
  },
  'edit.deleteSolo': {
    en: 'All your entries will be permanently deleted. This can’t be undone.',
    lv: 'Visi jūsu ieraksti tiks neatgriezeniski dzēsti. Šo darbību nevar atsaukt.',
    ru: 'Все ваши записи будут удалены без возможности восстановления. Это действие необратимо.',
  },
  'edit.deleteConfirm': { en: 'Delete forever', lv: 'Dzēst neatgriezeniski', ru: 'Удалить навсегда' },
  'edit.deleteFailed': {
    en: 'Couldn’t delete the account. Please try again.',
    lv: 'Neizdevās dzēst kontu. Lūdzu, mēģiniet vēlreiz.',
    ru: 'Не удалось удалить аккаунт. Попробуйте ещё раз.',
  },
  'edit.emojiReplace': {
    en: 'Or replace it with an emoji avatar',
    lv: 'Vai aizstājiet to ar emocijzīmes avatāru',
    ru: 'Или замените эмодзи-аватаром',
  },
  'edit.emojiChoose': { en: 'Or choose an emoji avatar', lv: 'Vai izvēlieties emocijzīmes avatāru', ru: 'Или выберите эмодзи-аватар' },
  'edit.interestPlaceholder': {
    en: 'Add an interest and tap Done',
    lv: 'Pievienojiet interesi un nospiediet Gatavs',
    ru: 'Добавить интерес и нажать Готово',
  },
  'edit.work': { en: 'Work', lv: 'Darbs', ru: 'Работа' },
  'edit.workPlaceholder': { en: 'What do you do?', lv: 'Ar ko jūs nodarbojaties?', ru: 'Кем вы работаете' },
  'edit.habits': { en: 'Habits', lv: 'Ieradumi', ru: 'Привычки' },
  'edit.habitsPlaceholder': {
    en: 'For example: I get up early, work out in the mornings…',
    lv: 'Piemēram: ceļos agri, no rītiem sportoju…',
    ru: 'Например: рано встаю, занимаюсь спортом по утрам…',
  },
  'edit.aiHint': {
    en: 'Age, work and habits help the AI read your report more accurately',
    lv: 'Vecums, darbs un ieradumi palīdz AI precīzāk analizēt jūsu pārskatu',
    ru: 'Возраст, работа и привычки помогают AI точнее разбирать ваш отчёт',
  },
  'edit.city': { en: 'City', lv: 'Pilsēta', ru: 'Город' },
  'edit.cityPlaceholder': { en: 'For example: Riga', lv: 'Piemēram: Rīga', ru: 'Например: Москва' },
  'edit.cityHint': {
    en: 'Your city’s weather will appear in the weekly report',
    lv: 'Jūsu pilsētas laikapstākļi parādīsies nedēļas pārskatā',
    ru: 'Погода вашего города появится в отчёте недели',
  },
  'edit.birthdate': { en: 'Date of birth', lv: 'Dzimšanas datums', ru: 'Дата рождения' },
  'edit.notSet': { en: 'Not set', lv: 'Nav norādīts', ru: 'Не указана' },
  'edit.couple': { en: 'Couple', lv: 'Pāris', ru: 'Пара' },
  'edit.leaveButton': { en: 'Leave the couple', lv: 'Izjaukt pāri', ru: 'Убрать пару' },
  'edit.account': { en: 'Account', lv: 'Konts', ru: 'Аккаунт' },
  'edit.exporting': { en: 'Preparing export…', lv: 'Gatavojam eksportu…', ru: 'Готовим экспорт…' },
  'edit.export': { en: 'Export my data', lv: 'Eksportēt manus datus', ru: 'Экспортировать мои данные' },
  'edit.deleteButton': { en: 'Delete account', lv: 'Dzēst kontu', ru: 'Удалить аккаунт' },

  // Entry
  'entry.photoTooLarge': {
    en: 'Photo is too large. Try choosing another one or taking it again.',
    lv: 'Foto ir pārāk liels. Mēģiniet izvēlēties citu vai uzņemt vēlreiz.',
    ru: 'Фото слишком большое. Попробуйте выбрать другое или сделать снимок заново.',
  },
  'entry.noLibrary': { en: 'No access to the photo library', lv: 'Nav piekļuves galerijai', ru: 'Нет доступа к галерее' },
  'entry.noCamera': { en: 'No access to the camera', lv: 'Nav piekļuves kamerai', ru: 'Нет доступа к камере' },
  'entry.saveFailed': { en: 'Couldn’t save the entry', lv: 'Neizdevās saglabāt ierakstu', ru: 'Не удалось сохранить запись' },
  'entry.pickEmotion': { en: 'Choose an emotion', lv: 'Izvēlieties emociju', ru: 'Выберите эмоцию' },
  'entry.addText': { en: 'Add the entry text', lv: 'Pievienojiet ieraksta tekstu', ru: 'Добавьте текст записи' },
  'entry.deleteFailed': { en: 'Couldn’t delete the entry', lv: 'Neizdevās dzēst ierakstu', ru: 'Не удалось удалить запись' },
  'entry.title': { en: 'Entry', lv: 'Ieraksts', ru: 'Запись' },
  'entry.partnerTitle': { en: '{name}’s entry', lv: 'Ieraksts: {name}', ru: 'Запись {name}' },
  'entry.editTitle': { en: 'Edit entry', lv: 'Labot ierakstu', ru: 'Изменить запись' },
  'entry.newTitle': { en: 'New entry', lv: 'Jauns ieraksts', ru: 'Новая запись' },
  'entry.create': { en: 'Create', lv: 'Izveidot', ru: 'Создать' },
  'entry.loadFailed': {
    en: 'Couldn’t load the entry — it’s unavailable or there was a network error. Please try again.',
    lv: 'Neizdevās ielādēt ierakstu — tas nav pieejams vai radās tīkla kļūda. Lūdzu, mēģiniet vēlreiz.',
    ru: 'Не удалось загрузить запись — она недоступна или произошла ошибка сети. Попробуйте ещё раз.',
  },
  'entry.partnerReadOnly': {
    en: '💌 {name}’s entry — view only',
    lv: '💌 Ieraksts: {name} — tikai apskatei',
    ru: '💌 Запись {name} — доступна только для просмотра',
  },
  'entry.lockedReadOnly': {
    en: '🔒 This entry is already part of a report and is now view-only — it can’t be edited or deleted',
    lv: '🔒 Šis ieraksts jau ir iekļauts pārskatā un tagad ir tikai apskatei — to nevar labot vai dzēst',
    ru: '🔒 Эта запись уже вошла в отчёт и теперь доступна только для просмотра — изменить или удалить её нельзя',
  },
  'entry.placeholder': { en: 'Tell us how you feel…', lv: 'Pastāstiet, ko jūtat…', ru: 'Расскажите, что вы чувствуете…' },
  'entry.privacyNote': {
    en: '🔒 Only you can see this — until the weekly report',
    lv: '🔒 To redzēsiet tikai jūs — līdz nedēļas pārskatam',
    ru: '🔒 Увидите только вы — до недельного отчёта',
  },
  'entry.loading': { en: 'Loading…', lv: 'Ielādē…', ru: 'Загрузка…' },
  'entry.addPhoto': { en: 'Add photo', lv: 'Pievienot foto', ru: 'Добавить фото' },
  'entry.emotion': { en: 'Emotion', lv: 'Emocija', ru: 'Эмоция' },

  // Notifications
  'notifications.title': { en: 'Notifications', lv: 'Paziņojumi', ru: 'Уведомления' },
  'notifications.empty': { en: 'No notifications yet', lv: 'Paziņojumu vēl nav', ru: 'Пока нет уведомлений' },

  // History
  'history.loadFailed': { en: 'Couldn’t load history', lv: 'Neizdevās ielādēt vēsturi', ru: 'Не удалось загрузить историю' },
  'history.title': { en: 'Past weeks', lv: 'Iepriekšējās nedēļas', ru: 'Прошлые недели' },
  'history.empty': { en: 'No reports yet', lv: 'Pārskatu vēl nav', ru: 'Пока нет ни одного отчёта' },

  // Report summary
  'summary.busiestDay': {
    en: 'The busiest day — {day}: {n} {entries}',
    lv: 'Aktīvākā diena — {day}: {n} {entries}',
    ru: 'Самый насыщенный день — {day}: {n} {entries}',
  },
  'summary.sameDay': {
    en: 'You both wrote on the same {n} {days} this week',
    lv: 'Šonedēļ jūs abi rakstījāt vienās dienās: {n} {days}',
    ru: 'Вы писали в один и тот же день {n} {days} на этой неделе',
  },
  'summary.longestYou': {
    en: 'The most detailed entry is yours — {n} {words}',
    lv: 'Detalizētākais ieraksts ir jūsu — {n} {words}',
    ru: 'Самая подробная запись — у вас, {n} {words}',
  },
  'summary.longestPartner': {
    en: 'The most detailed entry is {name}’s — {n} {words}',
    lv: 'Detalizētākais ieraksts — {name}, {n} {words}',
    ru: 'Самая подробная запись — у {name}, {n} {words}',
  },
  'summary.atNight': { en: 'at night', lv: 'naktī', ru: 'ночью' },
  'summary.inMorning': { en: 'in the morning', lv: 'no rīta', ru: 'утром' },
  'summary.inAfternoon': { en: 'in the afternoon', lv: 'dienā', ru: 'днём' },
  'summary.inEvening': { en: 'in the evening', lv: 'vakarā', ru: 'вечером' },
  'summary.bothWroteMost': {
    en: 'You both wrote most often {when}',
    lv: 'Visbiežāk jūs abi rakstījāt {when}',
    ru: 'Чаще всего вы оба писали {when}',
  },
  'summary.youShareMost': {
    en: 'You share most often {when}',
    lv: 'Visbiežāk jūs dalāties {when}',
    ru: 'Вы чаще всего делитесь {when}',
  },
  'summary.generateFailed': {
    en: 'Couldn’t generate the report',
    lv: 'Neizdevās izveidot pārskatu',
    ru: 'Не удалось сгенерировать отчёт',
  },
  'summary.loadFailed': { en: 'Couldn’t load the report', lv: 'Neizdevās ielādēt pārskatu', ru: 'Не удалось загрузить отчёт' },
  'summary.report': { en: 'Report', lv: 'Pārskats', ru: 'Отчёт' },
  'summary.emptyTitle': { en: 'No report yet', lv: 'Pārskata vēl nav', ru: 'Отчёта пока нет' },
  'summary.emptyBody': {
    en: 'The AI will put together the story of your week automatically, on the day and time set in the report settings',
    lv: 'AI automātiski apkopos nedēļas stāstu dienā un laikā, kas norādīts pārskata iestatījumos',
    ru: 'AI соберёт историю недели автоматически, в день и час, указанные в настройках отчёта',
  },
  'summary.generating': { en: 'Generating…', lv: 'Veidojam…', ru: 'Генерируем…' },
  'summary.generateTest': { en: '🧪 Generate (test)', lv: '🧪 Izveidot (tests)', ru: '🧪 Сгенерировать (тест)' },
  'summary.regenerateTest': { en: 'Regenerate (test)', lv: 'Izveidot no jauna (tests)', ru: 'Перегенерировать (тест)' },
  'summary.entriesThisPeriod': {
    en: '{n} {entries} in this period',
    lv: '{n} {entries} šajā periodā',
    ru: '{n} {entries} за этот период',
  },
  'summary.collapse': { en: 'Show less', lv: 'Rādīt mazāk', ru: 'Свернуть' },
  'summary.expand': { en: 'Show more', lv: 'Rādīt vairāk', ru: 'Показать подробнее' },
  'summary.insight': { en: 'We noticed a coincidence', lv: 'Pamanījām sakritību', ru: 'Заметили совпадение' },
  'summary.appreciation': { en: 'A moment of gratitude', lv: 'Pateicības mirklis', ru: 'Момент благодарности' },
  'summary.loveMap': { en: 'Maybe you didn’t know', lv: 'Varbūt jūs nezinājāt', ru: 'Может быть, вы не знали' },
  'summary.palette': { en: 'The week’s emotional palette', lv: 'Nedēļas emociju palete', ru: 'Эмоциональная палитра недели' },
  'summary.moodByDay': { en: 'Mood by day', lv: 'Noskaņojums pa dienām', ru: 'Настроение по дням' },
  'summary.lighter': { en: 'lighter, calmer', lv: 'gaišāk, mierīgāk', ru: 'светлее, спокойнее' },
  'summary.heavier': { en: 'heavier, more anxious', lv: 'smagāk, trauksmaināk', ru: 'тяжелее, тревожнее' },
  'summary.facts': { en: 'Fun facts', lv: 'Interesanti fakti', ru: 'Любопытные факты' },
  'summary.whoWrote': { en: 'Who wrote how much', lv: 'Kurš cik rakstīja', ru: 'Кто сколько писал' },
  'summary.rowEntries': { en: 'Entries', lv: 'Ieraksti', ru: 'Записи' },
  'summary.rowWords': { en: 'Words', lv: 'Vārdi', ru: 'Слов' },
  'summary.rowPhotos': { en: 'Photos', lv: 'Foto', ru: 'Фото' },
  'summary.rowMood': { en: 'Mood', lv: 'Noskaņojums', ru: 'Настроение' },

  // Paywall / premium
  'paywall.feature1': {
    en: 'A weekly AI review of your week together',
    lv: 'Iknedēļas AI pārskats par jūsu kopīgo nedēļu',
    ru: 'Еженедельный AI-разбор вашей недели вдвоём',
  },
  'paywall.feature2': { en: 'Unlimited entries and photos', lv: 'Neierobežoti ieraksti un foto', ru: 'Безлимитные записи и фото' },
  'paywall.feature3': { en: 'Flexible report schedule', lv: 'Elastīgs pārskata grafiks', ru: 'Гибкое расписание отчёта' },
  'paywall.year': { en: 'Year', lv: 'Gads', ru: 'Год' },
  'paywall.month': { en: 'Month', lv: 'Mēnesis', ru: 'Месяц' },
  'paywall.subtitle': {
    en: 'Your free report has been used — subscribe to get one every week',
    lv: 'Jūsu bezmaksas pārskats ir izmantots — abonējiet, lai to saņemtu katru nedēļu',
    ru: 'Ваш бесплатный отчёт закончился — оформите подписку, чтобы получать его каждую неделю',
  },
  'paywall.loading': { en: 'Loading plans…', lv: 'Ielādējam plānus…', ru: 'Загружаем тарифы…' },
  'paywall.bestValue': { en: 'Best value', lv: 'Izdevīgāk', ru: 'Выгоднее' },
  'paywall.subscribe': { en: 'Subscribe', lv: 'Abonēt', ru: 'Оформить подписку' },
  'paywall.restore': { en: 'Restore purchases', lv: 'Atjaunot pirkumus', ru: 'Восстановить покупки' },
  'paywall.legal': {
    en: 'The subscription renews automatically unless cancelled at least 24 hours before the end of the current period. You can manage it in your Apple ID settings.',
    lv: 'Abonements tiek automātiski atjaunots, ja vien tas netiek atcelts vismaz 24 stundas pirms pašreizējā perioda beigām. To var pārvaldīt Apple ID iestatījumos.',
    ru: 'Подписка автоматически продлевается, если не отменена как минимум за 24 часа до конца текущего периода. Управлять подпиской можно в настройках Apple ID.',
  },
  'premium.purchaseFailed': {
    en: 'Couldn’t complete the subscription. Please try again.',
    lv: 'Neizdevās noformēt abonementu. Lūdzu, mēģiniet vēlreiz.',
    ru: 'Не удалось оформить подписку. Попробуйте ещё раз.',
  },
  'premium.noActive': {
    en: 'No active subscription was found for this Apple ID.',
    lv: 'Šim Apple ID netika atrasts aktīvs abonements.',
    ru: 'Активная подписка не найдена для этого Apple ID.',
  },
  'premium.restoreFailed': {
    en: 'Couldn’t restore purchases.',
    lv: 'Neizdevās atjaunot pirkumus.',
    ru: 'Не удалось восстановить покупки.',
  },
} satisfies Record<string, Entry>;

export type StringKey = keyof typeof STRINGS;
