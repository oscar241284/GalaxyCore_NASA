export type Lang = 'en' | 'es';

const LANG_KEY = 'novacore-mision:lang';
const RESUME_KEY = 'novacore-mision:resume';

function readLang(): Lang {
  try {
    const v = localStorage.getItem(LANG_KEY);
    if (v === 'es' || v === 'en') return v;
  } catch {
  }
  return 'en';
}

export const lang: Lang = readLang();
document.documentElement.lang = lang;

export function tr<T = string>(en: T, es: T): T {
  return lang === 'es' ? es : en;
}

export const locale = tr('en-US', 'es-ES');

export interface ResumePoint {
  screen: string;
  params: Record<string, unknown>;
}

export function setLang(next: Lang, resume?: ResumePoint): void {
  if (next === lang) return;
  try {
    localStorage.setItem(LANG_KEY, next);
    if (resume) sessionStorage.setItem(RESUME_KEY, JSON.stringify(resume));
  } catch {
  }
  location.reload();
}

export function takeResume(): ResumePoint | null {
  try {
    const raw = sessionStorage.getItem(RESUME_KEY);
    sessionStorage.removeItem(RESUME_KEY);
    return raw ? (JSON.parse(raw) as ResumePoint) : null;
  } catch {
    return null;
  }
}
