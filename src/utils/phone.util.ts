export function normalizeMobile(mobile: number): { mobile: number; mobileCc: number; mobileNational: number } {
  if (mobile) {
    const digits = mobile.toString().replace(/[^\d]/g, '');
    // naive split: take up to first 3 (GCC-like) as cc if not provided
    // Adjust if you have a definitive plan for E.164 parsing
    if (digits.startsWith('00')) {
      const d = digits.replace(/^00/, '');
      return { mobile: Number(digits), mobileCc: parseInt(d.slice(0, 3), 10), mobileNational: parseInt(d.slice(3), 10) };
    }
    if (digits.startsWith('9')) {
      return { mobile: Number(digits), mobileCc: parseInt(digits.slice(0, 3), 10), mobileNational: parseInt(digits.slice(3), 10) };
    }
    // fallback: assume provided pair
  }
  // if (!input.mobileCc || !input.mobileNational) {
  //   throw new Error('Invalid mobile: provide mobile (E.164) or mobileCc & mobileNational');
  // }
  return { mobile, mobileCc: 0, mobileNational: 0 };
}
