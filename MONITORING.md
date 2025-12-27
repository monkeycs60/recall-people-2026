# 📊 Monitoring & Audit Logging - Recall People

Ce document décrit comment utiliser le système d'audit logging pour monitorer, analyser et sécuriser l'application Recall People.

---

## 🎯 Table des Matières

1. [API Admin - Endpoints](#api-admin---endpoints)
2. [Requêtes SQL Directes](#requêtes-sql-directes)
3. [Cas d'Usage](#cas-dusage)
4. [Dashboard & Visualisation](#dashboard--visualisation)
5. [Alertes Automatiques](#alertes-automatiques)
6. [Outils Recommandés](#outils-recommandés)

---

## 🔐 API Admin - Endpoints

### Configuration Admin

Par défaut, l'accès admin est limité à l'email configuré dans `backend/src/routes/admin.ts` :

```typescript
// Option 1: Email spécifique (par défaut)
const isAdmin = user.email === 'admin@recall-people.com';

// Option 2: Ajouter un champ isAdmin dans le schema Prisma
model User {
  // ... autres champs
  isAdmin Boolean @default(false)
}

// Option 3: Table admins séparée
model Admin {
  id     String @id @default(cuid())
  userId String @unique
  user   User   @relation(fields: [userId], references: [id])
}
```

### Endpoints Disponibles

Tous les endpoints admin nécessitent :
- Un token JWT valide (header `Authorization: Bearer <token>`)
- Un compte avec privilèges admin

#### 1. **GET /admin/logs** - Récupérer les logs

Récupère les logs d'audit avec filtres optionnels.

**Query Parameters:**
- `action` (string, optionnel) : Filtrer par action (login, register, transcribe, etc.)
- `userId` (string, optionnel) : Filtrer par utilisateur
- `success` (string, optionnel) : "true" ou "false"
- `limit` (string, optionnel) : Nombre de résultats (défaut: 100)
- `offset` (string, optionnel) : Offset pour pagination (défaut: 0)

**Exemple:**
```bash
curl -H "Authorization: Bearer <token>" \
  "https://api.recall-people.com/admin/logs?action=login&success=false&limit=50"
```

**Réponse:**
```json
{
  "logs": [
    {
      "id": "cm5abc123...",
      "userId": "cm5xyz789...",
      "action": "login",
      "resource": "auth",
      "success": false,
      "ipAddress": "192.168.1.100",
      "userAgent": "Mozilla/5.0...",
      "details": "{\"error\":\"Invalid password\"}",
      "createdAt": "2025-12-27T10:30:00.000Z"
    }
  ],
  "pagination": {
    "total": 150,
    "limit": 50,
    "offset": 0,
    "hasMore": true
  }
}
```

---

#### 2. **GET /admin/stats** - Statistiques globales

Vue d'ensemble des métriques clés de l'application.

**Exemple:**
```bash
curl -H "Authorization: Bearer <token>" \
  "https://api.recall-people.com/admin/stats"
```

**Réponse:**
```json
{
  "users": {
    "total": 1250,
    "newToday": 15,
    "activeToday": 340,
    "activeThisWeek": 890
  },
  "activity": {
    "totalActions": 45230,
    "actionsToday": 2340,
    "errorsToday": 12,
    "errorRatePercent": 0.51
  },
  "topActions": [
    { "action": "search", "count": 8920 },
    { "action": "transcribe", "count": 5430 },
    { "action": "extract", "count": 4210 }
  ]
}
```

---

#### 3. **GET /admin/security/suspicious-ips** - Détection d'IPs suspectes

Détecte les IPs avec plus de 5 tentatives de login échouées dans la dernière heure.

**Exemple:**
```bash
curl -H "Authorization: Bearer <token>" \
  "https://api.recall-people.com/admin/security/suspicious-ips"
```

**Réponse:**
```json
{
  "suspiciousIPs": [
    {
      "ipAddress": "45.123.45.67",
      "failedAttempts": 12,
      "lastAttempt": "2025-12-27T10:45:00.000Z"
    },
    {
      "ipAddress": "89.234.56.78",
      "failedAttempts": 8,
      "lastAttempt": "2025-12-27T10:42:00.000Z"
    }
  ]
}
```

**Action recommandée:** Bloquer ces IPs dans Cloudflare ou ajouter une rate limit plus stricte.

---

#### 4. **GET /admin/users/active** - Utilisateurs les plus actifs

Liste des utilisateurs les plus actifs sur les 7 derniers jours.

**Query Parameters:**
- `limit` (string, optionnel) : Nombre d'utilisateurs (défaut: 10)

**Exemple:**
```bash
curl -H "Authorization: Bearer <token>" \
  "https://api.recall-people.com/admin/users/active?limit=20"
```

**Réponse:**
```json
{
  "activeUsers": [
    {
      "userId": "cm5abc123...",
      "email": "user@example.com",
      "name": "John Doe",
      "actionsCount": 245
    }
  ]
}
```

---

#### 5. **GET /admin/errors/recent** - Erreurs récentes

Liste des erreurs récentes avec détails complets.

**Query Parameters:**
- `limit` (string, optionnel) : Nombre d'erreurs (défaut: 50)

**Exemple:**
```bash
curl -H "Authorization: Bearer <token>" \
  "https://api.recall-people.com/admin/errors/recent?limit=100"
```

**Réponse:**
```json
{
  "errors": [
    {
      "id": "cm5err123...",
      "createdAt": "2025-12-27T10:30:00.000Z",
      "action": "transcribe",
      "resource": "transcribe",
      "details": "{\"error\":\"Deepgram API timeout\"}",
      "userId": "cm5usr456...",
      "ipAddress": "192.168.1.100",
      "userAgent": "Mozilla/5.0..."
    }
  ]
}
```

---

#### 6. **GET /admin/analytics/usage** - Analytics d'utilisation

Statistiques d'utilisation par feature.

**Query Parameters:**
- `days` (string, optionnel) : Période en jours (défaut: 7)

**Exemple:**
```bash
curl -H "Authorization: Bearer <token>" \
  "https://api.recall-people.com/admin/analytics/usage?days=30"
```

**Réponse:**
```json
{
  "period": "Last 30 days",
  "usage": [
    {
      "action": "search",
      "successCount": 8920,
      "failedCount": 45,
      "totalCount": 8965,
      "successRate": 99
    },
    {
      "action": "transcribe",
      "successCount": 5400,
      "failedCount": 30,
      "totalCount": 5430,
      "successRate": 99
    }
  ]
}
```

---

## 💾 Requêtes SQL Directes

Pour des analyses plus avancées, tu peux interroger directement la base de données.

### 1. Monitoring de Sécurité

#### Tentatives de login échouées par IP (dernière heure)
```sql
SELECT
  "ipAddress",
  COUNT(*) as failed_attempts,
  MAX("createdAt") as last_attempt
FROM audit_logs
WHERE action = 'login'
  AND success = false
  AND "createdAt" > NOW() - INTERVAL '1 hour'
  AND "ipAddress" IS NOT NULL
GROUP BY "ipAddress"
HAVING COUNT(*) > 5
ORDER BY failed_attempts DESC;
```

#### Tokens refresh depuis plusieurs IPs (compte compromis ?)
```sql
SELECT
  "userId",
  COUNT(DISTINCT "ipAddress") as unique_ips,
  array_agg(DISTINCT "ipAddress") as ip_addresses
FROM audit_logs
WHERE action = 'token_refresh'
  AND "createdAt" > NOW() - INTERVAL '24 hours'
GROUP BY "userId"
HAVING COUNT(DISTINCT "ipAddress") > 3;
```

#### Détection de patterns d'attaque (brute force)
```sql
SELECT
  "ipAddress",
  "userAgent",
  COUNT(*) as total_attempts,
  COUNT(DISTINCT details->>'email') as unique_emails_tried,
  MIN("createdAt") as first_attempt,
  MAX("createdAt") as last_attempt
FROM audit_logs
WHERE action = 'login'
  AND success = false
  AND "createdAt" > NOW() - INTERVAL '24 hours'
GROUP BY "ipAddress", "userAgent"
HAVING COUNT(*) > 10 OR COUNT(DISTINCT details->>'email') > 5
ORDER BY total_attempts DESC;
```

---

### 2. Analytics d'Utilisation

#### Features les plus utilisées (7 derniers jours)
```sql
SELECT
  action,
  COUNT(*) as usage_count,
  COUNT(*) FILTER (WHERE success = true) as success_count,
  COUNT(*) FILTER (WHERE success = false) as error_count,
  ROUND(
    100.0 * COUNT(*) FILTER (WHERE success = true) / COUNT(*),
    2
  ) as success_rate_percent
FROM audit_logs
WHERE "createdAt" > NOW() - INTERVAL '7 days'
  AND "userId" IS NOT NULL
GROUP BY action
ORDER BY usage_count DESC;
```

#### Taux d'erreur par endpoint (24h)
```sql
SELECT
  resource,
  action,
  COUNT(*) FILTER (WHERE success = true) as success_count,
  COUNT(*) FILTER (WHERE success = false) as error_count,
  ROUND(
    100.0 * COUNT(*) FILTER (WHERE success = false) / COUNT(*),
    2
  ) as error_rate_percent
FROM audit_logs
WHERE "createdAt" > NOW() - INTERVAL '24 hours'
GROUP BY resource, action
ORDER BY error_rate_percent DESC;
```

#### Temps de traitement moyen pour la recherche
```sql
SELECT
  AVG(CAST(details->>'processingTimeMs' AS INTEGER)) as avg_processing_ms,
  PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY CAST(details->>'processingTimeMs' AS INTEGER)) as median_ms,
  PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY CAST(details->>'processingTimeMs' AS INTEGER)) as p95_ms,
  MIN(CAST(details->>'processingTimeMs' AS INTEGER)) as min_processing_ms,
  MAX(CAST(details->>'processingTimeMs' AS INTEGER)) as max_processing_ms
FROM audit_logs
WHERE action = 'search'
  AND success = true
  AND details->>'processingTimeMs' IS NOT NULL
  AND "createdAt" > NOW() - INTERVAL '24 hours';
```

#### Langues les plus utilisées
```sql
SELECT
  details->>'language' as language,
  COUNT(*) as usage_count,
  ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER (), 2) as percentage
FROM audit_logs
WHERE details->>'language' IS NOT NULL
  AND "createdAt" > NOW() - INTERVAL '30 days'
GROUP BY details->>'language'
ORDER BY usage_count DESC;
```

---

### 3. Métriques Utilisateurs

#### Utilisateurs actifs quotidiens (DAU) - 30 derniers jours
```sql
SELECT
  DATE("createdAt") as date,
  COUNT(DISTINCT "userId") as active_users
FROM audit_logs
WHERE "userId" IS NOT NULL
  AND "createdAt" > NOW() - INTERVAL '30 days'
GROUP BY DATE("createdAt")
ORDER BY date DESC;
```

#### Nouveaux utilisateurs par jour
```sql
SELECT
  DATE("createdAt") as registration_date,
  COUNT(*) as new_users
FROM audit_logs
WHERE action = 'register'
  AND success = true
GROUP BY DATE("createdAt")
ORDER BY registration_date DESC;
```

#### Top 10 utilisateurs les plus actifs (7 jours)
```sql
SELECT
  u.id,
  u.email,
  u.name,
  COUNT(*) as actions_count,
  COUNT(DISTINCT al.action) as unique_actions,
  MIN(al."createdAt") as first_action,
  MAX(al."createdAt") as last_action
FROM audit_logs al
JOIN users u ON al."userId" = u.id
WHERE al."createdAt" > NOW() - INTERVAL '7 days'
GROUP BY u.id, u.email, u.name
ORDER BY actions_count DESC
LIMIT 10;
```

#### Taux de rétention (cohorte J0 → J7)
```sql
WITH first_login AS (
  SELECT
    "userId",
    MIN(DATE("createdAt")) as cohort_date
  FROM audit_logs
  WHERE action = 'login'
    AND success = true
  GROUP BY "userId"
),
cohort_activity AS (
  SELECT
    fl.cohort_date,
    fl."userId",
    COUNT(DISTINCT al."userId") FILTER (
      WHERE DATE(al."createdAt") BETWEEN fl.cohort_date + 6 AND fl.cohort_date + 8
    ) as returned_day_7
  FROM first_login fl
  LEFT JOIN audit_logs al ON fl."userId" = al."userId"
  GROUP BY fl.cohort_date, fl."userId"
)
SELECT
  cohort_date,
  COUNT(DISTINCT "userId") as cohort_size,
  COUNT(*) FILTER (WHERE returned_day_7 > 0) as retained_day_7,
  ROUND(
    100.0 * COUNT(*) FILTER (WHERE returned_day_7 > 0) / COUNT(DISTINCT "userId"),
    2
  ) as retention_rate_percent
FROM cohort_activity
GROUP BY cohort_date
ORDER BY cohort_date DESC;
```

---

### 4. Debugging & Support

#### Timeline complète d'un utilisateur
```sql
SELECT
  "createdAt",
  action,
  resource,
  success,
  details,
  "ipAddress",
  "userAgent"
FROM audit_logs
WHERE "userId" = 'cm5abc123...' -- Remplacer par l'ID utilisateur
ORDER BY "createdAt" DESC
LIMIT 100;
```

#### Dernières erreurs avec contexte complet
```sql
SELECT
  al."createdAt",
  al.action,
  al.resource,
  al.details->>'error' as error_message,
  al."ipAddress",
  u.email,
  u.name
FROM audit_logs al
LEFT JOIN users u ON al."userId" = u.id
WHERE al.success = false
  AND al."createdAt" > NOW() - INTERVAL '24 hours'
ORDER BY al."createdAt" DESC
LIMIT 50;
```

#### Recherche d'erreur spécifique
```sql
SELECT
  "createdAt",
  action,
  resource,
  "userId",
  details,
  "ipAddress"
FROM audit_logs
WHERE success = false
  AND details::text ILIKE '%timeout%' -- Recherche flexible
  AND "createdAt" > NOW() - INTERVAL '7 days'
ORDER BY "createdAt" DESC;
```

---

## 🎨 Cas d'Usage

### Use Case 1: Détection d'Attaque en Cours

**Symptôme:** Pic soudain de requêtes échouées

**Action:**
```bash
# 1. Vérifier les IPs suspectes
curl -H "Authorization: Bearer <token>" \
  "https://api.recall-people.com/admin/security/suspicious-ips"

# 2. Analyser le pattern
psql -c "SELECT action, COUNT(*), MIN(created_at), MAX(created_at)
FROM audit_logs
WHERE success = false
  AND created_at > NOW() - INTERVAL '1 hour'
GROUP BY action;"

# 3. Bloquer l'IP dans Cloudflare
# ou ajouter une règle de rate limit plus stricte
```

---

### Use Case 2: Debugging d'une Erreur Utilisateur

**Symptôme:** Un utilisateur signale un problème

**Action:**
```bash
# 1. Récupérer son userId depuis son email
psql -c "SELECT id FROM users WHERE email = 'user@example.com';"

# 2. Voir sa timeline récente
curl -H "Authorization: Bearer <token>" \
  "https://api.recall-people.com/admin/logs?userId=cm5abc123&limit=50"

# 3. Analyser les erreurs spécifiques
psql -c "SELECT * FROM audit_logs
WHERE user_id = 'cm5abc123'
  AND success = false
ORDER BY created_at DESC
LIMIT 10;"
```

---

### Use Case 3: Monitoring Quotidien

**Dashboard matinal:**
```bash
# 1. Stats globales
curl -H "Authorization: Bearer <token>" \
  "https://api.recall-people.com/admin/stats"

# 2. Vérifier les erreurs de la nuit
curl -H "Authorization: Bearer <token>" \
  "https://api.recall-people.com/admin/errors/recent?limit=20"

# 3. Analyser les performances
curl -H "Authorization: Bearer <token>" \
  "https://api.recall-people.com/admin/analytics/usage?days=1"
```

---

## 📊 Dashboard & Visualisation

### Option 1: Dashboard Admin Custom (React/Next.js)

Créer une interface admin avec :

```typescript
// pages/admin/dashboard.tsx
import { useEffect, useState } from 'react';

function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [errors, setErrors] = useState([]);

  useEffect(() => {
    // Récupérer les stats toutes les 30 secondes
    const fetchData = async () => {
      const [statsRes, errorsRes] = await Promise.all([
        fetch('/admin/stats', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/admin/errors/recent?limit=10', { headers: { Authorization: `Bearer ${token}` } }),
      ]);

      setStats(await statsRes.json());
      setErrors(await errorsRes.json());
    };

    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="dashboard">
      <div className="stats-grid">
        <StatCard title="Total Users" value={stats?.users.total} />
        <StatCard title="Active Today" value={stats?.users.activeToday} />
        <StatCard title="Error Rate" value={`${stats?.activity.errorRatePercent}%`} />
      </div>

      <ErrorsList errors={errors} />

      <UsageChart data={stats?.topActions} />
    </div>
  );
}
```

**Composants recommandés:**
- Graphiques temps réel (Recharts, Chart.js)
- Tables de données (Tanstack Table)
- Filtres et recherche
- Export CSV/JSON

---

### Option 2: Grafana + PostgreSQL

Configuration Grafana pour visualiser les métriques :

```yaml
# datasource.yml
apiVersion: 1
datasources:
  - name: Recall People DB
    type: postgres
    url: your-neon-db-url
    database: recall_people
    user: ${DB_USER}
    jsonData:
      sslmode: require
```

**Dashboards Grafana recommandés:**
1. **Security Dashboard** : IPs suspectes, tentatives de login, patterns d'attaque
2. **Performance Dashboard** : Temps de réponse, taux d'erreur, latence
3. **Business Dashboard** : DAU, MAU, rétention, features les plus utilisées

**Exemples de panels:**
```sql
-- Panel: Utilisateurs actifs en temps réel (15 min sliding window)
SELECT
  time_bucket('1 minute', created_at) as time,
  COUNT(DISTINCT user_id) as active_users
FROM audit_logs
WHERE created_at > NOW() - INTERVAL '15 minutes'
GROUP BY time
ORDER BY time;

-- Panel: Taux d'erreur par minute
SELECT
  time_bucket('1 minute', created_at) as time,
  COUNT(*) FILTER (WHERE success = false) * 100.0 / COUNT(*) as error_rate
FROM audit_logs
WHERE created_at > NOW() - INTERVAL '1 hour'
GROUP BY time
ORDER BY time;
```

---

### Option 3: Metabase (Business Intelligence)

Metabase permet de créer des dashboards sans code SQL.

**Questions pré-configurées:**
1. "Quels sont les utilisateurs les plus actifs cette semaine ?"
2. "Quel est le taux de rétention J7 par cohorte ?"
3. "Quelles features ont le plus haut taux d'erreur ?"
4. "Combien de nouveaux utilisateurs par jour ce mois ?"

---

## 🔔 Alertes Automatiques

### Option 1: Cloudflare Workers Cron

Créer un worker qui vérifie les logs périodiquement :

```typescript
// backend/src/scheduled/security-monitor.ts
export async function checkSecurityAlerts(env: Bindings) {
  const prisma = getPrisma(env.DATABASE_URL);
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

  // Vérifier les IPs suspectes
  const suspiciousIPs = await prisma.$queryRaw`
    SELECT "ipAddress", COUNT(*) as failed_count
    FROM audit_logs
    WHERE action = 'login'
      AND success = false
      AND "createdAt" > ${oneHourAgo}
    GROUP BY "ipAddress"
    HAVING COUNT(*) > 10
  `;

  if (suspiciousIPs.length > 0) {
    await sendAlert({
      type: 'security',
      severity: 'high',
      message: `${suspiciousIPs.length} IP(s) suspecte(s) détectée(s)`,
      data: suspiciousIPs,
    });
  }

  // Vérifier le taux d'erreur
  const errorRate = await prisma.auditLog.groupBy({
    by: ['success'],
    where: { createdAt: { gte: oneHourAgo } },
    _count: true,
  });

  const successCount = errorRate.find(r => r.success)?._count || 0;
  const failCount = errorRate.find(r => !r.success)?._count || 0;
  const totalCount = successCount + failCount;
  const errorPercent = totalCount > 0 ? (failCount / totalCount) * 100 : 0;

  if (errorPercent > 5) {
    await sendAlert({
      type: 'performance',
      severity: 'medium',
      message: `Taux d'erreur élevé: ${errorPercent.toFixed(2)}%`,
      data: { successCount, failCount, errorPercent },
    });
  }
}

// Fonction d'envoi d'alerte (Slack, Discord, Email, etc.)
async function sendAlert(alert: any) {
  // Slack
  await fetch(process.env.SLACK_WEBHOOK_URL, {
    method: 'POST',
    body: JSON.stringify({
      text: `🚨 ${alert.message}`,
      blocks: [
        {
          type: 'section',
          text: { type: 'mrkdwn', text: `*${alert.type}* - ${alert.severity}` },
        },
        {
          type: 'section',
          text: { type: 'mrkdwn', text: alert.message },
        },
      ],
    }),
  });

  // Discord
  // await fetch(process.env.DISCORD_WEBHOOK_URL, ...)

  // Email (via Resend, SendGrid, etc.)
  // await sendEmail(...)
}
```

**Configuration Cron (wrangler.toml):**
```toml
[triggers]
crons = ["*/15 * * * *"]  # Toutes les 15 minutes
```

---

### Option 2: Sentry (Monitoring d'Erreurs)

Intégrer Sentry pour tracker les erreurs automatiquement :

```typescript
// backend/src/lib/sentry.ts
import * as Sentry from '@sentry/cloudflare';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  tracesSampleRate: 0.1,
});

// Dans chaque route
try {
  // ... code
} catch (error) {
  Sentry.captureException(error, {
    tags: { action: 'transcribe', userId: user.id },
    extra: { details: body },
  });
  throw error;
}
```

---

## 🛠️ Outils Recommandés

### Monitoring & Observabilité
- **Grafana** : Dashboards et visualisations
- **Datadog** : APM complet (payant)
- **New Relic** : Performance monitoring
- **Sentry** : Error tracking
- **LogFlare** : Real-time logging pour Cloudflare

### Business Intelligence
- **Metabase** : BI open-source facile
- **Superset** : BI Apache (plus avancé)
- **Looker** : Google Data Studio (gratuit)

### Alerting
- **PagerDuty** : On-call alerting
- **Opsgenie** : Incident management
- **Slack/Discord** : Notifications simples
- **Better Uptime** : Uptime monitoring + alertes

### Database Tools
- **Prisma Studio** : GUI pour Prisma
- **pgAdmin** : Administration PostgreSQL
- **DBeaver** : Client SQL universel

---

## 📈 Métriques Clés à Suivre

### Sécurité
- ✅ Tentatives de login échouées par IP
- ✅ Tokens refresh depuis plusieurs IPs
- ✅ Taux d'erreur 401/403
- ✅ Patterns de brute force

### Performance
- ✅ Temps de réponse API (P50, P95, P99)
- ✅ Taux d'erreur par endpoint
- ✅ Temps de traitement IA (transcribe, extract, search)
- ✅ Latence base de données

### Business
- ✅ DAU (Daily Active Users)
- ✅ MAU (Monthly Active Users)
- ✅ Taux de rétention J7, J30
- ✅ Nouveaux utilisateurs / jour
- ✅ Features les plus utilisées

### Qualité
- ✅ Taux de succès des transcriptions
- ✅ Confiance moyenne Deepgram
- ✅ Temps moyen de recherche IA
- ✅ Taux d'utilisation par langue

---

## 🎯 Quick Start

### 1. Configuration Admin

```bash
# 1. Définir ton email admin dans backend/src/routes/admin.ts
const isAdmin = user.email === 'ton-email@example.com';

# 2. Déployer le backend
cd backend
npm run deploy

# 3. Tester l'accès admin
curl -H "Authorization: Bearer <token>" \
  "https://api.recall-people.com/admin/stats"
```

### 2. Premier Dashboard

```sql
-- Créer une vue pour faciliter les requêtes
CREATE VIEW daily_stats AS
SELECT
  DATE(created_at) as date,
  action,
  COUNT(*) as total_count,
  COUNT(*) FILTER (WHERE success = true) as success_count,
  COUNT(*) FILTER (WHERE success = false) as error_count,
  COUNT(DISTINCT user_id) as unique_users
FROM audit_logs
GROUP BY DATE(created_at), action;

-- Utiliser la vue
SELECT * FROM daily_stats
WHERE date > CURRENT_DATE - 7
ORDER BY date DESC, total_count DESC;
```

### 3. Première Alerte

```typescript
// Ajouter un script de vérification quotidien
async function dailyHealthCheck() {
  const stats = await fetch('https://api.recall-people.com/admin/stats', {
    headers: { Authorization: `Bearer ${ADMIN_TOKEN}` },
  }).then(r => r.json());

  // Envoyer un résumé quotidien
  await sendSlackMessage({
    text: `📊 Résumé quotidien Recall People`,
    blocks: [
      { type: 'section', text: { type: 'mrkdwn', text: `*Utilisateurs*\nTotal: ${stats.users.total} | Actifs aujourd'hui: ${stats.users.activeToday}` }},
      { type: 'section', text: { type: 'mrkdwn', text: `*Activité*\nActions: ${stats.activity.actionsToday} | Erreurs: ${stats.activity.errorsToday} (${stats.activity.errorRatePercent}%)` }},
    ],
  });
}
```

---

## 📚 Ressources Complémentaires

- [Prisma Metrics](https://www.prisma.io/docs/guides/performance-and-optimization/query-optimization-performance)
- [PostgreSQL Performance Tips](https://wiki.postgresql.org/wiki/Performance_Optimization)
- [Grafana PostgreSQL Dashboard](https://grafana.com/grafana/dashboards/9628-postgresql-database/)
- [Cloudflare Workers Analytics](https://developers.cloudflare.com/workers/observability/logging/)

---

**Dernière mise à jour :** 27 décembre 2025
**Auteur :** Claude (Anthropic)
**Version :** 1.0.0
