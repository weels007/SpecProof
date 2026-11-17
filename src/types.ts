export type CheckResult = {
  passed: boolean;
  note: string;
};

export type CaseStatus = 'draft' | 'sample';

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
};

export type NewCaseInput = {
  title: string;
  url: string;
  criteria: string[];
};
