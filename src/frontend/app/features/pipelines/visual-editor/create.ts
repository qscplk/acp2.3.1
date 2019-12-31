import { ChangeDetectionStrategy, Component } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { combineLatest } from 'rxjs';
import { map } from 'rxjs/operators';

@Component({
  templateUrl: 'create.html',
  styleUrls: ['create.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PipelineVisualCreatePageComponent {
  constructor(private route: ActivatedRoute) {}

  params$ = combineLatest(
    this.route.paramMap.pipe(map(paramMap => paramMap.get('project'))),
    this.route.queryParamMap.pipe(map(paramMap => paramMap.get('clone') || '')),
  ).pipe(
    map(([project, cloneName]) => {
      if (!project) {
        return null;
      }

      return {
        project,
        cloneName,
      };
    }),
  );
}
