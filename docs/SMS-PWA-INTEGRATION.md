# SMS and PWA integration

## AfroMessage SMS

EIASC CRil now supports real SMS delivery through AfroMessage (Afro SMS) using the existing `NotificationChannel.SMS` path. Credential issuance sends an in-app notification, email notification when configured, and an SMS notification when an institution recipient has a phone number and the SMS provider is configured.

The provider uses the official AfroMessage API endpoint:

`POST https://api.afromessage.com/api/send`

Required server environment variables:

```env
AFRO_MESSAGE_TOKEN=""
AFRO_MESSAGE_IDENTIFIER_ID=""
AFRO_MESSAGE_SENDER_NAME="EIASC"
AFRO_MESSAGE_STATUS_CALLBACK=""
```

The token and identifier are server-side secrets and must never be exposed to the browser or committed to Git. AfroMessage requires the sender name to be requested/verified before production use.

After configuring the production environment, an authorized administrator can use:

`POST /api/v1/notifications/test-sms`

with the normal authenticated Bearer token. The endpoint sends a real test SMS to the authenticated user's phone number.

## PWA

The web application now includes:

- Web app manifest with install metadata and 192px/512px icons.
- Standalone display mode for an app-like window.
- HTTPS-compatible service-worker registration.
- Offline navigation fallback at `/offline`.
- Runtime caching of visited navigation pages and Next.js static assets.
- Push-event handling in the service worker for future/server-side Web Push delivery.

The service worker deliberately does not intercept `/api/*` requests, so authentication and live API data are never served from a stale cache.

Production PWA installation requires HTTPS. Supporting browsers can then offer an Install/Add to Home Screen action. Offline support is progressive: pages and assets need to have been visited/cached while online before they can be reused offline.

## Deployment checklist

1. Configure the AfroMessage variables in the production secret/environment store.
2. Request/verify the EIASC sender name in AfroMessage.
3. Restart/redeploy the API after environment changes.
4. Sign in as an authorized administrator and call the SMS test endpoint.
5. Confirm the notification record becomes `SENT` and the phone receives the SMS.
6. Serve the web app over HTTPS.
7. Open the web app in a supported browser and confirm the manifest/service worker are registered.
8. Install the app and test previously visited pages while temporarily offline.
9. Keep API requests network-only; do not cache authenticated API responses in the service worker.
