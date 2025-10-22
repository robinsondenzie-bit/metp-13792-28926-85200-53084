/**
 * Simulated encryption utilities for prototype
 * In production, use proper encryption libraries and key management
 */

// Simulated encryption - for prototype only
export const encryptAccountNumber = (accountNumber: string): string => {
  // In production: Use AES-256 with proper key management
  // For prototype: Simple base64 encoding (NOT SECURE - FOR DEMO ONLY)
  return btoa(`ENC_${accountNumber}`);
};

export const decryptAccountNumber = (encrypted: string): string => {
  // In production: Use AES-256 decryption
  // For prototype: Simple base64 decoding
  try {
    const decoded = atob(encrypted);
    return decoded.replace('ENC_', '');
  } catch {
    return '';
  }
};

export const maskAccountNumber = (accountNumber: string): string => {
  if (accountNumber.length < 4) return accountNumber;
  const last4 = accountNumber.slice(-4);
  return `••••${last4}`;
};

export const encryptRoutingNumber = (routing: string): string => {
  // Same simulated encryption
  return btoa(`ENC_${routing}`);
};

export const decryptRoutingNumber = (encrypted: string): string => {
  try {
    const decoded = atob(encrypted);
    return decoded.replace('ENC_', '');
  } catch {
    return '';
  }
};
