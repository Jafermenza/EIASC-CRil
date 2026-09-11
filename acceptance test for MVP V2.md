# MVP V2 — Registration Payment & Progressive Registration Acceptance

## Scope

MVP V2 makes registration payment mandatory for both individual and institution applications and introduces a three-step progressive registration experience.

## 1. Mandatory payment

Both flows must collect a registration payment before the application is accepted by the backend:

- Individual registration fee: `REGISTRATION_INDIVIDUAL_FEE_ETB`
- Institution registration fee: `REGISTRATION_INSTITUTION_FEE_ETB`
- Currency: ETB
- Methods: `TELEBIRR`, `CHAPA`, `BANK_TRANSFER`
- A payment reference number is mandatory.

The backend, not the browser, is authoritative for the fee amount and payment requirement.

## 2. Telebirr

- Applicant selects Telebirr.
- Configured Telebirr account name/number are displayed.
- Applicant enters the transaction/reference number.
- Application is submitted with payment status `PENDING`.
- A mandated finance/registrar reviewer verifies or rejects the payment.

## 3. Bank transfer

- Applicant selects bank transfer.
- Configured bank name, account name, account number and branch are displayed.
- Applicant enters the transfer reference number.
- Application is submitted with payment status `PENDING`.
- A mandated finance/registrar reviewer verifies or rejects the payment.

## 4. Chapa

- Applicant selects Chapa.
- Backend initializes the Chapa transaction using the server-side secret key.
- Applicant is redirected to Chapa checkout.
- The server verifies the transaction against Chapa before accepting the reference as paid.
- The amount must exactly match the configured EIASC registration fee.
- Chapa payments become `PAID` automatically after successful verification.
- The Chapa secret key is never exposed to the browser.

The implementation follows Chapa's documented initialize → checkout → callback/verify flow. See the official Chapa documentation: https://developer.chapa.co/integrations/accept-payments and https://developer.chapa.co/integrations/verify-payments.

## 5. Progressive UI

Individual and institution registration must use exactly three sequential steps:

1. Personal/institution basics
2. Geographic information and affiliation/responsible person
3. Payment and final submission

The page must show:

- current step;
- 0–100% progress indicator;
- Back/Continue navigation;
- validation before moving forward;
- payment controls before the final submit action.

## 6. Geography compatibility

The registration UI must support both:

- Zone → Sub-city/Town → District/Woreda where sub-city data exists; and
- Zone → District/Woreda where no sub-city exists.

A sub-city must not be fabricated merely to satisfy the UI.

## 7. Admin finance/review queue

Authorized roles can access `/admin/payments` and API `GET /api/v1/payments/admin/queue`:

- SUPER_ADMIN
- NATIONAL_ADMIN
- REGIONAL_ADMIN
- ZONE_ADMIN
- DISTRICT_ADMIN
- REGISTRAR
- FINANCE_OFFICER
- INSPECTOR

Finance/Registrar roles can verify or reject manual Telebirr/bank-transfer payments. Chapa payments are automatically verified and cannot be manually marked as paid through this endpoint.

## 8. Approval gate

Institution approval is blocked unless a linked registration payment is `PAID`.

The same payment rule must be applied to any future individual-registration approval endpoint before that endpoint can approve a member.

## 9. Persistence

Payment records are persisted in PostgreSQL by migration:

`20260912100000_registration_payments`

The ledger stores:

- application reference;
- method;
- amount/currency;
- applicant reference number;
- provider reference;
- payment status;
- submitted/verified timestamps;
- verifier;
- rejection reason.

## 10. Release gate

MVP V2 is not complete until CI proves:

- Prisma/database migration validation passes;
- API typecheck passes;
- API unit tests pass;
- web build passes;
- mandatory-payment negative tests pass;
- manual payment verification tests pass;
- Chapa amount/reference verification tests pass;
- progressive registration UI tests pass;
- authorization tests confirm non-mandated users cannot verify payments.
