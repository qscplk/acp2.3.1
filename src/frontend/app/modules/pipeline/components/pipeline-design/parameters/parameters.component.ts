import { TranslateService } from '@alauda/common-snippet';
import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { TemplateArgumentItem } from '@app/api';
import { keys } from 'lodash-es';
import { map, publishReplay, refCount } from 'rxjs/operators';

@Component({
  selector: 'alo-pipeline-design-parameters',
  templateUrl: './parameters.component.html',
  styleUrls: ['./parameters.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PipelineDesignParametersComponent {
  translateKey$ = this.translate.locale$.pipe(
    map((lang: string) => {
      return lang === 'en' ? 'en' : 'zh-CN';
    }),
    publishReplay(1),
    refCount(),
  );

  @Input()
  field: TemplateArgumentItem;

  constructor(private readonly translate: TranslateService) {}

  valueMapper(field: any) {
    return keys(field).map((key: string) => ({
      key,
      value: field[key],
    }));
  }
}
