# Launch Checklist - Recall People

## Status: PRE-LAUNCH

---

## 1. CRITIQUE - Sécurité (Bloquant)

### Secrets & API Keys
- [ ] Supprimer `.env.local` du repo git
- [ ] Supprimer `.dev.vars` du repo git
- [ ] Nettoyer l'historique git avec `git filter-repo`
- [ ] Rotate clé Deepgram
- [ ] Rotate clé Anthropic
- [ ] Rotate clé Google Gemini
- [ ] Rotate clé XAI
- [ ] Rotate clé Groq
- [ ] Rotate clé Cerebras
- [ ] Rotate clés RevenueCat (iOS + Android)
- [ ] Rotate JWT Secret
- [ ] Rotate mot de passe Database
- [ ] Mettre à jour `.gitignore` pour inclure `*.local`, `.dev.vars`

### Routes Admin
- [ ] Retirer ou protéger `/admin/seed` en production
- [ ] Retirer ou protéger `/admin/monitoring` en production

### CORS & API
- [ ] Supprimer les IPs de dev du CORS backend
- [ ] Vérifier que seuls les domaines prod sont autorisés

---

## 2. LÉGAL - App Store Requirements (Bloquant)

### Documents obligatoires
- [ ] Créer Privacy Policy (hébergée sur un site web)
- [ ] Créer Terms of Service / CGU
- [ ] Ajouter liens dans l'app (Settings)
- [ ] Ajouter liens dans App Store Connect / Play Console

### iOS Privacy
- [ ] Créer `PrivacyInfo.xcprivacy` dans `frontend/ios/RecallPeople/`
- [ ] Déclarer usage du microphone
- [ ] Déclarer usage de la galerie photos
- [ ] Déclarer stockage local de données utilisateur

### Permissions (descriptions spécifiques)
- [ ] iOS: Mettre à jour `NSMicrophoneUsageDescription` (expliquer pourquoi)
- [ ] iOS: Mettre à jour `NSPhotoLibraryUsageDescription` (expliquer pourquoi)
- [ ] Android: Vérifier toutes les permissions dans AndroidManifest

### RGPD / CCPA
- [ ] Endpoint suppression de compte utilisateur
- [ ] Endpoint export des données utilisateur
- [ ] UI pour demander suppression/export dans Settings

---

## 3. QUALITÉ - Avant soumission

### Error Handling
- [ ] Ajouter Error Boundary global (crash gracieux)
- [ ] Vérifier tous les toasts d'erreur (crédits, pro, etc.)
- [ ] Tester comportement offline

### Monitoring & Analytics
- [ ] Intégrer Sentry (crash reporting)
- [ ] Configurer analytics (PostHog/Amplitude/Mixpanel)
- [ ] Supprimer/wrapper les `console.log` en prod (`__DEV__`)

### Tests
- [ ] Tester sur iPhone physique
- [ ] Tester sur Android physique
- [ ] Tester le flow complet d'onboarding
- [ ] Tester achat in-app (sandbox)
- [ ] Tester restauration d'achats
- [ ] Tester push notifications
- [ ] Tester deep links

---

## 4. PRODUIT - UX/UI (Recommandé avant launch)

### Bugs connus
- [ ] Fix: Reset recording quand on quitte la page nouveau contact
- [ ] Fix: Onboarding mène sur page Recall People (pas liste contacts)

### Améliorations prioritaires
- [ ] Loader stylisé pendant transcription
- [ ] Toasts d'erreur manquants
- [ ] Mettre à jour pricing: 6.99€/mois, 59.99€/an
- [ ] Mettre à jour wording: "10 notes par mois"

### Nice to have (post-launch OK)
- [ ] Détection auto du genre pour avatar
- [ ] Upload avatar depuis galerie
- [ ] Génération avatar IA (Gemini)
- [ ] Icône IA → étoile style Gemini
- [ ] Swipe pour supprimer notifications
- [ ] Améliorer UI suggestions Explore IA

---

## 5. ASSETS & STORE

### App Store Connect (iOS)
- [ ] Screenshots iPhone 6.7" (iPhone 15 Pro Max)
- [ ] Screenshots iPhone 6.5" (iPhone 11 Pro Max)
- [ ] Screenshots iPad Pro 12.9"
- [ ] App Preview vidéo (optionnel mais recommandé)
- [ ] Icône 1024x1024
- [ ] Description courte
- [ ] Description longue
- [ ] Keywords
- [ ] Catégorie
- [ ] Age rating questionnaire
- [ ] Privacy nutrition labels

### Google Play Console (Android)
- [ ] Screenshots phone
- [ ] Screenshots tablet 7"
- [ ] Screenshots tablet 10"
- [ ] Feature graphic 1024x500
- [ ] Icône 512x512
- [ ] Description courte (80 chars)
- [ ] Description longue (4000 chars)
- [ ] Catégorie
- [ ] Content rating questionnaire
- [ ] Data safety form

---

## 6. BACKEND - Production

### Cloudflare Workers
- [ ] Vérifier tous les secrets sont configurés en prod
- [ ] Vérifier rate limiting activé
- [ ] Vérifier logs/monitoring
- [ ] Tester endpoints en prod

### Database
- [ ] Backup automatique configuré
- [ ] Vérifier performances (indexes)

### AI Providers
- [ ] Vérifier quotas/limites des APIs
- [ ] Plan de fallback si un provider down

---

## 7. POST-LAUNCH

### Monitoring
- [ ] Dashboard Sentry configuré
- [ ] Alertes configurées (errors spike)
- [ ] Dashboard analytics configuré

### Support
- [ ] Email support configuré
- [ ] Process pour répondre aux reviews

### Itération
- [ ] Collecter feedback utilisateurs
- [ ] Prioriser bugs vs features

---

## Notes

**Date objectif launch:** _______________

**Version app:** `1.0.0` (build `___`)

**Dernière mise à jour checklist:** 2026-01-12

---

## Commandes utiles

```bash
# Nettoyer secrets de l'historique git
git filter-repo --invert-paths --path .env.local --path backend/.dev.vars

# Build iOS
cd frontend && eas build --platform ios --profile production

# Build Android
cd frontend && eas build --platform android --profile production

# Submit iOS
eas submit --platform ios

# Submit Android
eas submit --platform android
```
