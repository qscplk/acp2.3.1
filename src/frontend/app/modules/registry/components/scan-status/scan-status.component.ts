import { TranslateService } from '@alauda/common-snippet';
import { StatusType } from '@alauda/ui';
import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { ImageTag, ScanSummary } from '@app/api/registry/registry-api.types';
import { get } from 'lodash-es';

function paseSeverityToType(severity: number) {
  switch (severity) {
    case 1:
      return { type: StatusType.Success };
    case 2:
      return { type: StatusType.Info };
    case 3:
      return { class: 'low' };
    case 4:
      return { type: StatusType.Warning };
    case 5:
      return { type: StatusType.Error };
  }
}

@Component({
  selector: 'alo-scan-status',
  templateUrl: 'scan-status.component.html',
  styleUrls: ['scan-status.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ScanStatusComponent {
  @Input()
  tag: ImageTag;

  StatusType = StatusType;

  constructor(private readonly translate: TranslateService) {}

  parseScanResult(sumary: ScanSummary[]) {
    const totalCount = (sumary || []).reduce(
      (calc, current) => current.count + calc,
      0,
    );
    return (sumary || [])
      .sort((a, b) => b.severity - a.severity)
      .map(item => {
        return {
          ...paseSeverityToType(item.severity),
          scale: item.count / totalCount,
        };
      });
  }

  getSeverityIcon(severity: number) {
    switch (severity) {
      case 1:
        return 'check_circle_s';
      case 2:
        return 'basic:question_circle_s';
      case 3:
        return 'exclamation_circle_s';
      case 4:
        return 'exclamation_circle_s';
      case 5:
        return 'exclamation_triangle_s';
    }
  }

  getSummary(summary: ScanSummary[]) {
    return this.translate.get('registry.components_vulnerability_count', {
      all: (summary || []).reduce((calc, current) => calc + current.count, 0),
      count: (summary || [])
        .filter(item => item.severity > 2)
        .reduce((calc, current) => calc + current.count, 0),
    });
  }

  getSeverityCount(summary: ScanSummary[], severity: number) {
    const i = (summary || []).find(item => item.severity === severity);
    return get(i, 'count', 0);
  }
}
