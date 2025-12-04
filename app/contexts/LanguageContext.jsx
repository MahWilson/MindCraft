'use client';

import { createContext, useContext, useState, useEffect } from 'react';

const LanguageContext = createContext({
	language: 'en',
	setLanguage: () => {},
});

export function LanguageProvider({ children }) {
	const [language, setLanguage] = useState('en');

	// Load language preference from localStorage on mount
	useEffect(() => {
		const savedLanguage = localStorage.getItem('mindcraft_language') || 'en';
		setLanguage(savedLanguage);
	}, []);

	// Save language preference to localStorage when it changes
	const handleSetLanguage = (lang) => {
		setLanguage(lang);
		localStorage.setItem('mindcraft_language', lang);
	};

	return (
		<LanguageContext.Provider value={{ language, setLanguage: handleSetLanguage }}>
			{children}
		</LanguageContext.Provider>
	);
}

export function useLanguage() {
	return useContext(LanguageContext);
}

