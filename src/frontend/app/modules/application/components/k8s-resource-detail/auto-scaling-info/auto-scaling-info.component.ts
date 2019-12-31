import { TranslateService } from '@alauda/common-snippet';
import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  OnChanges,
  Output,
} from '@angular/core';
import { get } from 'lodash-es';

@Component({
  selector: 'alo-k8s-resource-auto-scaling-info',
  templateUrl: './auto-scaling-info.component.html',
  styleUrls: ['./auto-scaling-info.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AutoScalingInfoComponent implements OnChanges {
  @Input()
  horizontalPodAutoscaler: any;

  @Input()
  isContainersRequestsEmpty: { cpu: boolean; memory: boolean };

  @Input()
  allowedUpdate: boolean;

  @Output()
  updated = new EventEmitter<void>();

  @Output()
  deleted = new EventEmitter<void>();

  cpuTargetAverageUtilization: number;
  memTargetAverageUtilization: number;
  lastScaleTime: string;

  constructor(private readonly translate: TranslateService) {}

  ngOnChanges() {
    this.cpuTargetAverageUtilization = null;
    this.memTargetAverageUtilization = null;
    this.metrics.forEach((resource: any) => {
      if (get(resource, 'resource.name') === 'cpu') {
        this.cpuTargetAverageUtilization = get(
          resource,
          'resource.targetAverageUtilization',
        );
      }
      if (get(resource, 'resource.name') === 'memory') {
        this.memTargetAverageUtilization = get(
          resource,
          'resource.targetAverageUtilization',
        );
      }
    });
    this.lastScaleTime = get(
      this.horizontalPodAutoscaler,
      'status.lastScaleTime',
    );
  }

  get maxReplicas() {
    return get(this.horizontalPodAutoscaler, 'spec.maxReplicas');
  }

  get minReplicas() {
    return get(this.horizontalPodAutoscaler, 'spec.minReplicas');
  }

  get metrics() {
    return get(this.horizontalPodAutoscaler, 'spec.metrics', []);
  }

  get missingCpuRequests() {
    return (
      this.cpuTargetAverageUtilization && this.isContainersRequestsEmpty.cpu
    );
  }

  get missingMemRequests() {
    return (
      this.memTargetAverageUtilization && this.isContainersRequestsEmpty.memory
    );
  }

  get missingResourcesRequests() {
    if (this.missingCpuRequests && this.missingMemRequests) {
      return `CPU/${this.translate.get('memory')}`;
    }
    if (this.missingCpuRequests) {
      return 'CPU';
    }
    if (this.missingMemRequests) {
      return this.translate.get('memory');
    }
  }

  get autoScalingWarningTips() {
    return this.translate.get('application.auto_scaling_warning_tips', {
      resources: this.missingResourcesRequests,
    });
  }

  update() {
    this.updated.emit();
  }

  delete() {
    this.deleted.emit();
  }
}
