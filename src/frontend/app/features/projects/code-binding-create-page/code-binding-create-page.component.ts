import { ChangeDetectionStrategy, Component } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { map, publishReplay, refCount } from 'rxjs/operators';

@Component({
  templateUrl: 'code-binding-create-page.component.html',
  styleUrls: ['code-binding-create-page.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProjectCodeBindingCreatePageComponent {
  namespace$ = this.route.paramMap.pipe(
    map(paramMap => paramMap.get('name')),
    publishReplay(1),
    refCount(),
  );

  service$ = this.route.paramMap.pipe(
    map(paramMap => paramMap.get('service')),
    publishReplay(1),
    refCount(),
  );

  constructor(private route: ActivatedRoute) {}
}
