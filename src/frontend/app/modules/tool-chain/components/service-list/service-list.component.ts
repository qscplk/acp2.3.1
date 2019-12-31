import { TranslateService } from '@alauda/common-snippet';
import { DialogService, DialogSize } from '@alauda/ui';
import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  Output,
} from '@angular/core';
import { ToolService } from '@app/api/tool-chain/tool-chain-api.types';
import { OAuthValidatorComponent } from '@app/shared/components/oauth-validator';
import { snakeCase } from 'lodash-es';
import { map } from 'rxjs/operators';

@Component({
  selector: 'alo-service-list',
  templateUrl: 'service-list.component.html',
  styleUrls: ['service-list.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ServiceListComponent {
  @Input()
  services: ToolService[];

  @Input()
  showTag = true;

  @Output()
  cardClick = new EventEmitter<ToolService>();

  snakeCase = snakeCase;

  enterpriseIcon$ = this.translate.locale$.pipe(
    map(lang => `icons/enterprise_${lang}.svg`),
  );

  constructor(
    private readonly translate: TranslateService,
    private readonly dialog: DialogService,
  ) {}

  trackByName(_: number, item: ToolService) {
    return item.name;
  }

  getServiceTipType(service: ToolService) {
    const status = service.status;
    if (status.phase === 'Creating') {
      if (
        service.status.message &&
        service.status.message.includes('not found')
      ) {
        return 'NoSecret';
      }
    } else if (status.phase === 'Error') {
      const abnormalConditions = (status.conditions || [])
        .filter((condition: Dictionary<string>) => condition.status !== 'Ready')
        .map((condition: Dictionary<string>) => condition.type);
      if (abnormalConditions.includes('HTTPStatus')) {
        return 'ServiceUnavailable';
      }
      if (abnormalConditions.includes('Authorization')) {
        return 'AuthFailed';
      }
    }
    return 'None';
  }

  isIntegrating(service: ToolService) {
    return (
      service.status.phase === 'Creating' &&
      (!service.status.message || !service.status.message.includes('not found'))
    );
  }

  secretValidate(service: ToolService) {
    const matches = /Authorization URL:\s*"(.*)"/.exec(service.status.message);
    const url = matches && matches.length > 0 ? matches[1] : '';

    this.dialog.open(OAuthValidatorComponent, {
      size: DialogSize.Small,
      data: {
        url,
        namespace: service.secretNamespace,
        secret: `${service.secretName}`,
        service: service.name,
      },
    });
  }
}
