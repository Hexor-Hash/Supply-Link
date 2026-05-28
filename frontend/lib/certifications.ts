export interface CertificationType {
  id: string;
  label: string;
  description: string;
  color: string;
  badgeClass: string;
}

export const CERTIFICATION_TYPES: CertificationType[] = [
  {
    id: 'fair_trade',
    label: 'Fair Trade',
    description: 'Certified Fair Trade — meets fair pricing and labour standards',
    color: '#16a34a',
    badgeClass:
      'bg-green-100 text-green-800 border-green-300 dark:bg-green-900/30 dark:text-green-300 dark:border-green-700',
  },
  {
    id: 'organic',
    label: 'Organic',
    description: 'Certified organic production — no synthetic pesticides or fertilizers',
    color: '#15803d',
    badgeClass:
      'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-700',
  },
  {
    id: 'rainforest_alliance',
    label: 'Rainforest Alliance',
    description: 'Meets Rainforest Alliance sustainability criteria',
    color: '#166534',
    badgeClass:
      'bg-teal-100 text-teal-800 border-teal-300 dark:bg-teal-900/30 dark:text-teal-300 dark:border-teal-700',
  },
  {
    id: 'iso_9001',
    label: 'ISO 9001',
    description: 'ISO 9001 Quality Management System certification',
    color: '#1d4ed8',
    badgeClass:
      'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-700',
  },
  {
    id: 'iso_14001',
    label: 'ISO 14001',
    description: 'ISO 14001 Environmental Management System certification',
    color: '#0369a1',
    badgeClass:
      'bg-sky-100 text-sky-800 border-sky-300 dark:bg-sky-900/30 dark:text-sky-300 dark:border-sky-700',
  },
  {
    id: 'fsc',
    label: 'FSC',
    description: 'Forest Stewardship Council — responsible forestry',
    color: '#15803d',
    badgeClass:
      'bg-green-100 text-green-800 border-green-300 dark:bg-green-900/30 dark:text-green-300 dark:border-green-700',
  },
  {
    id: 'gmp',
    label: 'GMP',
    description: 'Good Manufacturing Practice certification',
    color: '#7c3aed',
    badgeClass:
      'bg-violet-100 text-violet-800 border-violet-300 dark:bg-violet-900/30 dark:text-violet-300 dark:border-violet-700',
  },
  {
    id: 'halal',
    label: 'Halal',
    description: 'Certified Halal — complies with Islamic dietary laws',
    color: '#0f766e',
    badgeClass:
      'bg-teal-100 text-teal-800 border-teal-300 dark:bg-teal-900/30 dark:text-teal-300 dark:border-teal-700',
  },
  {
    id: 'kosher',
    label: 'Kosher',
    description: 'Certified Kosher — complies with Jewish dietary laws',
    color: '#1d4ed8',
    badgeClass:
      'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-700',
  },
  {
    id: 'conflict_free',
    label: 'Conflict-Free',
    description: 'Verified conflict-free minerals sourcing',
    color: '#b45309',
    badgeClass:
      'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-700',
  },
  {
    id: 'custom',
    label: 'Custom',
    description: 'Custom certification issued by an authorized participant',
    color: '#6b7280',
    badgeClass: 'bg-[var(--muted-bg)] text-[var(--muted)] border-[var(--card-border)]',
  },
];

export function getCertificationType(id: string): CertificationType | undefined {
  return CERTIFICATION_TYPES.find((c) => c.id === id);
}

export function getCertificationLabel(id: string): string {
  return getCertificationType(id)?.label ?? id;
}
