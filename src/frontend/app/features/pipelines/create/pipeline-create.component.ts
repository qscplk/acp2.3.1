import { TranslateService } from '@alauda/common-snippet';
import { DialogService, DialogSize } from '@alauda/ui';
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { ActivatedRoute, ParamMap } from '@angular/router';
import { PipelineKind, PipelineTemplate } from '@app/api';
import { PipelineTemplateDetailComponent } from '@app/modules/pipeline/components/template/detail/pipeline-template-detail.component';
import { isEqual } from 'lodash-es';
import { combineLatest } from 'rxjs';
import {
  distinctUntilChanged,
  map,
  publishReplay,
  refCount,
} from 'rxjs/operators';

@Component({
  selector: 'alo-pipeline-create',
  templateUrl: './pipeline-create.component.html',
  styleUrls: ['./pipeline-create.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PipelineCreateComponent {
  selectedTemplate: PipelineTemplate;
  params$ = combineLatest(this.route.paramMap, this.route.queryParamMap).pipe(
    map(([params, queryParams]: ParamMap[]) => {
      return {
        project: params.get('project'),
        namespace: params.get('namespace'), // todo:remove
        method: queryParams.get('method') || PipelineKind.Script,
        type: queryParams.get('type') || '',
        name: queryParams.get('name') || '',
      };
    }),
    distinctUntilChanged(isEqual),
    publishReplay(1),
    refCount(),
  );

  constructor(
    private readonly route: ActivatedRoute,
    public translate: TranslateService,
    private readonly dialog: DialogService,
  ) {}

  onTemplateSelected(template: PipelineTemplate) {
    this.selectedTemplate = template;
  }

  openTemplateDetailDialog() {
    this.dialog.open(PipelineTemplateDetailComponent, {
      size: DialogSize.Large,
      data: {
        template: this.selectedTemplate,
        showSelect: false,
        disableSelect: true,
      },
    });
  }
}
