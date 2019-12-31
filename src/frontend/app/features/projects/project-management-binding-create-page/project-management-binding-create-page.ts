import { ChangeDetectionStrategy, Component } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { map, publishReplay, refCount } from 'rxjs/operators';

@Component({
  templateUrl: 'project-management-binding-create-page.html',
  styleUrls: ['project-management-binding-create-page.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProjectManagementBindingCreatePageComponent {
  params$ = this.route.paramMap.pipe(
    map(paramMap => ({
      namespace: paramMap.get('name'),
      service: paramMap.get('service'),
    })),
    publishReplay(1),
    refCount(),
  );

  constructor(private route: ActivatedRoute) {}
}
