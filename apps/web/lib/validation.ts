/**
 * Safely extracts human-readable error messages from API response JSON payloads
 * supporting both NestJS default structure and Custom HttpExceptionFilter structure.
 */
export function extractErrorMessage(data: any, fallback = 'An unexpected error occurred.'): string {
  if (!data) return fallback;
  if (data.error && typeof data.error === 'object') {
    if (Array.isArray(data.error.message)) return data.error.message.join(', ');
    if (typeof data.error.message === 'string' && data.error.message.trim()) return data.error.message;
  }
  if (Array.isArray(data.message)) {
    return data.message.join(', ');
  }
  if (typeof data.message === 'string' && data.message.trim()) {
    return data.message;
  }
  return fallback;
}

/**
 * Validates Ethiopian and international phone numbers.
 * Accepts formats like: +251911234567, 0911234567, 0711234567, +251711234567, etc.
 */
export function isValidPhone(phone: string): boolean {
  if (!phone) return false;
  const cleaned = phone.replace(/[\s\-()]/g, '');
  // Matches +251 9/7 ..., 09..., 07..., or general 9-15 digit phone formats
  return /^(\+?251[79]\d{8}|0[79]\d{8}|\+?[1-9]\d{8,14})$/.test(cleaned);
}

/**
 * Validates standard email address format.
 */
export function isValidEmail(email: string): boolean {
  if (!email) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

/**
 * Validates a birth date or establishment date.
 */
export function isValidDate(dateString: string, minAge = 0, maxAge = 120): { valid: boolean; error?: string } {
  if (!dateString) return { valid: false, error: 'Date is required.' };
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return { valid: false, error: 'Invalid date format.' };
  
  const today = new Date();
  if (date > today) return { valid: false, error: 'Date cannot be in the future.' };
  
  let age = today.getUTCFullYear() - date.getUTCFullYear();
  const beforeBirthday = today.getUTCMonth() < date.getUTCMonth() || (today.getUTCMonth() === date.getUTCMonth() && today.getUTCDate() < date.getUTCDate());
  if (beforeBirthday) age -= 1;
  
  if (age < minAge || age > maxAge) {
    return { valid: false, error: `Age must be between ${minAge} and ${maxAge} years.` };
  }
  return { valid: true };
}
