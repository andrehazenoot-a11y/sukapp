'use client';

import { createContext, useContext, useState, useEffect, useCallback } from 'react';

// Vertaalbestanden
import nl from '../locales/nl.json';
import en from '../locales/en.json';
import hu from '../locales/hu.json';
import pl from '../locales/pl.json';
import de from '../locales/de.json';

const translations = { nl, en, hu, pl, de };

const LANGUAGES = [
    { code: 'nl', name: 'Nederlands', flag: 'https://flagcdn.com/w40/nl.png' },
    { code: 'en', name: 'English', flag: 'https://flagcdn.com/w40/gb.png' },
    { code: 'hu', name: 'Magyar', flag: 'https://flagcdn.com/w40/hu.png' },
    { code: 'pl', name: 'Polski', flag: 'https://flagcdn.com/w40/pl.png' },
    { code: 'de', name: 'Deutsch', flag: 'https://flagcdn.com/w40/de.png' },
];

const LanguageContext = createContext();

export function LanguageProvider({ children }) {
    const [language, setLanguageState] = useState('nl');

    useEffect(() => {
        const saved = localStorage.getItem('schildersapp_language');
        if (saved && translations[saved]) {
            setLanguageState(saved);
        }
    }, []);

    const setLanguage = useCallback((lang) => {
        if (translations[lang]) {
            setLanguageState(lang);
            localStorage.setItem('schildersapp_language', lang);
        }
    }, []);

    // Vertaalfunctie: t('key') geeft de vertaling, valt terug op NL
    const t = useCallback((key) => {
        const keys = key.split('.');
        let value = translations[language];
        for (const k of keys) {
            value = value?.[k];
        }
        if (value !== undefined) return value;

        // Fallback naar Nederlands
        let fallback = translations.nl;
        for (const k of keys) {
            fallback = fallback?.[k];
        }
        return fallback || key;
    }, [language]);

    return (
        <LanguageContext.Provider value={{ language, setLanguage, t, languages: LANGUAGES }}>
            {children}
        </LanguageContext.Provider>
    );
}

export function useLanguage() {
    const context = useContext(LanguageContext);
    if (!context) {
        throw new Error('useLanguage must be used within a LanguageProvider');
    }
    return context;
}

export { LANGUAGES };
