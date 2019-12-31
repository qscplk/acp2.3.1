import { ChangeDetectionStrategy, Component, HostBinding } from '@angular/core';
import { ActivatedRoute, ParamMap } from '@angular/router';
import {
  PipelineApiService,
  PipelineConfigModel,
  PipelineTemplate,
} from '@app/api';
import { toNewPipelineConfig } from '@app/modules/pipeline/utils';
import { get } from 'lodash-es';
import { Observable } from 'rxjs';
import {
  distinctUntilChanged,
  map,
  publishReplay,
  refCount,
  switchMap,
  tap,
} from 'rxjs/operators';

@Component({
  selector: 'alo-pipeline-update',
  templateUrl: './pipeline-update.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PipelineUpdateComponent {
  project: string;
  name: string;
  type: 'upgrade' | '';
  param$ = this.route.paramMap.pipe(
    map((params: ParamMap) => {
      return {
        project: params.get('project'),
        name: params.get('name') || '',
      };
    }),
    tap(params => {
      this.project = params.project;
      this.name = params.name;
    }),
    distinctUntilChanged(),
    publishReplay(1),
    refCount(),
  );

  @HostBinding('class.pipeline-update')
  get cls() {
    return true;
  }

  constructor(
    private route: ActivatedRoute,
    private pipelineApi: PipelineApiService,
  ) {}

  getPipelineConfig = (): Observable<PipelineConfigModel> => {
    return this.pipelineApi
      .getPipelineConfigToModel(this.project, this.name)
      .pipe(
        switchMap((pipeline: PipelineConfigModel) => {
          const name = get(pipeline, [
            'template',
            'pipelineTemplateRef',
            'name',
          ]);
          const kind = get(pipeline, [
            'template',
            'pipelineTemplateRef',
            'kind',
          ]);
          if (kind.toLowerCase() === 'clusterpipelinetemplate') {
            return this.pipelineApi
              .clusterTemplateDetail(name)
              .pipe(
                map((target: PipelineTemplate) =>
                  toNewPipelineConfig<PipelineConfigModel>(pipeline, target),
                ),
              );
          } else {
            return this.pipelineApi
              .templateDetail(this.project, name)
              .pipe(
                map((targetTemplate: PipelineTemplate) =>
                  toNewPipelineConfig<PipelineConfigModel>(
                    pipeline,
                    targetTemplate,
                  ),
                ),
              );
          }
        }),
      );
  };
}
