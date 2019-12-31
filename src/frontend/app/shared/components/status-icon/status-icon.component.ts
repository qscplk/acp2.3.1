import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

enum GenericStatus {
  Success = 'success',
  Succeeded = 'success',
  Running = 'running',
  Pending = 'pending',
  Failed = 'failed',
  Error = 'error',
  Unknown = 'unknown',
  Bound = 'bound',
  Warning = 'warning',
  Terminating = 'terminating',
  Stopped = 'stopped',
}

@Component({
  selector: 'alo-status-icon',
  templateUrl: './status-icon.component.html',
  styleUrls: ['./status-icon.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StatusIconComponent {
  @Input() status: GenericStatus;
  constructor() {}

  getSvgIconName() {
    switch (this.status) {
      case GenericStatus.Success:
        return 'check_circle_s';
      case GenericStatus.Running:
        return 'check_circle_s';
      case GenericStatus.Pending:
        return 'basic:hourglass_half_circle_s';
      case GenericStatus.Error:
        return 'basic:close_circle_s';
      case GenericStatus.Failed:
        return 'basic:close_circle_s';
      case GenericStatus.Unknown:
        return 'basic:question_circle_s';
      case GenericStatus.Stopped:
        return 'basic:stop_circle_s';
      case GenericStatus.Bound:
        return 'basic:link_circle_s';
      case GenericStatus.Warning:
        return 'exclamation_circle_s';
      case GenericStatus.Terminating:
        return 'basic:hourglass_half_circle_s';
    }
  }
}
