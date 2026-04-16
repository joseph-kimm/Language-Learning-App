'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useQuery } from '@apollo/client/react';
import { gql } from 'graphql-tag';
import { IoSettingsSharp } from 'react-icons/io5';
import ChatInterface from '@/components/chat/ChatInterface';
import SideNav from '@/components/navigation/SideNav';
import HamburgerButton from '@/components/navigation/HamburgerButton';
import LanguageDropdown from '@/components/chat/LanguageDropdown';
import { TargetLanguage, GetUserProfileData } from '@/types/survey';
import { warmupModel } from '@/utils/huggingFaceLLM';
import styles from './page.module.css';

const GET_USER_PROFILE_QUERY = gql`
  query GetUserProfile($userId: ID!) {
    getUserProfile(userId: $userId) {
      userId
      nativeLanguage
      learningLanguages {
        language
      }
    }
  }
`;

export default function Home() {
  const [isNavOpen, setIsNavOpen] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState<TargetLanguage>(TargetLanguage.KOREAN);
  // chatId is managed as local state — URL is kept in sync via replaceState (no navigation,
  // no RSC re-fetch, no Apollo cache wipe)
  const [chatId, setChatId] = useState<string | null>(null);
  const router = useRouter();
  const { data: session } = useSession();
  const userId = session?.user?.id;

  const { data: profileData, loading: profileLoading } = useQuery<GetUserProfileData>(GET_USER_PROFILE_QUERY, {
    variables: { userId },
    skip: !userId,
    fetchPolicy: 'cache-and-network',
  });

  const userLanguages = profileData?.getUserProfile?.learningLanguages?.map(
    (lang) => lang.language
  ) || [];
  const nativeLanguage = profileData?.getUserProfile?.nativeLanguage ?? undefined;

  // Read initial chatId from URL on mount so direct links / bookmarks work
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setChatId(params.get('chat'));
  }, []);

  useEffect(() => {
    if (userLanguages.length > 0) {
      setSelectedLanguage(userLanguages[0]);
    }
  }, [profileData]);

  // Redirect to profile setup if logged in but no profile exists yet
  useEffect(() => {
    if (userId && !profileLoading && profileData && !profileData.getUserProfile) {
      router.push('/profile');
    }
  }, [userId, profileLoading, profileData, router]);

  // Warmup the model on mount for returning users who skip the login page
  useEffect(() => {
    warmupModel().catch(console.error);
  }, []);

  const toggleNav = () => setIsNavOpen(!isNavOpen);
  const closeNav = () => setIsNavOpen(false);

  const handleChatSelect = (selectedChatId: string | null) => {
    setChatId(selectedChatId);
    // replaceState keeps the URL accurate for back-button and sharing without
    // triggering a Next.js navigation (which would re-run the RSC layout and
    // wipe the Apollo cache, causing all queries to reload)
    window.history.replaceState(null, '', selectedChatId ? `/?chat=${selectedChatId}` : '/');
  };

  const handleChatCreated = (newChatId: string) => {
    setChatId(newChatId);
    window.history.replaceState(null, '', `/?chat=${newChatId}`);
  };

  return (
    <div className={styles.layout}>
      <HamburgerButton onClick={toggleNav} isOpen={isNavOpen} />
      <SideNav
        isOpen={isNavOpen}
        onClose={closeNav}
        selectedChatId={chatId}
        onChatSelect={handleChatSelect}
        language={selectedLanguage}
        userId={userId}
      />

      <main className={styles.main}>
        <div className={styles.container}>
          <div className={styles.pageHeader}>
            <div className={styles.headerRight}>
              <LanguageDropdown
                currentLanguage={selectedLanguage}
                availableLanguages={userLanguages.length > 0 ? userLanguages : undefined}
                onLanguageChange={(lang) => {
                  setSelectedLanguage(lang);
                  setChatId(null);
                  window.history.replaceState(null, '', '/');
                }}
              />
              <button
                onClick={() => router.push('/profile')}
                className={styles.settingsButton}
                aria-label="Settings"
              >
                <IoSettingsSharp size={24} />
              </button>
            </div>
          </div>
          <div className={styles.chatWrapper}>
            <ChatInterface chatId={chatId} onChatCreated={handleChatCreated} language={selectedLanguage} nativeLanguage={nativeLanguage} />
          </div>
        </div>
      </main>
    </div>
  );
}
