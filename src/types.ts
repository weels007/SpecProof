export type CheckResult = {
  passed: boolean;
  note: string;
};

export type CaseStatus = 'draft' | 'sample' | 'onchain';

export type EvaluationCase = {
  id: string;
  title: string;
  url: string;
  criteria: string[];
  checks?: CheckResult[];
  status: CaseStatus;
  label?: string;
  updated?: string;
  createdAt?: string;
  mark?: string;
  tone?: string;
  /** Studionet contract that holds this case, once deployed. */
  address?: string;
  creator?: string;
  evaluated?: boolean;
};

export type NewCaseInput = {
  title: string;
  url: string;
  criteria: string[];
  onChain: boolean;
};
