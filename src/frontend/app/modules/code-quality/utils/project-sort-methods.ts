import { CodeQualityProject } from '@app/api';

export const compareByDate = (desc = false) => (
  a: CodeQualityProject,
  b: CodeQualityProject,
) => {
  const dateA = a.mainBranch && a.mainBranch.lastAttempt;
  const dateB = b.mainBranch && b.mainBranch.lastAttempt;

  const [first, last] = desc ? [dateB, dateA] : [dateA, dateB];

  return new Date(first).getTime() - new Date(last).getTime();
};

export const compareByStatus = (desc = false) => (
  a: CodeQualityProject,
  b: CodeQualityProject,
) => {
  const indexs: Dictionary<number> = {
    ERROR: 1,
    WARN: 2,
    OK: 3,
  };

  const statusA = a.mainBranch && a.mainBranch.status;
  const statusB = b.mainBranch && b.mainBranch.status;

  const [first, last] = desc ? [statusB, statusA] : [statusA, statusB];

  return (indexs[first] || 0) - (indexs[last] || 0);
};
