import type { TrackingEvent, SustainabilityMetadata } from '@/lib/types';

export interface SustainabilityScoreBreakdown {
  total: number;
  carbonScore: number;
  certificationScore: number;
  practicesScore: number;
  energyScore: number;
  packagingScore: number;
  label: 'Unrated' | 'Low' | 'Moderate' | 'Good' | 'Excellent' | 'Outstanding';
  level: 'none' | 'bronze' | 'silver' | 'gold' | 'platinum';
}

const CERT_LEVEL_SCORE: Record<string, number> = {
  none: 0,
  bronze: 5,
  silver: 10,
  gold: 15,
  platinum: 20,
};

function parseMeta(raw: string): SustainabilityMetadata | null {
  try {
    return JSON.parse(raw) as SustainabilityMetadata;
  } catch {
    return null;
  }
}

function levelFromScore(score: number): SustainabilityScoreBreakdown['level'] {
  if (score >= 80) return 'platinum';
  if (score >= 60) return 'gold';
  if (score >= 40) return 'silver';
  if (score >= 20) return 'bronze';
  return 'none';
}

function labelFromScore(score: number): SustainabilityScoreBreakdown['label'] {
  if (score >= 80) return 'Outstanding';
  if (score >= 60) return 'Excellent';
  if (score >= 40) return 'Good';
  if (score >= 20) return 'Moderate';
  if (score > 0) return 'Low';
  return 'Unrated';
}

export function calculateSustainabilityScore(
  events: TrackingEvent[],
): SustainabilityScoreBreakdown {
  if (events.length === 0) {
    return {
      total: 0,
      carbonScore: 0,
      certificationScore: 0,
      practicesScore: 0,
      energyScore: 0,
      packagingScore: 0,
      label: 'Unrated',
      level: 'none',
    };
  }

  const metas = events
    .map((e) => parseMeta(e.metadata))
    .filter(Boolean) as SustainabilityMetadata[];

  // 1. Carbon footprint score (0–25): lower footprint = higher score
  let carbonScore = 0;
  const carbonValues = metas
    .map((m) => m.carbon_footprint)
    .filter((v): v is number => typeof v === 'number' && v >= 0);
  if (carbonValues.length > 0) {
    const avgCarbon = carbonValues.reduce((a, b) => a + b, 0) / carbonValues.length;
    // <=10 kg CO2e → 25 pts; <=50 → 20; <=100 → 15; <=200 → 10; <=500 → 5; >500 → 0
    if (avgCarbon <= 10) carbonScore = 25;
    else if (avgCarbon <= 50) carbonScore = 20;
    else if (avgCarbon <= 100) carbonScore = 15;
    else if (avgCarbon <= 200) carbonScore = 10;
    else if (avgCarbon <= 500) carbonScore = 5;
  }

  // 2. Certification level score (0–20)
  const certLevels = metas.map((m) => m.certification_level).filter((v): v is string => !!v);
  let certificationScore = 0;
  if (certLevels.length > 0) {
    const bestLevel = certLevels.reduce((best, cur) =>
      (CERT_LEVEL_SCORE[cur] ?? 0) > (CERT_LEVEL_SCORE[best] ?? 0) ? cur : best,
    );
    certificationScore = CERT_LEVEL_SCORE[bestLevel] ?? 0;
  }

  // 3. Sustainable practices score (0–25): 5 pts per unique practice, max 25
  const practiceSet = new Set<string>();
  for (const m of metas) {
    if (Array.isArray(m.sustainable_practices)) {
      m.sustainable_practices.forEach((p) => practiceSet.add(p));
    }
  }
  const practicesScore = Math.min(practiceSet.size * 5, 25);

  // 4. Renewable energy score (0–20): avg renewable_energy_pct × 0.2
  const renewableValues = metas
    .map((m) => m.renewable_energy_pct)
    .filter((v): v is number => typeof v === 'number');
  let energyScore = 0;
  if (renewableValues.length > 0) {
    const avgRenewable = renewableValues.reduce((a, b) => a + b, 0) / renewableValues.length;
    energyScore = Math.round(Math.min(avgRenewable * 0.2, 20));
  }

  // 5. Packaging score (0–10): recyclable packaging on any event
  const hasRecyclable = metas.some((m) => m.recyclable_packaging === true);
  const packagingScore = hasRecyclable ? 10 : 0;

  const total = Math.min(
    carbonScore + certificationScore + practicesScore + energyScore + packagingScore,
    100,
  );

  return {
    total,
    carbonScore,
    certificationScore,
    practicesScore,
    energyScore,
    packagingScore,
    label: labelFromScore(total),
    level: levelFromScore(total),
  };
}

export function getSustainabilityScoreColor(score: number): string {
  if (score >= 80) return 'text-emerald-600 dark:text-emerald-400';
  if (score >= 60) return 'text-green-600 dark:text-green-400';
  if (score >= 40) return 'text-yellow-600 dark:text-yellow-400';
  if (score >= 20) return 'text-orange-600 dark:text-orange-400';
  return 'text-[var(--muted)]';
}

export function getSustainabilityBadgeClass(level: SustainabilityScoreBreakdown['level']): string {
  switch (level) {
    case 'platinum':
      return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300 border border-purple-300 dark:border-purple-700';
    case 'gold':
      return 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 border border-amber-300 dark:border-amber-700';
    case 'silver':
      return 'bg-slate-100 text-slate-700 dark:bg-slate-800/50 dark:text-slate-300 border border-slate-300 dark:border-slate-600';
    case 'bronze':
      return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300 border border-orange-300 dark:border-orange-700';
    default:
      return 'bg-[var(--muted-bg)] text-[var(--muted)] border border-[var(--card-border)]';
  }
}
