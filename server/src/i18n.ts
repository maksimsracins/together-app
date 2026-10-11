import { Request } from 'express';
import { Locale } from 'date-fns';
import { enUS, lv as lvLocale, ru as ruLocale } from 'date-fns/locale';

export const LANGUAGES = ['ru', 'en', 'lv'] as const;
export type Lang = (typeof LANGUAGES)[number];

// Existing users and app builds from before multi-language support were
// Russian-only -- anything missing or unrecognized falls back to that, so an
// old client keeps seeing exactly what it always did.
export const DEFAULT_LANG: Lang = 'ru';

export function isLang(value: unknown): value is Lang {
  return typeof value === 'string' && (LANGUAGES as readonly string[]).includes(value);
}

export function normalizeLang(value: unknown): Lang {
  return isLang(value) ? value : DEFAULT_LANG;
}

// The client sends its current UI language explicitly rather than relying on
// Accept-Language: iOS fills that header in from the *device* locale on its
// own, which would flip error messages to English for a Russian-UI build
// running on an English-language phone.
export const LANG_HEADER = 'x-app-language';

export function langOf(req: Request): Lang {
  return normalizeLang(req.headers[LANG_HEADER]);
}

export const DATE_LOCALES: Record<Lang, Locale> = { ru: ruLocale, en: enUS, lv: lvLocale };

const ru = {
  nameTooLong: 'Имя не может быть длиннее {max} символов',
  invalidPhotoFormat: 'Некорректный формат фото',
  photoTooLarge: 'Фото слишком большое',
  userNotFound: 'Пользователь не найден',
  signupFieldsRequired: 'email, password и name обязательны',
  passwordTooShort: 'Пароль должен быть не короче 6 символов',
  emailTaken: 'Пользователь с таким email уже существует',
  loginFieldsRequired: 'email и password обязательны',
  invalidCredentials: 'Неверный email или пароль',
  identityTokenRequired: 'identityToken обязателен',
  appleTokenInvalid: 'Не удалось проверить Apple identity token',
  appleNoEmail: 'Apple не передал email для регистрации',
  defaultUserName: 'Пользователь',
  tooManyAttempts: 'Слишком много попыток. Попробуйте позже.',
  tooManyReportRequests: 'Слишком много запросов на генерацию отчёта. Попробуйте позже.',
  codeRequired: 'code обязателен',
  inviteNotFound: 'Код приглашения не найден',
  alreadyInCouple: 'Вы уже состоите в паре',
  coupleFull: 'В этой паре уже два участника',
  notInCouple: 'Вы не состоите в паре',
  invalidWeekday: 'Некорректный день недели',
  invalidTime: 'Некорректное время',
  scheduleChangeLimit: 'Вы уже меняли время отчёта 3 раза за последние 7 дней. Попробуйте позже.',
  invalidEntryType: 'Некорректный тип записи',
  invalidEmotion: 'Некорректная эмоция',
  entryTextRequired: 'Текст записи обязателен',
  entryTextTooLong: 'Текст не может быть длиннее 1000 символов',
  entryNotFound: 'Запись не найдена',
  entryLockedEdit: 'Эта запись уже вошла в отчёт — изменить её нельзя',
  entryLockedDelete: 'Эта запись уже вошла в отчёт — удалить её нельзя',
  notificationNotFound: 'Уведомление не найдено',
  coupleNotFound: 'Пара не найдена',
  reportNotFound: 'Отчёт не найден',
  reportNeedsEntry: 'Добавьте хотя бы одну запись, чтобы получить отчёт',
  reportLimitReached: 'Бесплатные отчёты закончились. Оформите подписку Together Plus.',
  reportGenerationFailed: 'Не удалось сгенерировать отчёт',
  partnerFallbackName: 'Партнёр',
  unsupportedLanguage: 'Неподдерживаемый язык',
  languageChangeLimit: 'Язык можно менять не чаще одного раза в день',

  notifPartnerDeletedAccount: '{name} удалил(а) свой аккаунт в Together. Ваша пара расторгнута.',
  notifPartnerJoined: '{name} присоединил(-ась) к вам в Together 💞',
  notifPartnerLeft: '{name} покинул(а) вашу пару в Together.',
  notifPartnerEntry: '{name} поделился(-ась) чем-то новым 💌',
  notifReportReady: 'Ваш новый отчёт готов 💞',
  notifJournalReminder: 'Вы ещё не делились впечатлениями на этой неделе — поделитесь, пока не поздно 🌿',
  notifSettingsChanged: '{name} изменил(а) настройки отчёта: {changes}.',
  changeWeekday: 'день отчёта на {day}',
  changeHour: 'время отчёта на {hour}:00',
  changeReportNotifications: 'уведомление о новом отчёте ({state})',
  changePartnerNotifications: 'уведомление «партнёр поделился» ({state})',
  stateOn: 'включено',
  stateOff: 'выключено',
};

type Messages = typeof ru;
export type MessageKey = keyof Messages;

const en: Messages = {
  nameTooLong: 'Name can’t be longer than {max} characters',
  invalidPhotoFormat: 'Invalid photo format',
  photoTooLarge: 'Photo is too large',
  userNotFound: 'User not found',
  signupFieldsRequired: 'email, password and name are required',
  passwordTooShort: 'Password must be at least 6 characters',
  emailTaken: 'An account with this email already exists',
  loginFieldsRequired: 'email and password are required',
  invalidCredentials: 'Incorrect email or password',
  identityTokenRequired: 'identityToken is required',
  appleTokenInvalid: 'Couldn’t verify the Apple identity token',
  appleNoEmail: 'Apple didn’t share an email to sign up with',
  defaultUserName: 'User',
  tooManyAttempts: 'Too many attempts. Please try again later.',
  tooManyReportRequests: 'Too many report requests. Please try again later.',
  codeRequired: 'code is required',
  inviteNotFound: 'Invite code not found',
  alreadyInCouple: 'You’re already in a couple',
  coupleFull: 'This couple already has two members',
  notInCouple: 'You’re not in a couple',
  invalidWeekday: 'Invalid day of the week',
  invalidTime: 'Invalid time',
  scheduleChangeLimit: 'You’ve already changed the report time 3 times in the last 7 days. Please try again later.',
  invalidEntryType: 'Invalid entry type',
  invalidEmotion: 'Invalid emotion',
  entryTextRequired: 'Entry text is required',
  entryTextTooLong: 'Text can’t be longer than 1000 characters',
  entryNotFound: 'Entry not found',
  entryLockedEdit: 'This entry is already part of a report and can’t be edited',
  entryLockedDelete: 'This entry is already part of a report and can’t be deleted',
  notificationNotFound: 'Notification not found',
  coupleNotFound: 'Couple not found',
  reportNotFound: 'Report not found',
  reportNeedsEntry: 'Add at least one entry to get a report',
  reportLimitReached: 'You’ve used all your free reports. Subscribe to Together Plus to continue.',
  reportGenerationFailed: 'Couldn’t generate the report',
  partnerFallbackName: 'Partner',
  unsupportedLanguage: 'Unsupported language',
  languageChangeLimit: 'You can change the language once a day',

  notifPartnerDeletedAccount: '{name} deleted their Together account. Your couple has been dissolved.',
  notifPartnerJoined: '{name} joined you on Together 💞',
  notifPartnerLeft: '{name} left your couple on Together.',
  notifPartnerEntry: '{name} shared something new 💌',
  notifReportReady: 'Your new report is ready 💞',
  notifJournalReminder: 'You haven’t shared anything this week yet — there’s still time 🌿',
  notifSettingsChanged: '{name} changed the report settings: {changes}.',
  changeWeekday: 'report day to {day}',
  changeHour: 'report time to {hour}:00',
  changeReportNotifications: 'new report notification ({state})',
  changePartnerNotifications: '“partner shared” notification ({state})',
  stateOn: 'on',
  stateOff: 'off',
};

const lv: Messages = {
  nameTooLong: 'Vārds nevar būt garāks par {max} rakstzīmēm',
  invalidPhotoFormat: 'Nederīgs foto formāts',
  photoTooLarge: 'Foto ir pārāk liels',
  userNotFound: 'Lietotājs nav atrasts',
  signupFieldsRequired: 'email, password un name ir obligāti',
  passwordTooShort: 'Parolei jābūt vismaz 6 rakstzīmes garai',
  emailTaken: 'Lietotājs ar šādu e-pastu jau eksistē',
  loginFieldsRequired: 'email un password ir obligāti',
  invalidCredentials: 'Nepareizs e-pasts vai parole',
  identityTokenRequired: 'identityToken ir obligāts',
  appleTokenInvalid: 'Neizdevās pārbaudīt Apple identity token',
  appleNoEmail: 'Apple nenodeva e-pastu reģistrācijai',
  defaultUserName: 'Lietotājs',
  tooManyAttempts: 'Pārāk daudz mēģinājumu. Lūdzu, mēģiniet vēlāk.',
  tooManyReportRequests: 'Pārāk daudz pārskata pieprasījumu. Lūdzu, mēģiniet vēlāk.',
  codeRequired: 'code ir obligāts',
  inviteNotFound: 'Ielūguma kods nav atrasts',
  alreadyInCouple: 'Jūs jau esat pārī',
  coupleFull: 'Šajā pārī jau ir divi dalībnieki',
  notInCouple: 'Jūs neesat pārī',
  invalidWeekday: 'Nederīga nedēļas diena',
  invalidTime: 'Nederīgs laiks',
  scheduleChangeLimit: 'Jūs jau 3 reizes pēdējo 7 dienu laikā mainījāt pārskata laiku. Lūdzu, mēģiniet vēlāk.',
  invalidEntryType: 'Nederīgs ieraksta veids',
  invalidEmotion: 'Nederīga emocija',
  entryTextRequired: 'Ieraksta teksts ir obligāts',
  entryTextTooLong: 'Teksts nevar būt garāks par 1000 rakstzīmēm',
  entryNotFound: 'Ieraksts nav atrasts',
  entryLockedEdit: 'Šis ieraksts jau ir iekļauts pārskatā — to vairs nevar labot',
  entryLockedDelete: 'Šis ieraksts jau ir iekļauts pārskatā — to vairs nevar dzēst',
  notificationNotFound: 'Paziņojums nav atrasts',
  coupleNotFound: 'Pāris nav atrasts',
  reportNotFound: 'Pārskats nav atrasts',
  reportNeedsEntry: 'Pievienojiet vismaz vienu ierakstu, lai saņemtu pārskatu',
  reportLimitReached: 'Bezmaksas pārskati ir beigušies. Abonējiet Together Plus.',
  reportGenerationFailed: 'Neizdevās izveidot pārskatu',
  partnerFallbackName: 'Partneris',
  unsupportedLanguage: 'Neatbalstīta valoda',
  languageChangeLimit: 'Valodu var mainīt ne biežāk kā reizi dienā',

  notifPartnerDeletedAccount: '{name} izdzēsa savu Together kontu. Jūsu pāris ir izjukis.',
  notifPartnerJoined: '{name} pievienojās jums lietotnē Together 💞',
  notifPartnerLeft: '{name} pameta jūsu pāri lietotnē Together.',
  notifPartnerEntry: '{name} dalījās ar kaut ko jaunu 💌',
  notifReportReady: 'Jūsu jaunais pārskats ir gatavs 💞',
  notifJournalReminder: 'Šonedēļ jūs vēl neesat dalījies iespaidos — vēl nav par vēlu 🌿',
  notifSettingsChanged: '{name} mainīja pārskata iestatījumus: {changes}.',
  changeWeekday: 'pārskata diena — {day}',
  changeHour: 'pārskata laiks — {hour}:00',
  changeReportNotifications: 'paziņojums par jaunu pārskatu ({state})',
  changePartnerNotifications: 'paziņojums «partneris dalījās» ({state})',
  stateOn: 'ieslēgts',
  stateOff: 'izslēgts',
};

const MESSAGES: Record<Lang, Messages> = { ru, en, lv };

export function t(lang: Lang, key: MessageKey, params?: Record<string, string | number>): string {
  const template = MESSAGES[lang][key] ?? MESSAGES[DEFAULT_LANG][key];
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (match, name: string) =>
    params[name] !== undefined ? String(params[name]) : match
  );
}

// ISO weekday 1=Mon..7=Sun, matching the Couple schema.
const WEEKDAY_NAMES: Record<Lang, string[]> = {
  ru: ['', 'понедельник', 'вторник', 'среда', 'четверг', 'пятница', 'суббота', 'воскресенье'],
  en: ['', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
  lv: ['', 'pirmdiena', 'otrdiena', 'trešdiena', 'ceturtdiena', 'piektdiena', 'sestdiena', 'svētdiena'],
};

export function weekdayName(lang: Lang, isoWeekday: number): string {
  return WEEKDAY_NAMES[lang][isoWeekday] ?? '';
}
