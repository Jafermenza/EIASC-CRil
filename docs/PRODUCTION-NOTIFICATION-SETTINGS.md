# Production Notification Configuration

## Purpose

Super Admin can control SMS delivery from **Admin → Settings → SMS notifications** without editing deployment secrets. Provider credentials remain server-side environment variables.

## Provider credentials

Configure these only in the API production environment:

- `AFRO_MESSAGE_TOKEN` — AfroMessage API token.
- `AFRO_MESSAGE_IDENTIFIER_ID` — configured AfroMessage identifier/from value.
- `AFRO_MESSAGE_SENDER_NAME` — approved sender name.
- `AFRO_MESSAGE_STATUS_CALLBACK` — optional delivery-status callback URL.

The admin UI never reads or displays the token.

## Super Admin workflow

1. Start the API with the production environment loaded.
2. Open **Admin → Settings**.
3. In **SMS notifications**, confirm **AfroMessage configured**.
4. Enable **SMS notifications**.
5. Save notification settings.
6. Use **Send test SMS**. The test is sent to the authenticated administrator's phone number.
7. Edit templates as required and save again.
8. Trigger a real credential/application workflow and confirm the notification appears in the notification history and reaches the recipient phone.

## Template variables

The current configurable templates support:

- `{{type}}`
- `{{credentialNumber}}`
- `{{verificationUrl}}`
- `{{trackingCode}}`
- `{{status}}`
- `{{recipientName}}`

Keep SMS messages concise. Template values are stored in `PlatformSetting`; provider secrets are not.

## Current automatic SMS event

Credential issuance sends an SMS notification to active users belonging to the institution associated with the issued institution or license credential. The notification service applies the Super Admin SMS enable/disable setting before external delivery.

Member credentials that are issued without an associated institution do not currently have an institution-recipient list, so their SMS recipient workflow should be implemented separately if member self-notification is required.

## Failure behavior

A failed provider call does not crash the credential workflow. The notification is recorded as `FAILED` with delivery-error metadata so an administrator can diagnose the problem.

## Production safety

Do not store `AFRO_MESSAGE_TOKEN` in Git, Prisma records, frontend code, browser local storage, or client-visible API responses. Rotate the provider token using the provider's security process and restart the API after changing environment variables.
