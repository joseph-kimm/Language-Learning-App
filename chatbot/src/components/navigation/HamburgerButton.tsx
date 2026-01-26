'use client';

import styles from './HamburgerButton.module.css';

interface HamburgerButtonProps {
  onClick: () => void;
  isOpen: boolean;
}

export default function HamburgerButton({ onClick, isOpen }: HamburgerButtonProps) {
  return (
    <button
      className={`${styles.hamburger} ${isOpen ? styles.open : ''}`}
      onClick={onClick}
      aria-label={isOpen ? 'Close navigation menu' : 'Open navigation menu'}
      aria-expanded={isOpen}
    >
      <span className={`${styles.line} ${isOpen ? styles.lineOpen : ''}`}></span>
      <span className={`${styles.line} ${isOpen ? styles.lineOpen : ''}`}></span>
      <span className={`${styles.line} ${isOpen ? styles.lineOpen : ''}`}></span>
    </button>
  );
}
