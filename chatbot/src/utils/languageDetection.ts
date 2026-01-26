import {franc} from 'franc-min';

/**
 * Map of franc language codes to Web Speech API language codes
 */
const LANGUAGE_MAP: Record<string, string> = {
  'spa': 'es-ES', // Spanish
  'eng': 'en-US', // English
  'fra': 'fr-FR', // French
  'deu': 'de-DE', // German
  'ita': 'it-IT', // Italian
  'por': 'pt-BR', // Portuguese
  'jpn': 'ja-JP', // Japanese
  'kor': 'ko-KR', // Korean
  'cmn': 'zh-CN', // Chinese (Mandarin)
  'rus': 'ru-RU', // Russian
};

/**
 * Default language for fallback (Spanish for language learning app)
 */
const DEFAULT_LANGUAGE = 'en-US';

/**
 * Minimum text length for reliable language detection
 */
const MIN_TEXT_LENGTH = 3;

/**
 * Detects the language of the given text and returns the appropriate
 * Web Speech API language code
 *
 * @param text - The text to detect language from
 * @returns Web Speech API language code (e.g., 'es-ES', 'en-US')
 */
export function detectLanguage(text: string): string {
  if (!text || text.trim().length < MIN_TEXT_LENGTH) {
    return DEFAULT_LANGUAGE;
  }

  try {
    const detected = franc(text, { minLength: MIN_TEXT_LENGTH });

    // 'und' means undetermined/unknown language
    if (detected === 'und') {
      return DEFAULT_LANGUAGE;
    }

    // Map franc code to Web Speech API code, or use default
    return LANGUAGE_MAP[detected] || DEFAULT_LANGUAGE;
  } catch (error) {
    console.warn('Language detection failed:', error);
    return DEFAULT_LANGUAGE;
  }
}
