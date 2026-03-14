'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import { useQuery } from '@apollo/client/react';
import { gql } from 'graphql-tag';
import { IoArrowBack } from 'react-icons/io5';
import AboutTab from '@/components/profile/AboutTab';
import AccountTab from '@/components/profile/AccountTab';
import styles from './page.module.css';

const GET_USER_PROFILE_QUERY = gql`
  query GetUserProfile($userId: ID!) {
    getUserProfile(userId: $userId) {
      userId
    }
  }
`;

type Tab = 'about' | 'account';

export default function SurveyPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const userId = session?.user?.id;
  const [activeTab, setActiveTab] = useState<Tab>('about');

  const { data: profileData, loading: profileLoading } = useQuery<{ getUserProfile: { userId: string } | null }>(GET_USER_PROFILE_QUERY, {
    variables: { userId },
    skip: !userId,
    fetchPolicy: 'cache-and-network',
  });

  const hasProfile = !profileLoading && !!profileData?.getUserProfile;

  return (
    <div className={styles.layout}>
      <main className={styles.main}>
        <div className={styles.container}>
          <div className={styles.pageTop}>
            {hasProfile && (
              <button onClick={() => router.push('/')} className={styles.backButton}>
                <IoArrowBack size={20} />
                <span>Back to Chat</span>
              </button>
            )}
            <button
              onClick={() => signOut({ callbackUrl: '/login' })}
              className={styles.signOutButton}
            >
              Sign Out
            </button>
          </div>

          <div className={styles.header}>
            <h1 className={styles.title}>Your Profile</h1>
            <p className={styles.subtitle}>
              Help us personalize your language learning experience by telling us a bit about yourself and your goals.
            </p>
          </div>

          <div className={styles.tabs}>
            <button
              className={`${styles.tab} ${activeTab === 'about' ? styles.tabActive : ''}`}
              onClick={() => setActiveTab('about')}
            >
              About You
            </button>
            <button
              className={`${styles.tab} ${activeTab === 'account' ? styles.tabActive : ''}`}
              onClick={() => setActiveTab('account')}
            >
              Account
            </button>
          </div>

          <div className={styles.tabContent}>
            {activeTab === 'about' && <AboutTab userId={userId} />}
            {activeTab === 'account' && <AccountTab />}
          </div>
        </div>
      </main>
    </div>
  );
}
