export interface PipelineGlobalStatus {
  data: Array<{
    time: string;
    succ: number;
    failed: number;
  }>;
  succ: number;
  failed: number;
  total: number;
}

export interface PipelineStageStatus {
  data: Array<{
    name: string;
    succ: number;
    failed: number;
    total: number;
  }>;
}

export interface PipelineGlobalStatusParams {
  range: string; // -24h, -168h, -336h
  project: string;
  app?: string;
}

export interface CodeQualityStatus {
  ok: number;
  warn: number;
  error: number;
  metricSummary: Dictionary<{ levelSummary: Dictionary<number> }>;
}

export interface TestReport {
  age: number;
  duration: number;
  errorDetails: string;
  errorStackTrace: string;
  hasStdLog: boolean;
  id: string;
  name: string;
  state: string;
  status: string;
}

export interface TestReportSummary {
  ExistingFailed: number;
  Failed: number;
  Fixed: number;
  Passed: number;
  Regressions: number;
  Skipped: number;
  Total: number;
  [key: string]: number;
}

export interface PipelineTestReport {
  REGRESSION?: TestReport[];
  FAILED: TestReport[];
  SKIPPED: TestReport[];
  FIXED?: TestReport[];
  PASSED: TestReport[];
  SUMMARY: TestReportSummary;
  [key: string]: any;
}

export interface TestReportParams {
  project: string;
  name: string;
  start: string;
  limit: string;
}
