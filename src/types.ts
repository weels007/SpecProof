export type CheckResult = {
  passed: boolean;
  note: string;
};

export type CaseStatus = 'sample' | 'onchain';

export type EvaluationCase = {
  id: string;
  title: string;
  url: string;
  criteria: string[];
  /** From the registry list, which does not carry the full rubric. */
  criteriaCount?: number;
  checks?: CheckResult[];
  status: CaseStatus;
  updated?: string;
  createdAt?: string;
  mark?: string;
  tone?: string;
  /** Case id inside the SpecProof registry, once the case lives on Studionet. */
  caseId?: string;
  creator?: string;
  evaluated?: boolean;
  passedCount?: number;
};

export type NewCaseInput = {
  title: string;
  url: string;
  criteria: string[];
};
