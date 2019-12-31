import { ChangeDetectionStrategy, Component } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { map, publishReplay, refCount } from 'rxjs/operators';

@Component({
  templateUrl: 'code-quality-binding-detail-page.component.html',
  styleUrls: ['code-quality-binding-detail-page.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProjectCodeQualityBindingDetailPageComponent {
  namespace$ = this.route.paramMap.pipe(
    map(paramMap => paramMap.get('name')),
    publishReplay(1),
    refCount(),
  );
  bindingName$ = this.route.paramMap.pipe(
    map(paramMap => paramMap.get('bindingName')),
    publishReplay(1),
    refCount(),
  );

  constructor(private route: ActivatedRoute, private router: Router) {}

  onRemoved() {
    this.router.navigate([
      '/admin/projects',
      this.route.snapshot.paramMap.get('name'),
    ]);
  }
}
