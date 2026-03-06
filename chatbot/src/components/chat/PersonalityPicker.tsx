'use client';

import Image from 'next/image';
import { Personality } from '@/types/chat';
import styles from './PersonalityPicker.module.css';

interface PersonalityPickerProps {
  onSelect: (personality: Personality) => void;
  selectedPersonality: Personality | null;
}

const PERSONALITY_INFO: Record<Personality, { label: string; image: string }> = {
  [Personality.DEFAULT]: { label: 'Default', image: '/personality/default.png' },
  [Personality.CALM]: { label: 'Calm', image: '/personality/calm.png' },
  [Personality.CURIOUS]: { label: 'Curious', image: '/personality/curious.png' },
  [Personality.HYPE]: { label: 'Hype', image: '/personality/hype.png' },
  [Personality.PLAYFUL]: { label: 'Playful', image: '/personality/playful.png' },
};

export default function PersonalityPicker({ onSelect, selectedPersonality }: PersonalityPickerProps) {
  return (
    <div className={styles.picker}>
      <h3 className={styles.title}>Choose a personality</h3>
      <div className={styles.grid}>
        {Object.values(Personality).map((personality) => {
          const info = PERSONALITY_INFO[personality];
          const isSelected = selectedPersonality === personality;
          return (
            <button
              key={personality}
              type="button"
              className={`${styles.card} ${isSelected ? styles.selected : ''}`}
              onClick={() => onSelect(personality)}
            >
              <Image
                src={info.image}
                alt={info.label}
                width={80}
                height={80}
                className={styles.avatar}
              />
              <span className={styles.label}>{info.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export { PERSONALITY_INFO };
