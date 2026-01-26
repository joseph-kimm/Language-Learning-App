'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { TargetLanguage, getLanguageLabel } from '@/types/survey';
import styles from './LanguageDropdown.module.css';

interface LanguageDropdownProps {
  currentLanguage: TargetLanguage;
}

const getLanguageFlag = (lang: TargetLanguage): string => {
  const flags: Record<TargetLanguage, string> = {
    [TargetLanguage.ENGLISH]: '/images/english_flag.png',
    [TargetLanguage.KOREAN]: '/images/korean_flag.png',
    [TargetLanguage.SPANISH]: '/images/spanish_flag.png'
  };
  return flags[lang];
};

export default function LanguageDropdown({ currentLanguage }: LanguageDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const toggleDropdown = () => {
    setIsOpen(!isOpen);
  };

  return (
    <div className={styles.languageDropdown} ref={dropdownRef}>
      <button
        onClick={toggleDropdown}
        className={styles.languageButton}
        aria-label="Select language"
      >
        <Image
          src={getLanguageFlag(currentLanguage)}
          alt={getLanguageLabel(currentLanguage)}
          width={24}
          height={24}
          className={styles.flagImage}
        />
        <span className={styles.languageName}>{getLanguageLabel(currentLanguage)}</span>
        <span className={`${styles.arrow} ${isOpen ? styles.arrowOpen : ''}`}>▼</span>
      </button>

      {isOpen && (
        <div className={styles.dropdownMenu}>
          {(Object.values(TargetLanguage) as TargetLanguage[]).map((lang) => (
            <div
              key={lang}
              className={`${styles.dropdownItem} ${lang === currentLanguage ? styles.active : ''}`}
            >
              <Image
                src={getLanguageFlag(lang)}
                alt={getLanguageLabel(lang)}
                width={20}
                height={20}
                className={styles.flagImage}
              />
              <span>{getLanguageLabel(lang)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
