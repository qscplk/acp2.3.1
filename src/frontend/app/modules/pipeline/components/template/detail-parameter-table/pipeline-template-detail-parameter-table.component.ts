import { TranslateService } from '@alauda/common-snippet';
import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { TemplateArgumentField } from '@app/api';
import { get } from 'lodash-es';

@Component({
  selector: 'alo-pipeline-template-detail-parameter-table',
  templateUrl: './pipeline-template-detail-parameter-table.component.html',
  styleUrls: ['./pipeline-template-detail-parameter-table.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PipelineTemplateDetailParameterTableComponent {
  columns = ['parameter', 'description'];
  @Input()
  parameterField: TemplateArgumentField;

  constructor(private readonly translate: TranslateService) {}

  getValue(path: string, target?: { [key: string]: any }) {
    const currentLang = this.translate.locale;
    return get(
      target || this.parameterField,
      `${path}.${currentLang === 'en' ? 'en' : 'zh-CN'}`,
      '',
    );
  }
}
