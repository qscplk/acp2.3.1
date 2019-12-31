import {
  ChangeDetectionStrategy,
  Component,
  Input,
  ViewChild,
} from '@angular/core';
import { PipelineTemplateListContainerComponent } from '@app/modules/pipeline/components/template/list-container/list-container.component';

@Component({
  selector: 'alo-pipeline-template',
  templateUrl: './pipeline-template.component.html',
  styleUrls: ['./pipeline-template.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PipelineTemplateComponent {
  @Input() project: string;
  @ViewChild(PipelineTemplateListContainerComponent, { static: true })
  templateContainer: PipelineTemplateListContainerComponent;
  constructor() {}

  syncChange() {
    this.templateContainer.typeChange('custom');
  }
}
