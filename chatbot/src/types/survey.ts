// Enums matching GraphQL schema (schema.ts)
// Target languages - languages the app supports for learning
export enum Language {
  ENGLISH = 'ENGLISH',
  KOREAN = 'KOREAN',
  SPANISH = 'SPANISH'
}

// Native languages - common languages users might speak
export enum NativeLanguage {
  ARABIC = 'ARABIC',
  BENGALI = 'BENGALI',
  CANTONESE = 'CANTONESE',
  DUTCH = 'DUTCH',
  ENGLISH = 'ENGLISH',
  FRENCH = 'FRENCH',
  GERMAN = 'GERMAN',
  GREEK = 'GREEK',
  HINDI = 'HINDI',
  INDONESIAN = 'INDONESIAN',
  ITALIAN = 'ITALIAN',
  JAPANESE = 'JAPANESE',
  KOREAN = 'KOREAN',
  MANDARIN = 'MANDARIN',
  PERSIAN = 'PERSIAN',
  POLISH = 'POLISH',
  PORTUGUESE = 'PORTUGUESE',
  PUNJABI = 'PUNJABI',
  RUSSIAN = 'RUSSIAN',
  SPANISH = 'SPANISH',
  SWAHILI = 'SWAHILI',
  TAGALOG = 'TAGALOG',
  TAMIL = 'TAMIL',
  THAI = 'THAI',
  TURKISH = 'TURKISH',
  UKRAINIAN = 'UKRAINIAN',
  URDU = 'URDU',
  VIETNAMESE = 'VIETNAMESE',
  OTHER = 'OTHER'
}

export enum ProficiencyLevel {
  BEGINNER = 'BEGINNER',
  ELEMENTARY = 'ELEMENTARY',
  INTERMEDIATE = 'INTERMEDIATE',
  UPPER_INTERMEDIATE = 'UPPER_INTERMEDIATE',
  ADVANCED = 'ADVANCED',
  NATIVE = 'NATIVE'
}

export enum Interests {
  FOOD = 'FOOD',
  DAILY_LIFE = 'DAILY_LIFE',
  TRAVEL = 'TRAVEL',
  HEALTH = 'HEALTH',
  WORK = 'WORK',
  SCHOOL = 'SCHOOL',
  TECHNOLOGY = 'TECHNOLOGY',
  HOBBY = 'HOBBY',
  EMOTION = 'EMOTION',
  SOCIAL_MEDIA = 'SOCIAL_MEDIA',
  CULTURE = 'CULTURE',
  MUSIC = 'MUSIC',
  ENTERTAINMENT = 'ENTERTAINMENT',
  OPINION = 'OPINION'
}

export enum CorrectionStyle {
  ALWAYS = 'ALWAYS',
  EXPLANATION = 'EXPLANATION',
  MAJOR_ERRORS = 'MAJOR_ERRORS',
  REPEAT = 'REPEAT',
  NEVER = 'NEVER'
}

// Interface for each target language entry
export interface TargetLanguageData {
  targetLanguage: Language;
  proficiencyLevel: ProficiencyLevel;
  learningGoals: string;
}

// Interface matching UserProfile from GraphQL schema
export interface SurveyData {
  // User section
  introduction: string;
  interests: Interests[];
  additionalInterests: string[];
  nativeLanguage: NativeLanguage;
  correctionStyle: CorrectionStyle;
  // Languages section (array for multiple languages)
  targetLanguages: TargetLanguageData[];
}

// Helper type for form state - single language entry
export interface TargetLanguageFormState {
  targetLanguage: string;
  proficiencyLevel: string;
  learningGoals: string;
}

// Helper type for form state
export interface SurveyFormState {
  introduction: string;
  interests: Interests[];
  additionalInterests: string;
  nativeLanguage: string;
  correctionStyle: string;
  targetLanguages: TargetLanguageFormState[];
}

// Helper function to convert enum values to display labels
export const getLanguageLabel = (lang: Language): string => {
  const labels: Record<Language, string> = {
    [Language.ENGLISH]: 'English',
    [Language.KOREAN]: 'Korean',
    [Language.SPANISH]: 'Spanish',
  };
  return labels[lang];
};

export const getNativeLanguageLabel = (lang: NativeLanguage): string => {
  const labels: Record<NativeLanguage, string> = {
    [NativeLanguage.ARABIC]: 'Arabic',
    [NativeLanguage.BENGALI]: 'Bengali',
    [NativeLanguage.CANTONESE]: 'Cantonese',
    [NativeLanguage.DUTCH]: 'Dutch',
    [NativeLanguage.ENGLISH]: 'English',
    [NativeLanguage.FRENCH]: 'French',
    [NativeLanguage.GERMAN]: 'German',
    [NativeLanguage.GREEK]: 'Greek',
    [NativeLanguage.HINDI]: 'Hindi',
    [NativeLanguage.INDONESIAN]: 'Indonesian',
    [NativeLanguage.ITALIAN]: 'Italian',
    [NativeLanguage.JAPANESE]: 'Japanese',
    [NativeLanguage.KOREAN]: 'Korean',
    [NativeLanguage.MANDARIN]: 'Mandarin Chinese',
    [NativeLanguage.PERSIAN]: 'Persian (Farsi)',
    [NativeLanguage.POLISH]: 'Polish',
    [NativeLanguage.PORTUGUESE]: 'Portuguese',
    [NativeLanguage.PUNJABI]: 'Punjabi',
    [NativeLanguage.RUSSIAN]: 'Russian',
    [NativeLanguage.SPANISH]: 'Spanish',
    [NativeLanguage.SWAHILI]: 'Swahili',
    [NativeLanguage.TAGALOG]: 'Tagalog (Filipino)',
    [NativeLanguage.TAMIL]: 'Tamil',
    [NativeLanguage.THAI]: 'Thai',
    [NativeLanguage.TURKISH]: 'Turkish',
    [NativeLanguage.UKRAINIAN]: 'Ukrainian',
    [NativeLanguage.URDU]: 'Urdu',
    [NativeLanguage.VIETNAMESE]: 'Vietnamese',
    [NativeLanguage.OTHER]: 'Other',
  };
  return labels[lang];
};

export const getProficiencyLabel = (level: ProficiencyLevel): string => {
  const labels: Record<ProficiencyLevel, string> = {
    [ProficiencyLevel.BEGINNER]: 'Beginner',
    [ProficiencyLevel.ELEMENTARY]: 'Elementary',
    [ProficiencyLevel.INTERMEDIATE]: 'Intermediate',
    [ProficiencyLevel.UPPER_INTERMEDIATE]: 'Upper Intermediate',
    [ProficiencyLevel.ADVANCED]: 'Advanced',
    [ProficiencyLevel.NATIVE]: 'Native'
  };
  return labels[level];
};

export const getInterestLabel = (interest: Interests): string => {
  const labels: Record<Interests, string> = {
    [Interests.FOOD]: 'Food',
    [Interests.DAILY_LIFE]: 'Daily Life',
    [Interests.TRAVEL]: 'Travel',
    [Interests.HEALTH]: 'Health',
    [Interests.WORK]: 'Work',
    [Interests.SCHOOL]: 'School',
    [Interests.TECHNOLOGY]: 'Technology',
    [Interests.HOBBY]: 'Hobby',
    [Interests.EMOTION]: 'Emotion',
    [Interests.SOCIAL_MEDIA]: 'Social Media',
    [Interests.CULTURE]: 'Culture',
    [Interests.MUSIC]: 'Music',
    [Interests.ENTERTAINMENT]: 'Entertainment',
    [Interests.OPINION]: 'Opinion'
  };
  return labels[interest];
};

export const getCorrectionStyleLabel = (style: CorrectionStyle): string => {
  const labels: Record<CorrectionStyle, string> = {
    [CorrectionStyle.ALWAYS]: 'Always correct me',
    [CorrectionStyle.EXPLANATION]: 'Correct with explanation',
    [CorrectionStyle.MAJOR_ERRORS]: 'Only major errors',
    [CorrectionStyle.REPEAT]: 'Repeat correctly without pointing out',
    [CorrectionStyle.NEVER]: 'Never correct me'
  };
  return labels[style];
};
