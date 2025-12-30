import { useEffect, useState, useCallback } from "react";
import { I18nManager, Platform } from "react-native";
import i18n from "i18next";
import { initReactI18next, useTranslation as useI18nTranslation } from "react-i18next";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Localization from "expo-localization";
import createContextHook from "@nkzw/create-context-hook";

import en from "@/locales/en.json";
import es from "@/locales/es.json";
import zh from "@/locales/zh.json";
import pt from "@/locales/pt.json";
import fr from "@/locales/fr.json";
import de from "@/locales/de.json";
import ar from "@/locales/ar.json";
import ru from "@/locales/ru.json";
import ja from "@/locales/ja.json";
import it from "@/locales/it.json";

export type SupportedLanguage = 'en' | 'es' | 'zh' | 'pt' | 'fr' | 'de' | 'ar' | 'ru' | 'ja' | 'it';

export const SUPPORTED_LANGUAGES: { code: SupportedLanguage; name: string; nativeName: string }[] = [
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'es', name: 'Spanish', nativeName: 'Español' },
  { code: 'zh', name: 'Chinese', nativeName: '中文' },
  { code: 'pt', name: 'Portuguese', nativeName: 'Português' },
  { code: 'fr', name: 'French', nativeName: 'Français' },
  { code: 'de', name: 'German', nativeName: 'Deutsch' },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية' },
  { code: 'ru', name: 'Russian', nativeName: 'Русский' },
  { code: 'ja', name: 'Japanese', nativeName: '日本語' },
  { code: 'it', name: 'Italian', nativeName: 'Italiano' },
];

const resources = {
  en: { translation: en },
  es: { translation: es },
  zh: { translation: zh },
  pt: { translation: pt },
  fr: { translation: fr },
  de: { translation: de },
  ar: { translation: ar },
  ru: { translation: ru },
  ja: { translation: ja },
  it: { translation: it },
};

i18n.use(initReactI18next).init({
  compatibilityJSON: 'v4',
  resources,
  lng: 'en',
  fallbackLng: 'en',
  interpolation: {
    escapeValue: false,
  },
});

const LANGUAGE_STORAGE_KEY = 'app_language';

const getDeviceLanguage = (): SupportedLanguage => {
  const deviceLocale = Localization.getLocales()[0]?.languageCode || 'en';
  const supportedCodes = SUPPORTED_LANGUAGES.map(l => l.code);
  
  if (supportedCodes.includes(deviceLocale as SupportedLanguage)) {
    return deviceLocale as SupportedLanguage;
  }
  
  return 'en';
};

export const [LanguageProvider, useLanguage] = createContextHook(() => {
  const [currentLanguage, setCurrentLanguage] = useState<SupportedLanguage>('en');
  const [isRTL, setIsRTL] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const changeLanguageCallback = useCallback(async (lang: SupportedLanguage, persist: boolean = true) => {
    try {
      await i18n.changeLanguage(lang);
      setCurrentLanguage(lang);
      
      const shouldBeRTL = lang === 'ar';
      setIsRTL(shouldBeRTL);
      
      if (Platform.OS !== 'web' && I18nManager.isRTL !== shouldBeRTL) {
        I18nManager.forceRTL(shouldBeRTL);
      }
      
      if (persist) {
        await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, lang);
      }
    } catch (error) {
      console.log('Error changing language:', error);
    }
  }, []);

  useEffect(() => {
    const loadLanguageCallback = async () => {
      try {
        const stored = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);
        const lang = stored ? (stored as SupportedLanguage) : getDeviceLanguage();
        
        await changeLanguageCallback(lang, false);
        setIsLoading(false);
      } catch (error) {
        console.log('Error loading language:', error);
        setIsLoading(false);
      }
    };
    
    loadLanguageCallback();
  }, [changeLanguageCallback]);



  // eslint-disable-next-line react-hooks/exhaustive-deps
  const t = useCallback((key: string, options?: any) => i18n.t(key, options) as string, [currentLanguage]);

  return {
    currentLanguage,
    isRTL,
    isLoading,
    changeLanguage: changeLanguageCallback,
    t,
  };
});

export const useTranslation = () => {
  const { t } = useI18nTranslation();
  return { t };
};
