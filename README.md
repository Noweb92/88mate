# 88Mate

> Ton copilote visa en Australie. Track tes 88 jours, vérifie les postcodes, sécurise tes preuves, exporte ton dossier.

**Stack** : Next.js 14 (App Router) · TypeScript · Tailwind · shadcn/ui · Supabase (Auth, Postgres, Storage, RLS) · Vercel

## État du build

| Sprint | Contenu | Statut |
|---|---|---|
| **1** | Setup, Auth (email + Google), Onboarding 4 écrans, schéma DB complet + RLS | ✅ fait |
| **2** | Tracker (moteur de calcul des jours), vérificateur postcode, **données officielles immi** | ✅ fait |
| 3 | Coffre-fort + OCR Claude + dashboard complet | ⏳ |
| 4 | Export PDF + Stripe + checklist → launch MVP | ⏳ |

### Données postcodes officielles

`supabase/seeds/eligible_postcodes.sql` est **généré** depuis les listes officielles
(417 : `/work-holiday-417/specified-work` ; 462 : `/work-holiday-462/specified-462-work`),
~4 700 postcodes par visa, industries par zone (regional / northern / remote / bushfire / disaster).
Pour resynchroniser après une mise à jour officielle : mettre à jour les constantes dans
`scripts/generate-eligible-postcodes.mjs` puis `node scripts/generate-eligible-postcodes.mjs`
et rejouer le SQL. L'éligibilité est vérifiée **par industrie** (ex. mining = 417 uniquement).

## Setup local

1. **Supabase** — crée un projet sur [supabase.com](https://supabase.com), puis dans le SQL Editor exécute :
   - `supabase/migrations/00001_initial_schema.sql` (schéma + RLS + bucket storage)
   - `supabase/seeds/eligible_postcodes.sql` (liste officielle des postcodes, générée)
   - `supabase/seed.sql` (award rates indicatifs)

2. **Google OAuth** — dans Supabase : Authentication → Providers → Google. Crée les credentials OAuth sur [console.cloud.google.com](https://console.cloud.google.com) avec le callback `https://<project-ref>.supabase.co/auth/v1/callback`.

3. **Env** :
   ```bash
   cp .env.example .env.local
   # remplis NEXT_PUBLIC_SUPABASE_URL et NEXT_PUBLIC_SUPABASE_ANON_KEY
   ```

4. **Run** :
   ```bash
   npm install
   npm run dev
   ```

Sans `.env.local`, seules les pages publiques (landing, login, signup) s'affichent — le middleware laisse passer mais l'auth est inopérante.

## Notes d'implémentation

- **`profiles.onboarding_completed`** : colonne ajoutée au schéma du PRD pour router proprement signup → onboarding → dashboard.
- **`visa_expiry`** : estimé à `arrival_date + 1 an − 1 jour`. Indicatif — éditable dans Settings (à venir).
- **Trigger `handle_new_user`** : crée la ligne `profiles` automatiquement à l'inscription (email et OAuth).
- **Storage** : bucket privé `documents`, chemins `userId/...`, policy RLS sur le premier segment du path.
- **Seed** : `seed.sql` contient des ÉCHANTILLONS. La vraie liste des postcodes (immi.homeaffairs.gov.au) et des award rates (fairwork.gov.au) arrive au Sprint 2 avec `source_updated_at` réels.
- **Langue UI** : anglais (cible internationale FR/DE/IT/UK…). i18n possible plus tard.

## Disclaimer

88Mate est un outil d'organisation, pas du conseil migratoire. Les exigences officielles font foi : [immi.homeaffairs.gov.au](https://immi.homeaffairs.gov.au).
