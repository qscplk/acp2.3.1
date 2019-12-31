import { ChangeDetectionStrategy, Component } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { map, publishReplay, refCount } from 'rxjs/operators';

@Component({
  selector: 'alo-container-update-page',
  templateUrl: './container-update-page.component.html',
  styleUrls: ['./container-update-page.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ContainerUpdatePageComponent {
  constructor(private route: ActivatedRoute) {}

  identity$ = this.route.paramMap.pipe(
    map(paramMap => ({
      applicationName: paramMap.get('name'),
      cluster: paramMap.get('cluster'),
      namespace: paramMap.get('namespace'),
      resourceName: paramMap.get('resourceName'),
    })),
    publishReplay(1),
    refCount(),
  );
}
