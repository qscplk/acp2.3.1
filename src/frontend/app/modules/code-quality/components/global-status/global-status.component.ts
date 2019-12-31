import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { CodeQualityStatus, ReportsApiService } from '@app/api';
import { get } from 'lodash-es';

import { status, statusColor } from '../../utils/mappers';

const defaultSummary = [
  { status: 'OK', count: 0 },
  { status: 'WARN', count: 0 },
  { status: 'ERROR', count: 0 },
];

const defaultLevels = [
  { key: 'E', count: 0 },
  { key: 'D', count: 0 },
  { key: 'C', count: 0 },
  { key: 'B', count: 0 },
  { key: 'A', count: 0 },
];

const defaultMetrics = [
  {
    key: 'bugs',
    icon: 'basic:bug',
    text: 'reliability',
    levels: defaultLevels,
  },
  {
    key: 'vulnerabilities',
    icon: 'basic:vulnerability',
    text: 'security',
    levels: defaultLevels,
  },
  {
    key: 'codeSmells',
    icon: 'basic:code_smell',
    text: 'maintainability',
    levels: defaultLevels,
  },
];

@Component({
  selector: 'alo-code-quality-global-status',
  templateUrl: 'global-status.component.html',
  styleUrls: [
    '../../../../shared/dashboard.scss',
    'global-status.component.scss',
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CodeQualityGlobalStatusComponent {
  @Input()
  project: string;

  status = status;

  statusColor = statusColor(true);

  constructor(private readonly reportsApi: ReportsApiService) {}

  fetchStatus = (project: string) =>
    this.reportsApi.getCodeQualityStatus(project);

  summary(data: CodeQualityStatus) {
    if (!data) {
      return defaultSummary;
    }

    return ['OK', 'WARN', 'ERROR'].map(item => ({
      status: item,
      count: data[item.toLowerCase() as 'ok' | 'warn' | 'error'],
    }));
  }

  total = (data: CodeQualityStatus) => {
    if (!data) {
      return 0;
    }

    return this.summary(data).reduce((accum, item) => accum + item.count, 0);
  };

  metrics(data: CodeQualityStatus) {
    if (!data) {
      return defaultMetrics;
    }

    return defaultMetrics.map(({ key, levels, ...rest }) => ({
      ...rest,
      levels: levels.map(level => ({
        ...level,
        count:
          get(data, ['metricSummary', key, 'levelSummary', level.key]) || 0,
      })),
    }));
  }
}
