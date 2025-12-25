# UI Redesign - Recall People

## Design System

### Palette de Couleurs

| Nom | Valeur | Usage |
|-----|--------|-------|
| `background` | `#FAF7F2` | Fond principal (crème chaud) |
| `surface` | `#FFFFFF` | Cards, modals |
| `textPrimary` | `#1A1612` | Texte principal (brun foncé) |
| `textSecondary` | `#6B5E54` | Texte secondaire |
| `textMuted` | `#9C9083` | Texte désactivé |
| `textInverse` | `#FFFFFF` | Texte sur fond sombre |
| `primary` | `#C67C4E` | Accent terracotta |
| `primaryLight` | `#E8D5C4` | Fond accent clair |
| `primaryDark` | `#A65D2E` | Accent hover |
| `border` | `#E8E2DB` | Bordures |
| `error` | `#DC2626` | Erreurs |
| `success` | `#16A34A` | Succès |
| `warning` | `#F59E0B` | Hot topics actifs |

### Typographie

| Type | Font | Weight |
|------|------|--------|
| Titres écran | Playfair Display | 700 Bold |
| Titres section | Playfair Display | 600 SemiBold |
| Corps de texte | System (sans-serif) | Regular |
| Labels/Boutons | System (sans-serif) | 500-600 |

**Note:** La font Playfair Display doit être installée via:
```bash
npx expo install @expo-google-fonts/playfair-display expo-font
```

### Spacing & Border Radius

- **Spacing:** 4, 8, 12, 16, 20, 24, 32, 40, 48
- **Border Radius:** 8 (sm), 12 (md), 16 (lg), 20 (xl), 9999 (full)

### Shadows

```typescript
cardShadow: {
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.04,
  shadowRadius: 8,
  elevation: 2,
}
```

---

## Migration Actuelle

### Fichiers Modifiés/Créés

#### Core Design System
- [x] `/frontend/global.css` - Nouvelle palette CSS
- [x] `/frontend/tailwind.config.js` - Config Tailwind mise à jour
- [x] `/frontend/constants/theme.ts` - Export Colors, Spacing, Fonts, etc.

#### Navigation
- [x] `/frontend/app/_layout.tsx` - Chargement des fonts + headers
- [x] `/frontend/app/(tabs)/_layout.tsx` - 2 tabs + FAB central
- [x] `/frontend/components/ui/CustomTabBar.tsx` - Nouvelle tab bar avec FAB

#### Écrans Redesignés
- [x] `/frontend/app/record.tsx` - Écran enregistrement zen (NOUVEAU)
- [x] `/frontend/app/(auth)/login.tsx` - Login immersif avec branding
- [x] `/frontend/app/(tabs)/contacts.tsx` - Liste contacts avec cards enrichies
- [x] `/frontend/app/contact/[id].tsx` - Détail contact avec hero section

#### Composants
- [x] `/frontend/components/RecordButton.tsx` - Bouton avec animation ring

### État des Écrans

| Écran | Status | Notes |
|-------|--------|-------|
| Login | ✅ Terminé | Hero section + animations FadeIn |
| Register | ⏳ À faire | Même style que login |
| Contacts (liste) | ✅ Terminé | Cards enrichies + facts + hot topics |
| Contact Detail | ✅ Terminé | Hero + sections animées |
| Record | ✅ Terminé | Minimaliste zen + helper prompts |
| Search | ⏳ À faire | Refonte à prévoir |
| Profile | ⏳ À faire | Refonte à prévoir |

### Composants Enfants à Mettre à Jour

Ces composants utilisent encore les anciens styles (classNames NativeWind avec couleurs anciennes):

- [ ] `/frontend/components/contact/ProfileCard.tsx` - Couleurs hardcodées (#18181b, #8b5cf6)
- [ ] `/frontend/components/contact/HotTopicsList.tsx` - Couleurs hardcodées
- [ ] `/frontend/components/contact/AISummary.tsx` - Couleurs hardcodées
- [ ] `/frontend/components/contact/MemoriesList.tsx` - À vérifier
- [ ] `/frontend/components/contact/TranscriptionArchive.tsx` - À vérifier

---

## TODO pour Terminer

### Priorité Haute (fonctionnalité)
1. [ ] Mettre à jour `ProfileCard.tsx` avec Colors du theme
2. [ ] Mettre à jour `HotTopicsList.tsx` avec Colors du theme
3. [ ] Mettre à jour `AISummary.tsx` avec Colors du theme
4. [ ] Mettre à jour `MemoriesList.tsx` avec Colors du theme
5. [ ] Mettre à jour `TranscriptionArchive.tsx` avec Colors du theme

### Priorité Moyenne (écrans restants)
6. [ ] Refondre l'écran Register (`/(auth)/register.tsx`)
7. [ ] Refondre l'écran Search (`/(tabs)/search.tsx` ou `index.tsx`)
8. [ ] Refondre l'écran Profile (`/(tabs)/profile.tsx`)

### Priorité Basse (polish)
9. [ ] Vérifier toutes les traductions i18n (certains textes sont hardcodés en français)
10. [ ] Ajouter animations de transition entre écrans
11. [ ] Tester sur iOS et Android
12. [ ] Vérifier le thème sur les modals/bottom sheets

---

## Notes Techniques

### Navigation
La navigation est maintenant:
- **Tab 1:** Contacts (icône Users)
- **FAB Central:** Bouton enregistrement (pousse vers `/record`)
- **Tab 2:** Profil (icône User)

L'écran Home/Index et Search sont cachés (`href: null`) mais accessibles programmatiquement.

### Animations
Utilise `react-native-reanimated`:
- `FadeIn`, `FadeInDown`, `FadeInUp` pour les entrées
- `withSpring` pour les interactions tactiles (FAB, boutons)
- `withRepeat` + `withSequence` pour l'animation du ring d'enregistrement

### Fonts
Les fonts sont chargées dans `_layout.tsx`:
```typescript
const [fontsLoaded] = useFonts({
  PlayfairDisplay_400Regular,
  PlayfairDisplay_500Medium,
  PlayfairDisplay_600SemiBold,
  PlayfairDisplay_700Bold,
});
```

L'app attend que les fonts soient chargées avant de s'afficher.

---

## Pour Reprendre

1. Lire ce fichier pour le contexte
2. Continuer avec les composants enfants (ProfileCard, etc.)
3. Puis les écrans restants (Register, Search, Profile)
4. Tester l'ensemble sur émulateur/device
