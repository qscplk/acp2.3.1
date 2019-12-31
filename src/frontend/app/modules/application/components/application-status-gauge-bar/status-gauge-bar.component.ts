import { TranslateService } from '@alauda/common-snippet';
import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  OnChanges,
  OnInit,
  Output,
  SimpleChanges,
} from '@angular/core';

enum GenericStatus {
  Success = 'success',
  Succeeded = 'success',
  Pending = 'pending',
  Failed = 'error',
  Error = 'error',
  Unknown = 'unknown',
  Bound = 'bound',
  Warning = 'warning',
  Terminating = 'terminating',
  Stopped = 'stopped',
}

const GenericStatusList = [
  'success',
  'pending',
  'error',
  'unknown',
  'bound',
  'warning',
  'terminating',
  'stopped',
];

const StatusToGenericStatus: { [key: string]: GenericStatus } = {
  running: GenericStatus.Success,
  pending: GenericStatus.Pending,
  failed: GenericStatus.Error,
  warning: GenericStatus.Warning,
  succeeded: GenericStatus.Success,
  bound: GenericStatus.Bound,
  lost: GenericStatus.Warning,
};

@Component({
  selector: 'alo-status-gauge-bar',
  templateUrl: './status-gauge-bar.component.html',
  styleUrls: ['./status-gauge-bar.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ApplicationStatusGaugeBarComponent implements OnInit, OnChanges {
  @Input()
  statusInfo: { [key: string]: number; total?: number } = {};

  @Input()
  labelRender: (key: string) => string;

  @Output()
  statusBarClick = new EventEmitter();

  statusItems: Array<{
    value: number;
    status: GenericStatus;
    key: string;
  }> = [];

  onStatusBarClick(status: string) {
    this.statusBarClick.emit(status);
  }

  constructor(private readonly translate: TranslateService) {}

  ngOnInit() {
    const defaultLabelRender = (key: string) => this.translate.get(key);
    this.labelRender = this.labelRender || defaultLabelRender;
  }

  ngOnChanges({ statusInfo }: SimpleChanges) {
    if (statusInfo) {
      this.statusItems = this.updateStatuItems();
    }
  }

  private updateStatuItems() {
    return Object.keys(this.statusInfo)
      .filter(key => key !== 'total')
      .map(key => ({
        value: this.statusInfo[key],
        status: StatusToGenericStatus[key],
        key,
      }))
      .filter(item => !!item.value)
      .sort(
        (a, b) =>
          GenericStatusList.indexOf(a.status) -
          GenericStatusList.indexOf(b.status),
      );
  }
}
