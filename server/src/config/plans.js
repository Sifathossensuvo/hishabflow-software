// Single source of truth for what each plan includes.
// The client reads this through /auth/me, so nothing is duplicated there.

const PRO_FEATURES = [
  'analytics', 'profitLoss', 'customInvoice', 'staff', 'suppliers',
  'lowStockAlerts', 'export', 'backup', 'aiInsights',
];
const BUSINESS_FEATURES = [
  ...PRO_FEATURES,
  'branches', 'advancedRoles', 'branchAnalytics', 'advancedInventory',
  'advancedBilling', 'forecasting', 'notifications', 'prioritySupport',
];

export const PLANS = {
  free: { id: 'free', name: 'Free', price: 0, productLimit: 100, staffLimit: 0, features: [] },
  pro: { id: 'pro', name: 'Pro', price: 299, productLimit: Infinity, staffLimit: 5, features: PRO_FEATURES },
  business: { id: 'business', name: 'Business', price: 699, productLimit: Infinity, staffLimit: 25, features: BUSINESS_FEATURES },
};

export const FEATURE_LABELS = {
  analytics: 'Advanced analytics',
  profitLoss: 'Profit & loss reports',
  customInvoice: 'Custom invoices',
  staff: 'Staff accounts',
  suppliers: 'Supplier management',
  lowStockAlerts: 'Low-stock alerts',
  export: 'Excel / PDF export',
  backup: 'Backup',
  aiInsights: 'AI business insights',
  branches: 'Multiple branches',
  advancedRoles: 'Advanced staff roles',
  forecasting: 'AI forecasting',
};

export const FEATURE_MIN_PLAN = Object.fromEntries([
  ...PRO_FEATURES.map((f) => [f, 'pro']),
  ...BUSINESS_FEATURES.filter((f) => !PRO_FEATURES.includes(f)).map((f) => [f, 'business']),
]);

// A paid plan that has an expiry date in the past behaves like Free.
export function effectivePlan(business) {
  if (business.plan !== 'free' && business.planExpiresAt && new Date(business.planExpiresAt) < new Date()) return 'free';
  return business.plan;
}

export const hasFeature = (planId, feature) => PLANS[planId]?.features.includes(feature) ?? false;

export function publicPlan(planId) {
  const p = PLANS[planId];
  return { ...p, productLimit: p.productLimit === Infinity ? null : p.productLimit };
}
