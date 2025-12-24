# Profile Tab & i18n Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a Profile tab with settings and implement full i18n supporting 5 languages (FR, EN, ES, IT, DE) that controls both the app UI and AI services.

**Architecture:** Zustand store for language persistence with AsyncStorage, i18next for translations, backend sync via PATCH endpoint. Language setting affects Deepgram transcription and Grok extraction prompts.

**Tech Stack:** i18next, react-i18next, expo-localization, Zustand, Hono, Prisma

---

## Phase 1: i18n Foundations

### Task 1.1: Install i18n Dependencies

**Files:**
- Modify: `frontend/package.json`

**Step 1: Install packages**

Run:
```bash
cd /home/clement/Desktop/recall-people-2026/frontend && npm install i18next react-i18next expo-localization
```

Expected: Packages installed successfully

**Step 2: Verify installation**

Run:
```bash
cd /home/clement/Desktop/recall-people-2026/frontend && npm ls i18next react-i18next expo-localization
```

Expected: All 3 packages listed with versions

---

### Task 1.2: Create Language Types

**Files:**
- Create: `frontend/types/i18n.ts`

**Step 1: Create type definitions**

```typescript
export const SUPPORTED_LANGUAGES = ['fr', 'en', 'es', 'it', 'de'] as const;

export type Language = (typeof SUPPORTED_LANGUAGES)[number];

export const LANGUAGE_NAMES: Record<Language, string> = {
  fr: 'Français',
  en: 'English',
  es: 'Español',
  it: 'Italiano',
  de: 'Deutsch',
};

export const LANGUAGE_FLAGS: Record<Language, string> = {
  fr: '🇫🇷',
  en: '🇬🇧',
  es: '🇪🇸',
  it: '🇮🇹',
  de: '🇩🇪',
};

export const DEFAULT_LANGUAGE: Language = 'en';
```

**Step 2: Export from types index**

Modify `frontend/types/index.ts` - add at end:

```typescript
export * from './i18n';
```

**Step 3: Commit**

```bash
git add frontend/types/i18n.ts frontend/types/index.ts
git commit -m "feat(i18n): add language type definitions"
```

---

### Task 1.3: Create French Translation File (Source)

**Files:**
- Create: `frontend/locales/fr.json`

**Step 1: Create French translations**

```json
{
  "common": {
    "loading": "Chargement...",
    "save": "Enregistrer",
    "cancel": "Annuler",
    "delete": "Supprimer",
    "edit": "Modifier",
    "confirm": "Confirmer",
    "back": "Retour",
    "error": "Erreur",
    "success": "Succès"
  },
  "tabs": {
    "home": "Accueil",
    "contacts": "Contacts",
    "search": "Recherche",
    "profile": "Profil"
  },
  "home": {
    "pressToRecord": "Appuie pour enregistrer",
    "recording": "Enregistrement...",
    "processing": "Traitement...",
    "transcribing": "Transcription..."
  },
  "contacts": {
    "title": "Contacts",
    "searchPlaceholder": "Rechercher un contact...",
    "noContacts": "Aucun contact",
    "addFirst": "Enregistrez une note vocale pour ajouter votre premier contact"
  },
  "search": {
    "title": "Recherche",
    "placeholder": "Rechercher dans vos contacts...",
    "noResults": "Aucun résultat",
    "searching": "Recherche en cours..."
  },
  "profile": {
    "title": "Profil",
    "connectedWith": "Connecté via {{provider}}",
    "sections": {
      "language": "Langue",
      "data": "Données",
      "about": "À propos"
    },
    "language": {
      "appLanguage": "Langue de l'app",
      "appLanguageDescription": "App + transcription IA"
    },
    "data": {
      "statistics": "Statistiques",
      "export": "Exporter mes données",
      "clearCache": "Vider le cache"
    },
    "about": {
      "version": "Version",
      "feedback": "Donner un feedback",
      "legal": "Mentions légales"
    },
    "logout": "Se déconnecter",
    "logoutConfirm": "Voulez-vous vraiment vous déconnecter ?"
  },
  "languagePicker": {
    "title": "Choisir la langue",
    "description": "Cette langue sera utilisée pour l'interface et la transcription vocale"
  }
}
```

---

### Task 1.4: Create English Translation File

**Files:**
- Create: `frontend/locales/en.json`

**Step 1: Create English translations**

```json
{
  "common": {
    "loading": "Loading...",
    "save": "Save",
    "cancel": "Cancel",
    "delete": "Delete",
    "edit": "Edit",
    "confirm": "Confirm",
    "back": "Back",
    "error": "Error",
    "success": "Success"
  },
  "tabs": {
    "home": "Home",
    "contacts": "Contacts",
    "search": "Search",
    "profile": "Profile"
  },
  "home": {
    "pressToRecord": "Press to record",
    "recording": "Recording...",
    "processing": "Processing...",
    "transcribing": "Transcribing..."
  },
  "contacts": {
    "title": "Contacts",
    "searchPlaceholder": "Search contacts...",
    "noContacts": "No contacts",
    "addFirst": "Record a voice note to add your first contact"
  },
  "search": {
    "title": "Search",
    "placeholder": "Search your contacts...",
    "noResults": "No results",
    "searching": "Searching..."
  },
  "profile": {
    "title": "Profile",
    "connectedWith": "Connected with {{provider}}",
    "sections": {
      "language": "Language",
      "data": "Data",
      "about": "About"
    },
    "language": {
      "appLanguage": "App language",
      "appLanguageDescription": "App + AI transcription"
    },
    "data": {
      "statistics": "Statistics",
      "export": "Export my data",
      "clearCache": "Clear cache"
    },
    "about": {
      "version": "Version",
      "feedback": "Give feedback",
      "legal": "Legal notices"
    },
    "logout": "Log out",
    "logoutConfirm": "Are you sure you want to log out?"
  },
  "languagePicker": {
    "title": "Choose language",
    "description": "This language will be used for the interface and voice transcription"
  }
}
```

---

### Task 1.5: Create Spanish Translation File

**Files:**
- Create: `frontend/locales/es.json`

**Step 1: Create Spanish translations**

```json
{
  "common": {
    "loading": "Cargando...",
    "save": "Guardar",
    "cancel": "Cancelar",
    "delete": "Eliminar",
    "edit": "Editar",
    "confirm": "Confirmar",
    "back": "Volver",
    "error": "Error",
    "success": "Éxito"
  },
  "tabs": {
    "home": "Inicio",
    "contacts": "Contactos",
    "search": "Buscar",
    "profile": "Perfil"
  },
  "home": {
    "pressToRecord": "Pulsa para grabar",
    "recording": "Grabando...",
    "processing": "Procesando...",
    "transcribing": "Transcribiendo..."
  },
  "contacts": {
    "title": "Contactos",
    "searchPlaceholder": "Buscar contacto...",
    "noContacts": "Sin contactos",
    "addFirst": "Graba una nota de voz para añadir tu primer contacto"
  },
  "search": {
    "title": "Buscar",
    "placeholder": "Buscar en tus contactos...",
    "noResults": "Sin resultados",
    "searching": "Buscando..."
  },
  "profile": {
    "title": "Perfil",
    "connectedWith": "Conectado con {{provider}}",
    "sections": {
      "language": "Idioma",
      "data": "Datos",
      "about": "Acerca de"
    },
    "language": {
      "appLanguage": "Idioma de la app",
      "appLanguageDescription": "App + transcripción IA"
    },
    "data": {
      "statistics": "Estadísticas",
      "export": "Exportar mis datos",
      "clearCache": "Borrar caché"
    },
    "about": {
      "version": "Versión",
      "feedback": "Dar feedback",
      "legal": "Avisos legales"
    },
    "logout": "Cerrar sesión",
    "logoutConfirm": "¿Seguro que quieres cerrar sesión?"
  },
  "languagePicker": {
    "title": "Elegir idioma",
    "description": "Este idioma se usará para la interfaz y la transcripción de voz"
  }
}
```

---

### Task 1.6: Create Italian Translation File

**Files:**
- Create: `frontend/locales/it.json`

**Step 1: Create Italian translations**

```json
{
  "common": {
    "loading": "Caricamento...",
    "save": "Salva",
    "cancel": "Annulla",
    "delete": "Elimina",
    "edit": "Modifica",
    "confirm": "Conferma",
    "back": "Indietro",
    "error": "Errore",
    "success": "Successo"
  },
  "tabs": {
    "home": "Home",
    "contacts": "Contatti",
    "search": "Cerca",
    "profile": "Profilo"
  },
  "home": {
    "pressToRecord": "Premi per registrare",
    "recording": "Registrazione...",
    "processing": "Elaborazione...",
    "transcribing": "Trascrizione..."
  },
  "contacts": {
    "title": "Contatti",
    "searchPlaceholder": "Cerca contatto...",
    "noContacts": "Nessun contatto",
    "addFirst": "Registra una nota vocale per aggiungere il tuo primo contatto"
  },
  "search": {
    "title": "Cerca",
    "placeholder": "Cerca nei tuoi contatti...",
    "noResults": "Nessun risultato",
    "searching": "Ricerca in corso..."
  },
  "profile": {
    "title": "Profilo",
    "connectedWith": "Connesso con {{provider}}",
    "sections": {
      "language": "Lingua",
      "data": "Dati",
      "about": "Info"
    },
    "language": {
      "appLanguage": "Lingua dell'app",
      "appLanguageDescription": "App + trascrizione IA"
    },
    "data": {
      "statistics": "Statistiche",
      "export": "Esporta i miei dati",
      "clearCache": "Svuota cache"
    },
    "about": {
      "version": "Versione",
      "feedback": "Invia feedback",
      "legal": "Note legali"
    },
    "logout": "Disconnetti",
    "logoutConfirm": "Sei sicuro di volerti disconnettere?"
  },
  "languagePicker": {
    "title": "Scegli lingua",
    "description": "Questa lingua verrà usata per l'interfaccia e la trascrizione vocale"
  }
}
```

---

### Task 1.7: Create German Translation File

**Files:**
- Create: `frontend/locales/de.json`

**Step 1: Create German translations**

```json
{
  "common": {
    "loading": "Laden...",
    "save": "Speichern",
    "cancel": "Abbrechen",
    "delete": "Löschen",
    "edit": "Bearbeiten",
    "confirm": "Bestätigen",
    "back": "Zurück",
    "error": "Fehler",
    "success": "Erfolg"
  },
  "tabs": {
    "home": "Start",
    "contacts": "Kontakte",
    "search": "Suche",
    "profile": "Profil"
  },
  "home": {
    "pressToRecord": "Zum Aufnehmen drücken",
    "recording": "Aufnahme...",
    "processing": "Verarbeitung...",
    "transcribing": "Transkription..."
  },
  "contacts": {
    "title": "Kontakte",
    "searchPlaceholder": "Kontakt suchen...",
    "noContacts": "Keine Kontakte",
    "addFirst": "Nimm eine Sprachnotiz auf, um deinen ersten Kontakt hinzuzufügen"
  },
  "search": {
    "title": "Suche",
    "placeholder": "In Kontakten suchen...",
    "noResults": "Keine Ergebnisse",
    "searching": "Suche läuft..."
  },
  "profile": {
    "title": "Profil",
    "connectedWith": "Verbunden mit {{provider}}",
    "sections": {
      "language": "Sprache",
      "data": "Daten",
      "about": "Über"
    },
    "language": {
      "appLanguage": "App-Sprache",
      "appLanguageDescription": "App + KI-Transkription"
    },
    "data": {
      "statistics": "Statistiken",
      "export": "Meine Daten exportieren",
      "clearCache": "Cache leeren"
    },
    "about": {
      "version": "Version",
      "feedback": "Feedback geben",
      "legal": "Rechtliches"
    },
    "logout": "Abmelden",
    "logoutConfirm": "Möchtest du dich wirklich abmelden?"
  },
  "languagePicker": {
    "title": "Sprache wählen",
    "description": "Diese Sprache wird für die Oberfläche und Sprachtranskription verwendet"
  }
}
```

**Step 2: Commit all locale files**

```bash
git add frontend/locales/
git commit -m "feat(i18n): add translation files for FR, EN, ES, IT, DE"
```

---

### Task 1.8: Create Settings Store

**Files:**
- Create: `frontend/stores/settings-store.ts`

**Step 1: Create the store with AsyncStorage persistence**

```typescript
import { create } from 'zustand';
import { devtools, persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getLocales } from 'expo-localization';
import { Language, SUPPORTED_LANGUAGES, DEFAULT_LANGUAGE } from '@/types';

type SettingsState = {
  language: Language;
  isHydrated: boolean;
};

type SettingsActions = {
  setLanguage: (language: Language) => void;
  setHydrated: (hydrated: boolean) => void;
  detectDeviceLanguage: () => Language;
};

const detectDeviceLanguage = (): Language => {
  const locales = getLocales();
  if (locales.length === 0) return DEFAULT_LANGUAGE;

  const deviceLang = locales[0].languageCode;
  if (deviceLang && SUPPORTED_LANGUAGES.includes(deviceLang as Language)) {
    return deviceLang as Language;
  }

  return DEFAULT_LANGUAGE;
};

export const useSettingsStore = create<SettingsState & SettingsActions>()(
  devtools(
    persist(
      (set) => ({
        language: detectDeviceLanguage(),
        isHydrated: false,

        setLanguage: (language) => set({ language }),
        setHydrated: (isHydrated) => set({ isHydrated }),
        detectDeviceLanguage,
      }),
      {
        name: 'settings-store',
        storage: createJSONStorage(() => AsyncStorage),
        onRehydrateStorage: () => (state) => {
          state?.setHydrated(true);
        },
        partialize: (state) => ({ language: state.language }),
      }
    ),
    { name: 'settings-store' }
  )
);
```

**Step 2: Install AsyncStorage if not present**

Run:
```bash
cd /home/clement/Desktop/recall-people-2026/frontend && npm install @react-native-async-storage/async-storage
```

**Step 3: Commit**

```bash
git add frontend/stores/settings-store.ts frontend/package.json frontend/package-lock.json
git commit -m "feat(i18n): add settings store with language persistence"
```

---

### Task 1.9: Create i18n Configuration

**Files:**
- Create: `frontend/lib/i18n.ts`

**Step 1: Create i18n configuration**

```typescript
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { Language } from '@/types';

import fr from '@/locales/fr.json';
import en from '@/locales/en.json';
import es from '@/locales/es.json';
import it from '@/locales/it.json';
import de from '@/locales/de.json';

const resources = {
  fr: { translation: fr },
  en: { translation: en },
  es: { translation: es },
  it: { translation: it },
  de: { translation: de },
};

i18n.use(initReactI18next).init({
  resources,
  lng: 'fr',
  fallbackLng: 'en',
  interpolation: {
    escapeValue: false,
  },
  react: {
    useSuspense: false,
  },
});

export const changeLanguage = (language: Language): void => {
  i18n.changeLanguage(language);
};

export default i18n;
```

**Step 2: Commit**

```bash
git add frontend/lib/i18n.ts
git commit -m "feat(i18n): add i18next configuration"
```

---

### Task 1.10: Integrate i18n in App Root

**Files:**
- Modify: `frontend/app/_layout.tsx`

**Step 1: Read current layout file first**

**Step 2: Add i18n imports and initialization**

Add at top of file:
```typescript
import '@/lib/i18n';
import { useEffect } from 'react';
import { useSettingsStore } from '@/stores/settings-store';
import { changeLanguage } from '@/lib/i18n';
```

**Step 3: Add language sync in RootLayout component**

Inside the RootLayout component, before the return statement, add:
```typescript
const language = useSettingsStore((state) => state.language);
const isHydrated = useSettingsStore((state) => state.isHydrated);

useEffect(() => {
  if (isHydrated) {
    changeLanguage(language);
  }
}, [language, isHydrated]);
```

**Step 4: Commit**

```bash
git add frontend/app/_layout.tsx
git commit -m "feat(i18n): integrate i18n in app root layout"
```

---

## Phase 2: Profile Page

### Task 2.1: Add Profile Tab to Navigation

**Files:**
- Modify: `frontend/app/(tabs)/_layout.tsx`

**Step 1: Add User icon import**

Change line 2 from:
```typescript
import { Home, Users, Search } from 'lucide-react-native';
```
To:
```typescript
import { Home, Users, Search, User } from 'lucide-react-native';
```

**Step 2: Add useTranslation import**

Add after other imports:
```typescript
import { useTranslation } from 'react-i18next';
```

**Step 3: Add translation hook in component**

After `const [checking, setChecking] = useState(true);` add:
```typescript
const { t } = useTranslation();
```

**Step 4: Update existing tab titles to use translations**

Replace the Tabs.Screen elements with:
```typescript
<Tabs.Screen
  name="index"
  options={{
    title: t('tabs.home'),
    tabBarIcon: ({ color, size }) => <Home color={color} size={size} />,
  }}
/>
<Tabs.Screen
  name="contacts"
  options={{
    title: t('tabs.contacts'),
    tabBarIcon: ({ color, size }) => <Users color={color} size={size} />,
  }}
/>
<Tabs.Screen
  name="search"
  options={{
    title: t('tabs.search'),
    tabBarIcon: ({ color, size }) => <Search color={color} size={size} />,
  }}
/>
<Tabs.Screen
  name="profile"
  options={{
    title: t('tabs.profile'),
    tabBarIcon: ({ color, size }) => <User color={color} size={size} />,
  }}
/>
```

**Step 5: Commit**

```bash
git add frontend/app/\(tabs\)/_layout.tsx
git commit -m "feat(profile): add profile tab to navigation"
```

---

### Task 2.2: Create SettingsSection Component

**Files:**
- Create: `frontend/components/profile/SettingsSection.tsx`

**Step 1: Create the component**

```typescript
import { View, Text } from 'react-native';
import { ReactNode } from 'react';

type SettingsSectionProps = {
  title: string;
  children: ReactNode;
};

export function SettingsSection({ title, children }: SettingsSectionProps) {
  return (
    <View className="mb-6">
      <Text className="text-textSecondary text-xs uppercase tracking-wider mb-2 px-1">
        {title}
      </Text>
      <View className="bg-surface rounded-xl overflow-hidden">
        {children}
      </View>
    </View>
  );
}
```

---

### Task 2.3: Create SettingsRow Component

**Files:**
- Create: `frontend/components/profile/SettingsRow.tsx`

**Step 1: Create the component**

```typescript
import { View, Text, Pressable } from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import { ReactNode } from 'react';

type SettingsRowProps = {
  icon: ReactNode;
  label: string;
  value?: string;
  onPress?: () => void;
  showChevron?: boolean;
  destructive?: boolean;
};

export function SettingsRow({
  icon,
  label,
  value,
  onPress,
  showChevron = true,
  destructive = false,
}: SettingsRowProps) {
  return (
    <Pressable
      className="flex-row items-center px-4 py-3.5 border-b border-surfaceHover last:border-b-0 active:bg-surfaceHover"
      onPress={onPress}
      disabled={!onPress}
    >
      <View className="w-8 items-center">
        {icon}
      </View>
      <Text
        className={`flex-1 ml-3 text-base ${destructive ? 'text-red-500' : 'text-textPrimary'}`}
      >
        {label}
      </Text>
      {value && (
        <Text className="text-textSecondary mr-2">{value}</Text>
      )}
      {showChevron && onPress && (
        <ChevronRight size={20} color="#71717a" />
      )}
    </Pressable>
  );
}
```

---

### Task 2.4: Create ProfileHeader Component

**Files:**
- Create: `frontend/components/profile/ProfileHeader.tsx`

**Step 1: Create the component**

```typescript
import { View, Text } from 'react-native';
import { Check } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';

type ProfileHeaderProps = {
  name: string;
  email: string;
  provider?: string;
};

export function ProfileHeader({ name, email, provider }: ProfileHeaderProps) {
  const { t } = useTranslation();

  return (
    <View className="bg-surface rounded-xl p-4 mb-6">
      <Text className="text-textPrimary text-xl font-semibold">
        {name}
      </Text>
      <Text className="text-textSecondary mt-1">
        {email}
      </Text>
      {provider && (
        <View className="flex-row items-center mt-2">
          <Check size={16} color="#22c55e" />
          <Text className="text-green-500 ml-1.5 text-sm">
            {t('profile.connectedWith', { provider })}
          </Text>
        </View>
      )}
    </View>
  );
}
```

---

### Task 2.5: Create LanguagePicker Component

**Files:**
- Create: `frontend/components/profile/LanguagePicker.tsx`

**Step 1: Create the component**

```typescript
import { View, Text, Pressable, Modal } from 'react-native';
import { Check, X } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { Language, SUPPORTED_LANGUAGES, LANGUAGE_NAMES, LANGUAGE_FLAGS } from '@/types';
import { useSettingsStore } from '@/stores/settings-store';
import { changeLanguage } from '@/lib/i18n';

type LanguagePickerProps = {
  visible: boolean;
  onClose: () => void;
};

export function LanguagePicker({ visible, onClose }: LanguagePickerProps) {
  const { t } = useTranslation();
  const currentLanguage = useSettingsStore((state) => state.language);
  const setLanguage = useSettingsStore((state) => state.setLanguage);

  const handleSelectLanguage = (language: Language) => {
    setLanguage(language);
    changeLanguage(language);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View className="flex-1 justify-end bg-black/50">
        <View className="bg-background rounded-t-3xl">
          <View className="flex-row items-center justify-between p-4 border-b border-surfaceHover">
            <Text className="text-textPrimary text-lg font-semibold">
              {t('languagePicker.title')}
            </Text>
            <Pressable onPress={onClose} className="p-1">
              <X size={24} color="#a1a1aa" />
            </Pressable>
          </View>

          <Text className="text-textSecondary text-sm px-4 py-2">
            {t('languagePicker.description')}
          </Text>

          <View className="pb-8">
            {SUPPORTED_LANGUAGES.map((language) => (
              <Pressable
                key={language}
                className="flex-row items-center px-4 py-4 active:bg-surfaceHover"
                onPress={() => handleSelectLanguage(language)}
              >
                <Text className="text-2xl mr-3">{LANGUAGE_FLAGS[language]}</Text>
                <Text className="flex-1 text-textPrimary text-base">
                  {LANGUAGE_NAMES[language]}
                </Text>
                {currentLanguage === language && (
                  <Check size={20} color="#8b5cf6" />
                )}
              </Pressable>
            ))}
          </View>
        </View>
      </View>
    </Modal>
  );
}
```

**Step 2: Commit all profile components**

```bash
git add frontend/components/profile/
git commit -m "feat(profile): add profile UI components"
```

---

### Task 2.6: Create Profile Page

**Files:**
- Create: `frontend/app/(tabs)/profile.tsx`

**Step 1: Create the profile page**

```typescript
import { View, Text, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Globe,
  BarChart3,
  Download,
  Trash2,
  Smartphone,
  MessageSquare,
  FileText,
  LogOut,
} from 'lucide-react-native';
import { useAuthStore } from '@/stores/auth-store';
import { useSettingsStore } from '@/stores/settings-store';
import { LANGUAGE_NAMES } from '@/types';
import { ProfileHeader } from '@/components/profile/ProfileHeader';
import { SettingsSection } from '@/components/profile/SettingsSection';
import { SettingsRow } from '@/components/profile/SettingsRow';
import { LanguagePicker } from '@/components/profile/LanguagePicker';
import Constants from 'expo-constants';

export default function ProfileScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const language = useSettingsStore((state) => state.language);
  const [showLanguagePicker, setShowLanguagePicker] = useState(false);

  const handleLogout = () => {
    Alert.alert(
      t('profile.logout'),
      t('profile.logoutConfirm'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.confirm'),
          style: 'destructive',
          onPress: async () => {
            await logout();
            router.replace('/(auth)/login');
          },
        },
      ]
    );
  };

  const appVersion = Constants.expoConfig?.version || '1.0.0';

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <ScrollView className="flex-1 px-4">
        <Text className="text-textPrimary text-2xl font-bold mt-4 mb-6">
          {t('profile.title')}
        </Text>

        {user && (
          <ProfileHeader
            name={user.name}
            email={user.email}
            provider="Google"
          />
        )}

        <SettingsSection title={t('profile.sections.language')}>
          <SettingsRow
            icon={<Globe size={20} color="#8b5cf6" />}
            label={t('profile.language.appLanguage')}
            value={LANGUAGE_NAMES[language]}
            onPress={() => setShowLanguagePicker(true)}
          />
        </SettingsSection>

        <SettingsSection title={t('profile.sections.data')}>
          <SettingsRow
            icon={<BarChart3 size={20} color="#8b5cf6" />}
            label={t('profile.data.statistics')}
            onPress={() => {}}
          />
          <SettingsRow
            icon={<Download size={20} color="#8b5cf6" />}
            label={t('profile.data.export')}
            onPress={() => {}}
          />
          <SettingsRow
            icon={<Trash2 size={20} color="#8b5cf6" />}
            label={t('profile.data.clearCache')}
            onPress={() => {}}
            showChevron={false}
          />
        </SettingsSection>

        <SettingsSection title={t('profile.sections.about')}>
          <SettingsRow
            icon={<Smartphone size={20} color="#8b5cf6" />}
            label={t('profile.about.version')}
            value={appVersion}
            showChevron={false}
          />
          <SettingsRow
            icon={<MessageSquare size={20} color="#8b5cf6" />}
            label={t('profile.about.feedback')}
            onPress={() => {}}
          />
          <SettingsRow
            icon={<FileText size={20} color="#8b5cf6" />}
            label={t('profile.about.legal')}
            onPress={() => {}}
          />
        </SettingsSection>

        <View className="mt-2 mb-8">
          <SettingsRow
            icon={<LogOut size={20} color="#ef4444" />}
            label={t('profile.logout')}
            onPress={handleLogout}
            showChevron={false}
            destructive
          />
        </View>
      </ScrollView>

      <LanguagePicker
        visible={showLanguagePicker}
        onClose={() => setShowLanguagePicker(false)}
      />
    </SafeAreaView>
  );
}
```

**Step 2: Commit**

```bash
git add frontend/app/\(tabs\)/profile.tsx
git commit -m "feat(profile): add profile page with settings"
```

---

## Phase 3: Backend Integration

### Task 3.1: Update Prisma Schema

**Files:**
- Modify: `backend/prisma/schema.prisma`

**Step 1: Add preferredLanguage to User model**

After `updatedAt` field in User model, add:
```prisma
preferredLanguage String @default("fr") @map("preferred_language")
```

**Step 2: Run migration**

```bash
cd /home/clement/Desktop/recall-people-2026/backend && npx prisma migrate dev --name add_preferred_language
```

**Step 3: Commit**

```bash
git add backend/prisma/
git commit -m "feat(backend): add preferredLanguage to User schema"
```

---

### Task 3.2: Create Settings Route

**Files:**
- Create: `backend/src/routes/settings.ts`

**Step 1: Create the route**

```typescript
import { Hono } from 'hono';
import { authMiddleware, AuthContext } from '../middleware/auth';
import { db } from '../lib/db';
import { z } from 'zod';

type Bindings = {
  DATABASE_URL: string;
  BETTER_AUTH_SECRET: string;
  BETTER_AUTH_URL: string;
};

const updateSettingsSchema = z.object({
  preferredLanguage: z.enum(['fr', 'en', 'es', 'it', 'de']).optional(),
});

export const settingsRoutes = new Hono<{ Bindings: Bindings; Variables: AuthContext }>();

settingsRoutes.use('/*', authMiddleware);

settingsRoutes.get('/', async (c) => {
  const userId = c.get('userId');

  const user = await db(c.env.DATABASE_URL).user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      preferredLanguage: true,
    },
  });

  if (!user) {
    return c.json({ error: 'User not found' }, 404);
  }

  return c.json({ success: true, user });
});

settingsRoutes.patch('/', async (c) => {
  const userId = c.get('userId');
  const body = await c.req.json();

  const parsed = updateSettingsSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: 'Invalid request body' }, 400);
  }

  const updatedUser = await db(c.env.DATABASE_URL).user.update({
    where: { id: userId },
    data: parsed.data,
    select: {
      id: true,
      name: true,
      email: true,
      preferredLanguage: true,
    },
  });

  return c.json({ success: true, user: updatedUser });
});
```

---

### Task 3.3: Register Settings Route

**Files:**
- Modify: `backend/src/index.ts`

**Step 1: Add import**

After other route imports, add:
```typescript
import { settingsRoutes } from './routes/settings';
```

**Step 2: Add route**

After `app.route('/api/search', searchRoutes);`, add:
```typescript
app.route('/api/settings', settingsRoutes);
```

**Step 3: Commit**

```bash
git add backend/src/routes/settings.ts backend/src/index.ts
git commit -m "feat(backend): add settings API endpoint"
```

---

### Task 3.4: Update Transcribe Route for Dynamic Language

**Files:**
- Modify: `backend/src/routes/transcribe.ts`

**Step 1: Add language parameter to request**

Change line 30-38 (the transcribeFile call) to:
```typescript
const language = (formData.get('language') as string) || 'fr';
const validLanguages = ['fr', 'en', 'es', 'it', 'de'];
const transcriptionLanguage = validLanguages.includes(language) ? language : 'fr';

const { result } = await deepgram.listen.prerecorded.transcribeFile(
  Buffer.from(audioBuffer),
  {
    model: 'nova-3',
    language: transcriptionLanguage,
    smart_format: true,
    punctuate: true,
  }
);
```

**Step 2: Commit**

```bash
git add backend/src/routes/transcribe.ts
git commit -m "feat(backend): support dynamic language in transcription"
```

---

### Task 3.5: Update Extract Route with Language Instructions

**Files:**
- Modify: `backend/src/routes/extract.ts`

**Step 1: Add language to ExtractionRequest type**

After `currentContact?:` in ExtractionRequest type, add:
```typescript
language?: 'fr' | 'en' | 'es' | 'it' | 'de';
```

**Step 2: Create language instructions constant**

After the extractionSchema, add:
```typescript
const LANGUAGE_INSTRUCTIONS: Record<string, string> = {
  fr: 'Tu DOIS répondre en français uniquement.',
  en: 'You MUST respond in English only.',
  es: 'DEBES responder solo en español.',
  it: 'DEVI rispondere solo in italiano.',
  de: 'Du MUSST nur auf Deutsch antworten.',
};
```

**Step 3: Update buildExtractionPrompt signature and add language parameter**

Change `buildExtractionPrompt` function signature to:
```typescript
const buildExtractionPrompt = (
  transcription: string,
  currentContact?: ExtractionRequest['currentContact'],
  language: string = 'fr'
): string => {
```

**Step 4: Add language instruction to the prompt**

At the end of the prompt string (before the closing backtick), add:
```typescript

LANGUE DE RÉPONSE:
${LANGUAGE_INSTRUCTIONS[language] || LANGUAGE_INSTRUCTIONS.fr}
Tous les champs textuels (noteTitle, factValue, hotTopics, memories, etc.) doivent être dans cette langue.
```

**Step 5: Update the route to pass language**

In the POST handler, update the prompt building call:
```typescript
const language = body.language || 'fr';
const prompt = buildExtractionPrompt(transcription, currentContact, language);
```

**Step 6: Commit**

```bash
git add backend/src/routes/extract.ts
git commit -m "feat(backend): add language output instructions to extraction"
```

---

### Task 3.6: Update Summary Route with Language Instructions

**Files:**
- Modify: `backend/src/routes/summary.ts`

**Step 1: Add language to SummaryRequest type**

After `hotTopics:`, add:
```typescript
language?: 'fr' | 'en' | 'es' | 'it' | 'de';
```

**Step 2: Add language instructions**

After the type definition, add:
```typescript
const LANGUAGE_INSTRUCTIONS: Record<string, { instruction: string; objective: string }> = {
  fr: {
    instruction: 'Réponds en français uniquement.',
    objective: 'Écrire 2-3 phrases qui permettent de se rappeler rapidement qui est cette personne avant de la revoir.',
  },
  en: {
    instruction: 'Respond in English only.',
    objective: 'Write 2-3 sentences to quickly remember who this person is before seeing them again.',
  },
  es: {
    instruction: 'Responde solo en español.',
    objective: 'Escribe 2-3 frases para recordar rápidamente quién es esta persona antes de volver a verla.',
  },
  it: {
    instruction: 'Rispondi solo in italiano.',
    objective: 'Scrivi 2-3 frasi per ricordare velocemente chi è questa persona prima di rivederla.',
  },
  de: {
    instruction: 'Antworte nur auf Deutsch.',
    objective: 'Schreibe 2-3 Sätze, um sich schnell daran zu erinnern, wer diese Person ist, bevor man sie wiedersieht.',
  },
};
```

**Step 3: Update prompt to use language**

In the route handler, get language from body:
```typescript
const language = body.language || 'fr';
const langConfig = LANGUAGE_INSTRUCTIONS[language] || LANGUAGE_INSTRUCTIONS.fr;
```

Update the prompt to include:
```typescript
OBJECTIF: ${langConfig.objective}

LANGUE: ${langConfig.instruction}
```

**Step 4: Commit**

```bash
git add backend/src/routes/summary.ts
git commit -m "feat(backend): add language support to summary generation"
```

---

### Task 3.7: Update Search Route with Language Instructions

**Files:**
- Modify: `backend/src/routes/search.ts`

**Step 1: Add language to SearchRequest type**

After `notes:`, add:
```typescript
language?: 'fr' | 'en' | 'es' | 'it' | 'de';
```

**Step 2: Update buildSearchPrompt signature**

```typescript
const buildSearchPrompt = (
  query: string,
  facts: FactInput[],
  memories: MemoryInput[],
  notes: NoteInput[],
  language: string = 'fr'
): string => {
```

**Step 3: Add language instruction to prompt**

At end of prompt, add:
```typescript

LANGUE DE RÉPONSE: Réponds dans la même langue que la requête utilisateur (${language}).
Les champs "answer" et "reference" doivent être dans cette langue.
```

**Step 4: Update route handler**

```typescript
const language = body.language || 'fr';
const prompt = buildSearchPrompt(query, facts, memories, notes, language);
```

**Step 5: Commit**

```bash
git add backend/src/routes/search.ts
git commit -m "feat(backend): add language support to search"
```

---

### Task 3.8: Update Frontend API to Pass Language

**Files:**
- Modify: `frontend/lib/api.ts`

**Step 1: Import settings store**

Add at top:
```typescript
import { useSettingsStore } from '@/stores/settings-store';
```

**Step 2: Create helper to get current language**

After imports:
```typescript
const getCurrentLanguage = () => useSettingsStore.getState().language;
```

**Step 3: Update transcribeAudio to pass language**

In the formData.append section, add:
```typescript
formData.append('language', getCurrentLanguage());
```

**Step 4: Update extractInfo to pass language**

Add language to the body:
```typescript
export const extractInfo = async (data: {
  // ... existing params
}): Promise<{
  extraction: ExtractionResult;
}> => {
  return apiCall('/api/extract', {
    method: 'POST',
    body: { ...data, language: getCurrentLanguage() },
  });
};
```

**Step 5: Update generateSummary to pass language**

```typescript
export const generateSummary = async (data: {
  // ... existing params
}): Promise<string> => {
  const response = await apiCall<{ success: boolean; summary: string }>(
    '/api/summary',
    {
      method: 'POST',
      body: { ...data, language: getCurrentLanguage() },
    }
  );
  return response.summary;
};
```

**Step 6: Add settings API functions**

At end of file:
```typescript
export const getUserSettings = async (): Promise<{
  user: { id: string; name: string; email: string; preferredLanguage: string };
}> => {
  return apiCall('/api/settings');
};

export const updateUserSettings = async (data: {
  preferredLanguage?: string;
}): Promise<{
  user: { id: string; name: string; email: string; preferredLanguage: string };
}> => {
  return apiCall('/api/settings', {
    method: 'PATCH',
    body: data,
  });
};
```

**Step 7: Commit**

```bash
git add frontend/lib/api.ts
git commit -m "feat(frontend): pass language to all AI API calls"
```

---

### Task 3.9: Sync Language on Login

**Files:**
- Modify: `frontend/stores/auth-store.ts`

**Step 1: Import dependencies**

Add at top:
```typescript
import { getUserSettings } from '@/lib/api';
import { useSettingsStore } from './settings-store';
import { changeLanguage } from '@/lib/i18n';
import { Language, SUPPORTED_LANGUAGES } from '@/types';
```

**Step 2: Update initialize function**

After `set({ user, isLoading: false, isInitialized: true });`, add:
```typescript
// Sync language from backend
try {
  const { user: settings } = await getUserSettings();
  if (settings.preferredLanguage && SUPPORTED_LANGUAGES.includes(settings.preferredLanguage as Language)) {
    useSettingsStore.getState().setLanguage(settings.preferredLanguage as Language);
    changeLanguage(settings.preferredLanguage as Language);
  }
} catch {
  // Ignore settings sync errors
}
```

**Step 3: Commit**

```bash
git add frontend/stores/auth-store.ts
git commit -m "feat(auth): sync language preference on login"
```

---

### Task 3.10: Sync Language Changes to Backend

**Files:**
- Modify: `frontend/stores/settings-store.ts`

**Step 1: Import API function**

Add at top:
```typescript
import { updateUserSettings } from '@/lib/api';
import { getToken } from '@/lib/auth';
```

**Step 2: Update setLanguage to sync with backend**

Replace the setLanguage action:
```typescript
setLanguage: async (language) => {
  set({ language });

  // Sync to backend if authenticated
  const token = await getToken();
  if (token) {
    try {
      await updateUserSettings({ preferredLanguage: language });
    } catch {
      // Ignore sync errors - local change is already applied
    }
  }
},
```

**Step 3: Commit**

```bash
git add frontend/stores/settings-store.ts
git commit -m "feat(settings): sync language changes to backend"
```

---

## Phase 4: Final Integration

### Task 4.1: Update Remaining Hardcoded Strings

**Files:**
- Modify: Various files with hardcoded French strings

This task involves systematically replacing hardcoded French strings with `t('key')` calls. Focus on:
- `frontend/app/(tabs)/index.tsx`
- `frontend/app/(tabs)/contacts.tsx`
- `frontend/app/(tabs)/search.tsx`
- Component files with visible text

**Step 1: Update each file with useTranslation hook and t() calls**

Example pattern:
```typescript
import { useTranslation } from 'react-i18next';
// In component:
const { t } = useTranslation();
// Replace: "Rechercher..."
// With: {t('search.placeholder')}
```

**Step 2: Commit all string updates**

```bash
git add frontend/app/ frontend/components/
git commit -m "feat(i18n): replace hardcoded strings with translations"
```

---

### Task 4.2: Final Commit and Test

**Step 1: Run the app**

```bash
cd /home/clement/Desktop/recall-people-2026/frontend && npm start
```

**Step 2: Test checklist**

- [ ] Profile tab appears in navigation
- [ ] Profile page displays user info
- [ ] Language picker opens and shows 5 languages
- [ ] Changing language updates UI immediately
- [ ] Language persists after app restart
- [ ] Recording uses selected language for transcription
- [ ] AI extraction responds in selected language

**Step 3: Final commit**

```bash
git add -A
git commit -m "feat: complete profile tab and i18n implementation

- Add Profile tab with settings sections
- Implement i18n with 5 languages (FR, EN, ES, IT, DE)
- Auto-detect device language with fallback
- Persist language in Zustand store + backend sync
- Update Deepgram to use dynamic language
- Add language instructions to all Grok prompts"
```

---

## Summary

**Total Tasks:** 22 tasks across 4 phases

**New Files Created:**
- `frontend/types/i18n.ts`
- `frontend/locales/{fr,en,es,it,de}.json`
- `frontend/stores/settings-store.ts`
- `frontend/lib/i18n.ts`
- `frontend/components/profile/{SettingsSection,SettingsRow,ProfileHeader,LanguagePicker}.tsx`
- `frontend/app/(tabs)/profile.tsx`
- `backend/src/routes/settings.ts`

**Files Modified:**
- `frontend/package.json`
- `frontend/types/index.ts`
- `frontend/app/_layout.tsx`
- `frontend/app/(tabs)/_layout.tsx`
- `frontend/lib/api.ts`
- `frontend/stores/auth-store.ts`
- `backend/prisma/schema.prisma`
- `backend/src/index.ts`
- `backend/src/routes/{transcribe,extract,summary,search}.ts`
