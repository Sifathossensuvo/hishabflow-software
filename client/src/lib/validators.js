export const isEmail = (s) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim());
export const isBDPhone = (s) => /^(?:\+?88)?01[3-9]\d{8}$/.test(s.replace(/[\s-]/g, ''));
