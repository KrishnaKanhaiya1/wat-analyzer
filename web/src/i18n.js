import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// English translations
const en = {
  translation: {
    app: {
      name: "WAT Analyzer Pro",
      tagline: "Omni-Channel AI Behavioral Coach",
    },
    auth: {
      login: "Login",
      register: "Create Account",
      email: "Email Address",
      password: "Password",
      username: "Username",
      fullName: "Full Name (Optional)",
      submitLogin: "Sign In",
      submitRegister: "Sign Up",
      noAccount: "Don't have an account?",
      hasAccount: "Already have an account?",
    },
    dashboard: {
      welcome: "Welcome back",
      selectModule: "Select a module to start practicing",
      modules: {
        workplace: "Workplace Communication",
        student: "Student Mindset",
        interview: "Interview Prep",
        ssb: "SSB Defence"
      }
    },
    test: {
      start: "Start Session",
      submit: "Submit Responses",
      nextWord: "Next Word",
      timeRemaining: "Time Remaining",
      typeResponse: "Type your response here..."
    },
    common: {
      loading: "Loading...",
      error: "An error occurred",
      success: "Success",
      cancel: "Cancel",
      save: "Save"
    }
  }
};

// Hindi translations
const hi = {
  translation: {
    app: {
      name: "WAT Analyzer Pro",
      tagline: "एआई-पावर्ड रियल-टाइम व्यवहार कोच",
    },
    auth: {
      login: "लॉग इन करें",
      register: "खाता बनाएं",
      email: "ईमेल पता",
      password: "पासवर्ड",
      username: "यूज़रनेम",
      fullName: "पूरा नाम (वैकल्पिक)",
      submitLogin: "साइन इन करें",
      submitRegister: "साइन अप करें",
      noAccount: "क्या आपके पास खाता नहीं है?",
      hasAccount: "क्या आपके पास पहले से खाता है?",
    },
    dashboard: {
      welcome: "वापसी पर स्वागत है",
      selectModule: "अभ्यास शुरू करने के लिए एक मॉड्यूल चुनें",
      modules: {
        workplace: "कार्यस्थल संचार",
        student: "छात्र मानसिकता",
        interview: "साक्षात्कार की तैयारी",
        ssb: "एसएसबी रक्षा"
      }
    },
    test: {
      start: "सत्र शुरू करें",
      submit: "जवाब सबमिट करें",
      nextWord: "अगला शब्द",
      timeRemaining: "समय शेष",
      typeResponse: "अपना जवाब यहां टाइप करें..."
    },
    common: {
      loading: "लोड हो रहा है...",
      error: "ऐसी त्रुटि हुई",
      success: "सफलता",
      cancel: "रद्द करें",
      save: "सहेजें"
    }
  }
};

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en,
      hi
    },
    lng: 'en', // default language
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false // not needed for react as it escapes by default
    }
  });

export default i18n;
