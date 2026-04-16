// Enums matching GraphQL schema (schema.ts)
// Target languages - languages the app supports for learning
export enum TargetLanguage {
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

// ============================================
// Client-side interfaces (GraphQL responses)
// Timestamps are strings because JSON serialization converts Date to ISO string
// ============================================

export interface ILearningLanguage {
  language: TargetLanguage;
  proficiencyLevel: ProficiencyLevel;
  learningGoals: string;
}

export interface IUserProfile {
  userId: string;
  introduction: string;
  nativeLanguage: NativeLanguage;
  interests: Interests[];
  additionalInterests: string[];
  learningLanguages: ILearningLanguage[];
  createdAt: string;
  updatedAt: string;
}

// ============================================
// Server-side MongoDB document interfaces
// Timestamps are Date objects as stored in MongoDB
// ============================================

export interface IUserProfileDoc {
  userId: string;
  introduction: string;
  nativeLanguage: NativeLanguage;
  interests: Interests[];
  additionalInterests: string[];
  learningLanguages: ILearningLanguage[];
  createdAt: Date;
  updatedAt: Date;
}

// ============================================
// GraphQL response types (for typed Apollo hooks)
// ============================================

export interface SaveUserProfileData {
  saveUserProfile: IUserProfile;
}

export interface GetUserProfileData {
  getUserProfile: IUserProfile | null;
}

// ============================================
// Form types (UI state, not database entities)
// ============================================

// Helper type for form state - single language entry
export interface TargetLanguageFormState {
  targetLanguage: string;
  proficiencyLevel: string;
  learningGoals: string;
}

// Helper function to convert enum values to display labels
export const getLanguageLabel = (lang: TargetLanguage): string => {
  const labels: Record<TargetLanguage, string> = {
    [TargetLanguage.ENGLISH]: 'English',
    [TargetLanguage.KOREAN]: 'Korean',
    [TargetLanguage.SPANISH]: 'Spanish',
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

