'use client';

import { useRouter } from 'next/navigation';
import { IoArrowBack } from 'react-icons/io5';
import SurveyForm from '@/components/survey/SurveyForm';
import { SurveyData } from '@/types/survey';
import styles from './page.module.css';

export default function SurveyPage() {
  const router = useRouter();

  const handleComplete = (data: SurveyData) => {
    console.log('Survey completed successfully:', data);
    router.push('/');
  };

  return (
    <div className={styles.layout}>
      <main className={styles.main}>
        <div className={styles.container}>
          <button onClick={() => router.push('/')} className={styles.backButton}>
            <IoArrowBack size={20} />
            <span>Back to Chat</span>
          </button>
          <div className={styles.header}>
            <h1 className={styles.title}>Your Profile</h1>
            <p className={styles.subtitle}>
              Help us personalize your language learning experience by telling us a bit about yourself and your goals.
            </p>
          </div>
          <SurveyForm onComplete={handleComplete} />
        </div>
      </main>
    </div>
  );
}
