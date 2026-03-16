'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
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
  const searchParams = useSearchParams();
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

  // Read chatId from URL params
  const chatId = searchParams.get('chat');

  const toggleNav = () => setIsNavOpen(!isNavOpen);
  const closeNav = () => setIsNavOpen(false);

  // Handle chat selection - updates URL
  const handleChatSelect = (selectedChatId: string | null) => {
    if (selectedChatId) {
      // User selected existing chat - update URL with chat param
      router.push(`/?chat=${selectedChatId}`);
    } else {
      // User clicked "New Chat" - clear URL params
      router.push('/');
    }
  };

  // Handle new chat creation - updates URL with new chat ID
  const handleChatCreated = (newChatId: string) => {
    router.push(`/?chat=${newChatId}`);
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
                  router.push('/');
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
          <ChatInterface chatId={chatId} onChatCreated={handleChatCreated} language={selectedLanguage} nativeLanguage={nativeLanguage} />
        </div>
      </main>
    </div>
  );
}
