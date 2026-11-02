# Prototype (demo mode)

A no-database build of the real CRM for showing the features. Set both variables on the deployment:

```
DEMO_MODE=1
NEXT_PUBLIC_DEMO_MODE=1
```

No other configuration is needed. What changes:

- **Login** becomes a role picker: Admin, Coordinator, Hospital partner (SAMPLE Vascular Hospital), Viewer.
- **Data** comes from `lib/demo/data.ts`: ~40 fictional "SAMPLE" patients across every stage, conversations,
  documents, tasks, notes, alerts, campaigns and templates. `lib/demo/client.ts` answers the app's queries
  in memory and mirrors the access rules per role (hospital partners see only their referred patients,
  viewers no patient data).
- **Changes** (stage moves, notes, calls, replies, admissions, exports, anonymisation) work and are private to
  each visitor: they are kept as a compressed change log in the visitor's own cookies (`lib/demo/journal.ts`)
  and replayed on whichever Vercel instance answers, so they persist across instances for 12 hours. The log
  holds roughly 80 changes; beyond that the oldest drop off. "Reset sample data" in the banner clears it.
- **Team tracking**: sample calls from two coordinators' mobiles feed the admin Team page; any role can log
  a new call from a lead's profile.
- **WhatsApp and Meta** are simulated: replies are recorded as sent; webhooks answer 503.
- **AI** is off (rules only), as in the real configuration.

Never enable demo mode on a deployment that holds real patient data. The walkthrough test:
`E2E_DEMO=1 E2E_BASE_URL=<url> npx playwright test tests/e2e/demo.spec.ts`.
