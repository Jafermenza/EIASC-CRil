export type RegistrationKind = 'INDIVIDUAL' | 'INSTITUTION';
export type RegistrationPaymentMethod = 'TELEBIRR' | 'CHAPA' | 'BANK_TRANSFER';
export type RegistrationPaymentStatus = 'INITIATED' | 'PENDING' | 'PAID' | 'REJECTED' | 'FAILED';

export interface PaymentInput {
  method: RegistrationPaymentMethod;
  referenceNumber: string;
  receiptUrl?: string;
}

export interface ChapaInitializeInput {
  kind: RegistrationKind;
  firstName?: string;
  lastName?: string;
  name?: string;
  email?: string;
  phone: string;
  applicationId?: string;
  trackingCode?: string;
}
