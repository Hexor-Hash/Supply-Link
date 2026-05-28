export const COMPLIANCE_REQUIRED_ORDER = 0;
export const COMPLIANCE_MANDATORY_INSPECTION = 1;
export const COMPLIANCE_MAX_TIME_BETWEEN_STAGES = 2;

export const COMPLIANCE_RULE_LABELS: Record<number, string> = {
  [COMPLIANCE_REQUIRED_ORDER]: 'Required Event Order',
  [COMPLIANCE_MANDATORY_INSPECTION]: 'Mandatory Inspection',
  [COMPLIANCE_MAX_TIME_BETWEEN_STAGES]: 'Max Time Between Stages',
};

export const COMPLIANCE_RULE_DESCRIPTIONS: Record<number, string> = {
  [COMPLIANCE_REQUIRED_ORDER]:
    'Requires a specific preceding stage before this event type can be recorded.',
  [COMPLIANCE_MANDATORY_INSPECTION]:
    'A mandatory inspection stage must be recorded before proceeding.',
  [COMPLIANCE_MAX_TIME_BETWEEN_STAGES]:
    'The next stage must be recorded within the specified time limit.',
};

export interface ComplianceRule {
  rule_type: number;
  from_stage: string;
  to_stage: string;
  max_seconds: number;
}

export interface CompliancePolicy {
  product_id: string;
  rules: ComplianceRule[];
}

export function describeViolation(rule: ComplianceRule): string {
  switch (rule.rule_type) {
    case COMPLIANCE_REQUIRED_ORDER:
      return `"${rule.from_stage}" must be recorded before "${rule.to_stage}".`;
    case COMPLIANCE_MANDATORY_INSPECTION:
      return `Mandatory inspection "${rule.from_stage}" is required before "${rule.to_stage}".`;
    case COMPLIANCE_MAX_TIME_BETWEEN_STAGES: {
      const hours = Math.round(rule.max_seconds / 3600);
      return `"${rule.to_stage}" must follow "${rule.from_stage}" within ${hours}h.`;
    }
    default:
      return 'A compliance rule was violated.';
  }
}
