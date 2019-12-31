import { ChangeDetectionStrategy, Component } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { map } from 'rxjs/operators';

@Component({
  templateUrl: 'update.html',
  styleUrls: ['update.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PipelineVisualUpdatePageComponent {
  constructor(private route: ActivatedRoute) {}

  params$ = this.route.paramMap.pipe(
    map(paramMap => ({
      project: paramMap.get('project'),
      name: paramMap.get('name'),
    })),
  );
}
