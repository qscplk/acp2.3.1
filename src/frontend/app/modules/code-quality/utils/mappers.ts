const coverageLevels = [
  {
    min: 0.8,
    value: 'a',
  },
  {
    min: 0.7,
    value: 'b',
  },
  {
    min: 0.5,
    value: 'c',
  },
  {
    min: 0.3,
    value: 'd',
  },
  {
    min: -Infinity,
    value: 'e',
  },
];

const duplicationLevels = [
  {
    max: 0.03,
    value: 'a',
  },
  {
    max: 0.05,
    value: 'b',
  },
  {
    max: 0.1,
    value: 'c',
  },
  {
    max: 0.2,
    value: 'd',
  },
  {
    max: Infinity,
    value: 'e',
  },
];

const sizeLevels = [
  {
    max: 1000,
    value: 'a',
  },
  {
    max: 10 * 1000,
    value: 'b',
  },
  {
    max: 100 * 1000,
    value: 'c',
  },
  {
    max: 500 * 1000,
    value: 'd',
  },
  {
    max: Infinity,
    value: 'e',
  },
];

export function coverage(text: string): string {
  const value = parseFloat(text);

  if (isNaN(value)) {
    return '-';
  }

  return coverageLevels.find(level => value / 100 >= level.min).value;
}

export function duplication(text: string): string {
  const value = parseFloat(text);

  if (isNaN(value)) {
    return '-';
  }

  return duplicationLevels.find(level => value / 100 <= level.max).value;
}

export function size(text: string): string {
  const value = parseFloat(text);

  if (isNaN(value)) {
    return '-';
  }

  return sizeLevels.find(level => value <= level.max).value;
}

export function status(text: string): string {
  if (!text) {
    return '-';
  }

  switch (text) {
    case 'OK':
    case 'PASSED':
      return 'passed';
    case 'ERROR':
    case 'FAILED':
      return 'failed';
    case 'WARN':
      return 'warn';
    case 'SKIPPED':
      return 'skipped';
    case 'REGRESSION':
      return 'regression';
    case 'FIXED':
      return 'fixed';
  }
}

export const statusColor = (noBorder = false) => (text: string) => {
  const prefix = noBorder ? '' : '#fff,';

  switch (text) {
    case 'OK':
    case 'PASSED':
    case 'FIXED':
      return `${prefix}#0abf5b`;
    case 'WARN':
      return `${prefix}#FF9D00`;
    case 'ERROR':
    case 'FAILED':
    case 'REGRESSIONS':
      return `${prefix}#e54545`;
    default:
      return `${prefix}#f2f2f2`;
  }
};
