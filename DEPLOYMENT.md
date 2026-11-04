# Deploy & Google OAuth Setup

## Current deployment

| Item | Value |
| --- | --- |
| GitHub repository | https://github.com/MomenEllaban/printing |
| Vercel dashboard | https://vercel.com/momenellabans-projects/printing-momenellaban |
| Production URL | https://printing-momenellaban.vercel.app |
| Actual callback path | `/api/auth/google/callback` |
| Final redirect URI | `https://printing-momenellaban.vercel.app/api/auth/google/callback` |

> Important: the real callback path in this project is `/api/auth/google/callback`
> (not `/api/auth/callback/google`).

## Environment variables already set on Vercel

These are configured for Production, Preview, and Development:

- `DATABASE_URL`
- `DIRECT_URL`
- `SESSION_SECRET`
- `ENCRYPTION_KEY`
- `NEXT_PUBLIC_APP_URL` = `https://printing-momenellaban.vercel.app`
- `GOOGLE_REDIRECT_URI` = `https://printing-momenellaban.vercel.app/api/auth/google/callback`
- `DEMO_MODE` = `0`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`

The Google OAuth client ID and secret are configured in Vercel as encrypted
environment variables. They are intentionally not stored in this repository.

## Google OAuth status

- OAuth client: configured
- Client ID and Client Secret: added to Vercel
- Redirect URI: configured
- Consent screen: must be moved from **Testing** to **Production** (see below)
- Privacy policy: https://printing-momenellaban.vercel.app/privacy
- Terms of service: https://printing-momenellaban.vercel.app/terms

Optional:

| Key | Purpose |
| --- | --- |
| `GOOGLE_ACCOUNT_EMAIL` | The Google account email shown in the UI |
| `GOOGLE_DRIVE_ROOT_FOLDER_ID` | Restrict the app to a specific Drive folder |

Do **not** commit these values or the `.env` file to GitHub.

## Google Cloud Console setup

1. Open https://console.cloud.google.com/
2. Select the project you want to use, or create a new one.
3. Enable the **Google Drive API**:
   - APIs & Services → Library → search for “Google Drive API” → Enable.
4. Configure the OAuth consent screen:
   - APIs & Services → OAuth consent screen.
   - Add scopes:
     - `https://www.googleapis.com/auth/drive`
     - `https://www.googleapis.com/auth/userinfo.email`
   - Add your Google account as a test user if the app is in “Testing” mode.
5. Create the OAuth client:
   - APIs & Services → Credentials → Create Credentials → OAuth client ID.
   - Application type: **Web application**.
   - Authorized JavaScript origins:
     - `https://printing-momenellaban.vercel.app`
   - Authorized redirect URIs:
     - `https://printing-momenellaban.vercel.app/api/auth/google/callback`
6. Copy the generated **Client ID** and **Client Secret**.
7. Add them to Vercel as `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`.
8. Redeploy the project:
   - Vercel → Deployments → latest deployment → “Redeploy”.
   - Or push a new commit to `main`; the project is linked to GitHub and deploys automatically.

## Publish the OAuth app (leave Testing mode)

Publishing is done from the Google Cloud project `printing-513609`. Only the
Google account that owns the project can click **Publish**; there is no CLI/API
for this step.

1. Open the **Google Auth Platform** for the project:
   - New UI: https://console.cloud.google.com/auth/audience?project=printing-513609
   - Legacy UI: https://console.cloud.google.com/apis/credentials/consent?project=printing-513609
2. Confirm **User type** is **External**.
3. Open the **Audience** tab.
4. Under **Publishing status**, click **Publish app** and confirm.
5. The status becomes **In production**. Existing test users are no longer
   needed.

### Verification for the Drive scope

`https://www.googleapis.com/auth/drive` is a **restricted** Google scope. After
publishing, Google may still require OAuth verification before arbitrary users
can connect:

- Add the privacy policy URL, terms URL, homepage URL, authorized domain, and a
  developer contact email in the **Branding** tab.
- Complete the **Data Access** / verification form and explain why the full
  Drive scope is required.
- Google may ask for a CASA security assessment. This can take days to weeks.

Until verification finishes, users may see a **"Google hasn't verified this
app"** screen. Signing in with the project owner account usually still works;
other accounts may be blocked. For immediate personal use, adding the account
as a **Test user** works instantly.

### Values for the Google verification form

| Field | Value |
| --- | --- |
| App name | DriveDesk |
| Homepage | `https://printing-momenellaban.vercel.app` |
| Privacy policy | `https://printing-momenellaban.vercel.app/privacy` |
| Terms of service | `https://printing-momenellaban.vercel.app/terms` |
| Authorized domain | `printing-momenellaban.vercel.app` |
| Developer contact | `momenellaban210@gmail.com` |

## Verify the OAuth flow

1. Open https://printing-momenellaban.vercel.app/settings?tab=drive
2. Click **Connect Google**.
3. Sign in with the Google account.
4. Approve the requested Drive scopes.
5. Google redirects back to:
   `https://printing-momenellaban.vercel.app/api/auth/google/callback`
6. The app should redirect to `/settings?tab=drive&oauth=connected&account=...`.
7. The Drive status should become **Connected** and the demo banner should disappear.

## If you add a custom domain later

Update all three values:

1. Vercel domain settings.
2. `NEXT_PUBLIC_APP_URL` → `https://your-domain.com`
3. `GOOGLE_REDIRECT_URI` → `https://your-domain.com/api/auth/google/callback`
4. Add the same redirect URI in Google Cloud Console.

## Troubleshooting

### Google returns `403: access_denied`

This means the OAuth consent screen is still in **Testing** mode and the Google
account you are signing in with is not listed as a test user.

Fix it from the Google Cloud project `printing-513609`:

1. Open https://console.cloud.google.com/apis/credentials/consent?project=printing-513609
2. Make sure **User type** is **External** (not Internal).
3. Scroll to **Test users**.
4. Click **Add users**.
5. Add the exact Google account you will sign in with, for example:
   `mobileinfo602@gmail.com`
6. Save the changes.
7. Wait 1–5 minutes, then retry in an incognito window while signed in with
   that same account.

The app must be published (and verified by Google) before arbitrary Google
accounts can use it. For personal testing, adding the account as a test user is
enough.

If you do not want to manage test users, publish the app from the same OAuth
consent screen. Google may require verification because the Drive scope is
sensitive.

## Security notes

- The Vercel token shared during setup should be revoked and regenerated from
  https://vercel.com/account/tokens after finishing the deployment.
- The Google OAuth client secret was shared in chat. After confirming the
  connection works, rotate it in Google Cloud Console and update
  `GOOGLE_CLIENT_SECRET` in Vercel, then redeploy.
- Keep `.env` local only. It is ignored by Git.
- Database credentials and encryption keys are stored only in Vercel environment variables.
