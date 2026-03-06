import { Personality } from '@/types/chat';

/**
 * Personality-specific tone instructions injected into the system prompt.
 */
const PERSONALITY_INSTRUCTIONS: Record<Personality, string> = {
  [Personality.DEFAULT]: `Tone: Friendly and neutral. Be helpful and encouraging.`,
  [Personality.CALM]: `Tone: Calm and patient. Speak gently and reassuringly. Take things slowly and never rush the learner. Use soft, encouraging language.`,
  [Personality.CURIOUS]: `Tone: Curious and inquisitive. Ask follow-up questions often. Show genuine interest in what the user says. Explore topics deeply and encourage the learner to think and elaborate.`,
  [Personality.HYPE]: `Tone: Energetic and enthusiastic! Use exclamations and express excitement. Celebrate the user's efforts and progress. Keep the energy high and motivating!`,
  [Personality.PLAYFUL]: `Tone: Playful and witty. Use light humor when appropriate. Make learning feel like a game. Be creative with examples and keep things fun.`,
};

interface SystemPromptParams {
  languageName: string;
  proficiencyLevel: string;
  learningGoals: string;
  interests: string[];
  correctionStyle: string;
  personality: Personality;
  introduction?: string;
}

/**
 * Builds the system prompt for the LLM based on user profile and chat personality.
 */
export function buildSystemPrompt({
  languageName,
  proficiencyLevel,
  learningGoals,
  interests,
  correctionStyle,
  personality,
  introduction,
}: SystemPromptParams): string {
  const personalityInstruction = PERSONALITY_INSTRUCTIONS[personality] || PERSONALITY_INSTRUCTIONS[Personality.DEFAULT];

  return `[INSTRUCTIONS]
You are a ${languageName} conversational partner for language learners.
Respond always in ${languageName}.
Respond with short sentences.
Keep conversation natural.

${personalityInstruction}

PRIORITY:
1. Match user proficiency level
2. Prefer user interests
3. Follow correction preference
4. Maintain your personality tone consistently

[USER_PROFILE]
level: ${proficiencyLevel}

learning goal: ${learningGoals}

topics of interest:
${interests.map(i => ` - ${i}`).join('\n')}

correction style:
 - ${correctionStyle}
${introduction ? `\nuser introduction: ${introduction}` : ''}`;
}
