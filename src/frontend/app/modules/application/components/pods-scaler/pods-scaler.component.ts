import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  OnChanges,
  Output,
} from '@angular/core';
import { PodInfo } from '@app/api';

@Component({
  selector: 'alo-pods-scaler',
  templateUrl: 'pods-scaler.component.html',
  styleUrls: ['pods-scaler.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PodsScalerComponent implements OnChanges {
  @Input()
  podInfo: PodInfo;
  @Input()
  kind = '';
  @Input()
  width = 84;
  @Input()
  height = 84;
  @Input()
  scaling = false;
  @Input()
  errorMessages: string[] = [];
  @Input()
  allowedUpdate = false;
  @Output()
  desiredChange = new EventEmitter<number>();
  podStatus: {
    running: number;
    pending: number;
    failed: number;
  };
  statusList = ['running', 'pending', 'failed', 'stopped'];

  ngOnChanges() {
    this.podStatus = this.podInfo.pods.reduce(
      (accum, pod) => {
        const statusKey = this.mapToKey(pod.status);

        return {
          ...accum,
          [statusKey]: accum[statusKey] + 1,
        };
      },
      { running: 0, pending: 0, failed: 0 },
    );
  }

  get deploying() {
    return this.podInfo.desired !== this.podInfo.current;
  }

  get parts() {
    return this.podInfo.desired > 0 && this.podInfo.current > 0
      ? [
          this.podStatus.running,
          this.podStatus.pending,
          this.podStatus.failed,
          0,
        ]
      : [0, 0, 0, 1];
  }

  get scaleEnable() {
    return this.kind.toLocaleLowerCase() !== 'daemonset';
  }

  trackByFn(index: number) {
    return index;
  }

  scaleUp() {
    this.desiredChange.next(this.podInfo.desired + 1);
  }

  scaleDown() {
    if (this.podInfo.desired > 0) {
      this.desiredChange.next(this.podInfo.desired - 1);
    }
  }

  mapToKey(status: string) {
    switch (status) {
      case 'Running':
        return 'running';
      case 'Succeeded':
        return 'running';
      case 'Pending':
        return 'pending';
      case 'Unknown':
        return 'pending';
      case 'Failed':
        return 'failed';
    }
  }
}
