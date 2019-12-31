import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  Output,
} from '@angular/core';
import { get, head, isArray } from 'lodash-es';
import { TranslateService } from '@alauda/common-snippet';

// TODO: temp solution for corner case
export const DEFAULT_TRANSLATES = {
  loading: 'loading',
  noResource: 'no_resource',
  noData: 'no_data',
  noResult: 'no_result',
  retryOnError: 'retry_on_error',
  retry: 'retry',
  forbidden: 'forbidden',
  notFound: 'not_found',
  serviceUnaviable: 'service_unaviable',
};

@Component({
  selector: 'alo-no-data',
  templateUrl: 'no-data.component.html',
  styleUrls: ['no-data.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NoDataComponent {
  @Input()
  resourceName = '';

  @Input()
  error: any = null;

  @Input()
  loading = false;

  @Input()
  retryDisabled = false;

  @Input()
  mode: 'list' | 'card' = 'list';

  @Input()
  searchKeyword = '';

  @Input()
  translateOptions = DEFAULT_TRANSLATES;

  // 当前为中文时 传入的resourceName以英文开头 之前需要空格时设置为true
  @Input()
  withSpace = false;

  @Output()
  retry = new EventEmitter<void>();

  get errorType() {
    if (!this.error) {
      return null;
    }

    const status = isArray(this.error)
      ? this.getListErrorStatus(this.error)
      : this.error.status || 500;

    if (!status) {
      return null;
    }

    switch (status) {
      case 403:
        return this.translateOptions.forbidden;
      case 404:
        return this.translateOptions.notFound;
      default:
        return this.translateOptions.serviceUnaviable;
    }
  }

  constructor(private translate: TranslateService) {}

  getDisplayResourceName = (resourceName: string) => {
    const currentLang = this.translate.locale;

    return currentLang === 'zh' && resourceName && this.withSpace
      ? ` ${resourceName}`
      : resourceName;
  };

  getListErrorStatus(errors: any[]) {
    if (!errors.length) {
      return null;
    }

    return get(head(errors), 'ErrStatus.code') || 500;
  }

  onRetry() {
    this.retry.emit();
  }
}
