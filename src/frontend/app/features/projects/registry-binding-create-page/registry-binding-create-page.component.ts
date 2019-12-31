import { ChangeDetectionStrategy, Component } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { map, publishReplay, refCount } from 'rxjs/operators';

@Component({
  templateUrl: 'registry-binding-create-page.component.html',
  styleUrls: ['registry-binding-create-page.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RegistryBindingCreatePageComponent {
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
