/**
 * Card validation and formatting utilities
 */

export const detectCardBrand = (number: string): string => {
  const cleanNumber = number.replace(/\s/g, '');
  
  if (/^4/.test(cleanNumber)) return 'visa';
  if (/^5[1-5]/.test(cleanNumber)) return 'mastercard';
  if (/^3[47]/.test(cleanNumber)) return 'amex';
  if (/^6(?:011|5)/.test(cleanNumber)) return 'discover';
  
  return 'unknown';
};

export const formatCardNumber = (value: string): string => {
  const cleanValue = value.replace(/\s/g, '');
  const brand = detectCardBrand(cleanValue);
  
  // Amex: 4-6-5 format
  if (brand === 'amex') {
    return cleanValue
      .slice(0, 15)
      .replace(/(\d{4})(\d{0,6})(\d{0,5})/, (match, p1, p2, p3) => {
        let result = p1;
        if (p2) result += ` ${p2}`;
        if (p3) result += ` ${p3}`;
        return result;
      });
  }
  
  // Others: 4-4-4-4 format
  return cleanValue
    .slice(0, 16)
    .replace(/(\d{4})/g, '$1 ')
    .trim();
};

export const formatExpiry = (value: string): string => {
  const cleanValue = value.replace(/\D/g, '');
  
  if (cleanValue.length >= 2) {
    return `${cleanValue.slice(0, 2)}/${cleanValue.slice(2, 4)}`;
  }
  
  return cleanValue;
};

export const formatCVC = (value: string, brand: string): string => {
  const maxLength = brand === 'amex' ? 4 : 3;
  return value.replace(/\D/g, '').slice(0, maxLength);
};

export const validateCardNumber = (number: string): boolean => {
  const cleanNumber = number.replace(/\s/g, '');
  
  // Luhn algorithm
  let sum = 0;
  let isEven = false;
  
  for (let i = cleanNumber.length - 1; i >= 0; i--) {
    let digit = parseInt(cleanNumber[i]);
    
    if (isEven) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    
    sum += digit;
    isEven = !isEven;
  }
  
  return sum % 10 === 0;
};

export const validateExpiry = (month: number, year: number): boolean => {
  const now = new Date();
  const currentYear = now.getFullYear() % 100; // Last 2 digits
  const currentMonth = now.getMonth() + 1;
  
  if (month < 1 || month > 12) return false;
  if (year < currentYear) return false;
  if (year === currentYear && month < currentMonth) return false;
  
  return true;
};

// Simulate card tokenization
export const tokenizeCard = async (cardData: {
  number: string;
  expMonth: number;
  expYear: number;
  cvc: string;
  zip?: string;
}): Promise<string> => {
  // Simulate API call delay
  await new Promise(resolve => setTimeout(resolve, 500));
  
  // Generate simulated token
  return `tok_${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}`;
};
