"use client";

import { useState, useEffect } from "react";

import { gql } from "graphql-tag";
import { useMutation, useQuery } from "@apollo/client/react";
import styles from "./AboutTab.module.css";
import {
  TargetLanguage,
  NativeLanguage,
  ProficiencyLevel,
  Interests,
  TargetLanguageFormState,
  SaveUserProfileData,
  GetUserProfileData,
  getLanguageLabel,
  getNativeLanguageLabel,
  getProficiencyLabel,
  getInterestLabel,
} from "@/types/survey";

const SAVE_USER_PROFILE_MUTATION = gql`
  mutation SaveUserProfile($input: UserProfileInput!) {
    saveUserProfile(input: $input) {
      userId
      introduction
      nativeLanguage
      interests
      additionalInterests
      learningLanguages {
        language
        proficiencyLevel
        learningGoals
      }
      createdAt
      updatedAt
    }
  }
`;

const GET_USER_PROFILE_QUERY = gql`
  query GetUserProfile($userId: ID!) {
    getUserProfile(userId: $userId) {
      userId
      introduction
      nativeLanguage
      interests
      additionalInterests
      learningLanguages {
        language
        proficiencyLevel
        learningGoals
      }
    }
  }
`;

const createEmptyLanguageEntry = (): TargetLanguageFormState => ({
  targetLanguage: "",
  proficiencyLevel: "",
  learningGoals: "",
});

interface AboutTabProps {
  userId?: string;
}

export default function AboutTab({ userId }: AboutTabProps) {
  const [saveUserProfile, { loading, error }] =
    useMutation<SaveUserProfileData>(SAVE_USER_PROFILE_MUTATION, {
      refetchQueries: ["GetUserProfile"],
    });
  const { data: profileData, loading: profileLoading } =
    useQuery<GetUserProfileData>(GET_USER_PROFILE_QUERY, {
      variables: { userId },
      skip: !userId,
      fetchPolicy: "cache-and-network",
    });

  // User section state
  const [introduction, setIntroduction] = useState<string>("");
  const [interests, setInterests] = useState<Interests[]>([]);
  const [additionalInterests, setAdditionalInterests] = useState<string>("");
  const [nativeLanguage, setNativeLanguage] = useState<string>("");
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Languages section state
  const [targetLanguages, setTargetLanguages] = useState<
    TargetLanguageFormState[]
  >([createEmptyLanguageEntry()]);

  // Populate form with existing profile data when loaded
  useEffect(() => {
    const profile = profileData?.getUserProfile;
    if (!profile) return;

    setIntroduction(profile.introduction || "");
    setInterests(profile.interests);
    setAdditionalInterests(profile.additionalInterests.join(", "));
    setNativeLanguage(profile.nativeLanguage);
    if (profile.learningLanguages.length > 0) {
      setTargetLanguages(
        profile.learningLanguages.map((lang) => ({
          targetLanguage: lang.language,
          proficiencyLevel: lang.proficiencyLevel,
          learningGoals: lang.learningGoals,
        })),
      );
    }
  }, [profileData]);

  const handleInterestToggle = (interest: Interests) => {
    setInterests((prev) =>
      prev.includes(interest)
        ? prev.filter((i) => i !== interest)
        : [...prev, interest],
    );
  };

  const handleAddLanguage = () => {
    setTargetLanguages((prev) => [...prev, createEmptyLanguageEntry()]);
  };

  const handleRemoveLanguage = (index: number) => {
    setTargetLanguages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleLanguageChange = (
    index: number,
    field: keyof TargetLanguageFormState,
    value: string,
  ) => {
    setTargetLanguages((prev) =>
      prev.map((lang, i) => (i === index ? { ...lang, [field]: value } : lang)),
    );
  };

  const validateForm = (): boolean => {
    // User section validation
    if (!nativeLanguage) {
      alert("Please select your native language");
      return false;
    }
    if (interests.length === 0) {
      alert("Please select at least one interest");
      return false;
    }
    // Languages section validation
    if (targetLanguages.length === 0) {
      alert("Please add at least one language to learn");
      return false;
    }

    for (let i = 0; i < targetLanguages.length; i++) {
      const lang = targetLanguages[i];
      const langNum = i + 1;

      if (!lang.targetLanguage) {
        alert(`Please select a target language for Language ${langNum}`);
        return false;
      }
      if (!lang.proficiencyLevel) {
        alert(`Please select a proficiency level for Language ${langNum}`);
        return false;
      }
      if (!lang.learningGoals.trim()) {
        alert(`Please describe your learning goals for Language ${langNum}`);
        return false;
      }
    }

    // Check for duplicate target languages
    const selectedLanguages = targetLanguages.map((l) => l.targetLanguage);
    const uniqueLanguages = new Set(selectedLanguages);
    if (uniqueLanguages.size !== selectedLanguages.length) {
      alert("Each target language can only be selected once");
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      const additionalInterestsArray = additionalInterests
        .split(",")
        .map((s) => s.trim())
        .filter((s) => s.length > 0);

      // Transform form data to GraphQL input format
      const input = {
        userId: userId!,
        introduction: introduction.trim(),
        nativeLanguage: nativeLanguage,
        interests: interests,
        additionalInterests: additionalInterestsArray,
        learningLanguages: targetLanguages.map((lang) => ({
          language: lang.targetLanguage,
          proficiencyLevel: lang.proficiencyLevel,
          learningGoals: lang.learningGoals.trim(),
        })),
      };

      const result = await saveUserProfile({ variables: { input } });

      if (result.data?.saveUserProfile) {
        console.log("Profile saved:", result.data.saveUserProfile);
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      }
    } catch (err) {
      console.error("Error saving profile:", err);
      alert("Failed to save profile. Please try again.");
    }
  };

  // Get available languages for a language entry (exclude already selected by others)
  const getAvailableLanguages = (currentIndex: number): TargetLanguage[] => {
    const selectedByOthers = targetLanguages
      .filter((_, i) => i !== currentIndex)
      .map((l) => l.targetLanguage)
      .filter((l) => l !== "");

    return Object.values(TargetLanguage).filter(
      (lang) => !selectedByOthers.includes(lang),
    );
  };

  return (
    <div className={styles.surveyContainer}>
      <form onSubmit={handleSubmit} className={styles.form}>
        {/* Section 1: About You */}
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>About You</h2>

          <div className={styles.formGroup}>
            <label htmlFor="introduction" className={styles.label}>
              Profile (Optional)
            </label>
            <textarea
              id="introduction"
              value={introduction}
              onChange={(e) => setIntroduction(e.target.value)}
              placeholder="Tell us a bit about yourself and why you're learning languages"
              className={styles.textarea}
              rows={3}
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>
              Topics of Interest <span className={styles.required}>*</span>
            </label>
            <p className={styles.helpText}>
              Select all topics you&apos;re interested in discussing
            </p>
            <div className={styles.checkboxGrid}>
              {Object.values(Interests).map((interest) => (
                <label key={interest} className={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    checked={interests.includes(interest)}
                    onChange={() => handleInterestToggle(interest)}
                    className={styles.checkbox}
                  />
                  <span>{getInterestLabel(interest)}</span>
                </label>
              ))}
            </div>
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="additionalInterests" className={styles.label}>
              Additional Interests (Optional)
            </label>
            <textarea
              id="additionalInterests"
              value={additionalInterests}
              onChange={(e) => setAdditionalInterests(e.target.value)}
              placeholder="Any other topics or interests you'd like to explore? (comma-separated)"
              className={styles.textarea}
              rows={2}
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="nativeLanguage" className={styles.label}>
              Native Language <span className={styles.required}>*</span>
            </label>
            <select
              id="nativeLanguage"
              value={nativeLanguage}
              onChange={(e) => setNativeLanguage(e.target.value)}
              className={styles.select}
            >
              <option value="">Select your native language</option>
              {Object.values(NativeLanguage).map((lang) => (
                <option key={lang} value={lang}>
                  {getNativeLanguageLabel(lang)}
                </option>
              ))}
            </select>
          </div>

        </div>

        {/* Section 2: Languages to Learn */}
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Languages to Learn</h2>

          <div className={styles.languageList}>
            {targetLanguages.map((lang, index) => (
              <div key={index} className={styles.languageCard}>
                <div className={styles.languageCardHeader}>
                  <h3 className={styles.languageCardTitle}>
                    Language {index + 1}
                  </h3>
                  {targetLanguages.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveLanguage(index)}
                      className={styles.removeButton}
                      aria-label={`Remove language ${index + 1}`}
                    >
                      ×
                    </button>
                  )}
                </div>

                <div className={styles.formGroup}>
                  <label
                    htmlFor={`targetLanguage-${index}`}
                    className={styles.label}
                  >
                    Target Language <span className={styles.required}>*</span>
                  </label>
                  <select
                    id={`targetLanguage-${index}`}
                    value={lang.targetLanguage}
                    onChange={(e) =>
                      handleLanguageChange(
                        index,
                        "targetLanguage",
                        e.target.value,
                      )
                    }
                    className={styles.select}
                  >
                    <option value="">
                      Select the language you want to learn
                    </option>
                    {getAvailableLanguages(index).map((availableLang) => (
                      <option key={availableLang} value={availableLang}>
                        {getLanguageLabel(availableLang)}
                      </option>
                    ))}
                    {/* Keep currently selected value in options even if it would be filtered */}
                    {lang.targetLanguage &&
                      !getAvailableLanguages(index).includes(
                        lang.targetLanguage as TargetLanguage,
                      ) && (
                        <option
                          key={lang.targetLanguage}
                          value={lang.targetLanguage}
                        >
                          {getLanguageLabel(
                            lang.targetLanguage as TargetLanguage,
                          )}
                        </option>
                      )}
                  </select>
                </div>

                <div className={styles.formGroup}>
                  <label
                    htmlFor={`proficiencyLevel-${index}`}
                    className={styles.label}
                  >
                    Proficiency Level <span className={styles.required}>*</span>
                  </label>
                  <select
                    id={`proficiencyLevel-${index}`}
                    value={lang.proficiencyLevel}
                    onChange={(e) =>
                      handleLanguageChange(
                        index,
                        "proficiencyLevel",
                        e.target.value,
                      )
                    }
                    className={styles.select}
                  >
                    <option value="">
                      Select your current proficiency level
                    </option>
                    {Object.values(ProficiencyLevel).map((level) => (
                      <option key={level} value={level}>
                        {getProficiencyLabel(level)}
                      </option>
                    ))}
                  </select>
                </div>

                <div className={styles.formGroup}>
                  <label
                    htmlFor={`learningGoals-${index}`}
                    className={styles.label}
                  >
                    Learning Goals <span className={styles.required}>*</span>
                  </label>
                  <textarea
                    id={`learningGoals-${index}`}
                    value={lang.learningGoals}
                    onChange={(e) =>
                      handleLanguageChange(
                        index,
                        "learningGoals",
                        e.target.value,
                      )
                    }
                    placeholder="What do you hope to achieve? (e.g., hold basic conversations, read news, pass an exam)"
                    className={styles.textarea}
                    rows={3}
                  />
                </div>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={handleAddLanguage}
            className={styles.addLanguageButton}
          >
            + Add Another Language
          </button>
        </div>

        {error && (
          <div className={styles.errorMessage}>
            Failed to save profile. Please try again.
          </div>
        )}

        {saveSuccess && (
          <div className={styles.successMessage}>
            Profile saved successfully!
          </div>
        )}

        <button
          type="submit"
          className={styles.submitButton}
          disabled={loading || profileLoading}
        >
          {loading
            ? "Saving..."
            : profileLoading
              ? "Loading..."
              : "Save Profile"}
        </button>
      </form>
    </div>
  );
}
