import validator from 'validator';

/**
 * Email validation function
 * Validates email format using the validator library
 * @param email - The email string to validate
 * @returns null if valid, error message if invalid
 */
export const validateEmail = (email: string): string | null => {
  if (!email.trim()) return null; // Empty email is allowed
  return validator.isEmail(email) ? null : 'Please enter a valid email address';
};

/**
 * Phone number validation function
 * Validates phone number format using the validator library
 * @param phone - The phone string to validate
 * @returns null if valid, error message if invalid
 */
export const validatePhone = (phone: string): string | null => {
  if (!phone.trim()) return null; // Empty phone is allowed
  return validator.isMobilePhone(phone, 'any', { strictMode: false })
    ? null
    : 'Please enter a valid phone number';
};
