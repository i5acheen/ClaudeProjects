# Meta Lead Ads setup

Connects Facebook/Instagram instant forms to `POST /api/webhooks/meta`. Menu names follow Meta's UI as of
late 2026; Meta moves things around — if a label differs, search the developer docs for the same term.

## 1. Business Manager
1. business.facebook.com → **Settings** → Business info → start **Business verification** (needed for
   App Review and higher WhatsApp limits).
2. Make sure the Facebook Page that runs the ads is owned by this Business (Accounts → Pages).

## 2. Create the Meta app
1. developers.facebook.com → **My Apps → Create app** → use case **Other** → type **Business** → link it to
   your Business portfolio. Name it e.g. "HealthConnect CRM".
2. App settings → Basic: copy **App ID** → `META_APP_ID`, **App secret** → `META_APP_SECRET`
   (Vercel only). Set Privacy Policy URL `https://<domain>/privacy-policy`, Terms URL `https://<domain>/terms`,
   category Medical/Health, app icon, and a data-deletion instructions URL (`/privacy-policy`).
3. Add products: **Webhooks** and (for the same app) **WhatsApp** (see WHATSAPP_SETUP.md).

## 3. Webhook for leadgen
1. Generate a verify token: `openssl rand -hex 32` → `META_VERIFY_TOKEN` in Vercel, redeploy.
2. Webhooks → choose object **Page** → **Subscribe to this object**:
   - Callback URL: `https://<domain>/api/webhooks/meta`
   - Verify token: the value above → **Verify and save** (our `GET` answers the challenge).
3. In the Page field list, subscribe to **leadgen**.

## 4. System User + long-lived Page token
1. Business Settings → Users → **System users** → Add (role Admin) → "crm-server".
2. **Assign assets**: the Page (full control) and the app.
3. **Generate new token** → app = your app → permissions: `leads_retrieval`, `pages_manage_metadata`,
   `pages_read_engagement`, `pages_show_list`, `ads_management` (only if you use the Conversions API later).
   Expiry: **Never**.
4. Exchange it for the Page token: `GET https://graph.facebook.com/<META_GRAPH_VERSION>/me/accounts?access_token=<system user token>`
   → take the `access_token` of your Page → `META_PAGE_ACCESS_TOKEN`; the Page `id` → `META_PAGE_ID`.
5. Subscribe the Page to the app (once):
   `POST https://graph.facebook.com/<ver>/<page-id>/subscribed_apps?subscribed_fields=leadgen&access_token=<page token>` → `{"success": true}`.
6. Business Settings → Integrations → **Leads access** → allow the app (and the System User) for the Page.
7. `META_GRAPH_VERSION`: the current version shown in Graph API Explorer (format `vNN.0`).

## 5. Lead form requirements (CLAUDE.md §6.1)
Questions: full name, phone, district/taluka, treatment (multiple choice), "Do you have an Ayushman/MJPJAY card?".
Add a **custom disclaimer** with a checkbox: "मी WhatsApp वर संपर्कासाठी संमती देतो/देते / I agree to be contacted
on WhatsApp about my treatment enquiry", linking `https://<domain>/privacy-policy`. Leads without a ticked box
are created but get **no** WhatsApp greeting — a call task is created instead.

Put the exact consent wording into Settings (it is stored verbatim with every lead in `consents`):
for now set `orgs.settings.consent_text` via SQL; then map custom questions in **Settings → Meta form field
mapping**, e.g. `{"<form id>": {"तुमचा तालुका?": "taluka"}}`.

## 6. Test with the Lead Ads Testing Tool
1. developers.facebook.com/tools/lead-ads-testing → pick Page + form → **Create lead**.
2. Within ~10 s: Vercel log `webhook.accepted`, Inngest run `lead-received` succeeds, the lead appears in
   Pipeline → New, and the greeting template is delivered to the test phone.
3. **Delete** test leads in the tool afterwards (Meta limits test leads per form).
4. If nothing arrives: RUNBOOK §4. The `meta-backfill` job also picks up missed leads every 15 minutes.

## 7. App Review / Live mode
For your own Page and Business, Standard Access is usually enough. Switch the app to **Live**. Request
Advanced Access (App Review) only if you will connect Pages not owned by your Business.
