import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { PipelineTemplate } from '@app/api';

@Component({
  selector: 'alo-pipeline-template-list',
  templateUrl: './pipeline-template-list.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PipelineTemplateListComponent {
  @Input() templates: PipelineTemplate[];
}
