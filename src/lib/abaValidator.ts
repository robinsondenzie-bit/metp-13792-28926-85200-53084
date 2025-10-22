/**
 * ABA Routing Number Validator
 * Uses the ABA checksum algorithm (mod-10)
 */

export const validateRoutingNumber = (routing: string): boolean => {
  // Must be exactly 9 digits
  if (!/^\d{9}$/.test(routing)) {
    return false;
  }

  // ABA checksum algorithm
  const digits = routing.split('').map(Number);
  
  const checksum = (
    3 * (digits[0] + digits[3] + digits[6]) +
    7 * (digits[1] + digits[4] + digits[7]) +
    1 * (digits[2] + digits[5] + digits[8])
  ) % 10;

  return checksum === 0;
};

export const formatRoutingNumber = (value: string): string => {
  // Remove non-digits
  const digits = value.replace(/\D/g, '');
  // Limit to 9 digits
  return digits.slice(0, 9);
};
