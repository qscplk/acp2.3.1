import { Location } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnDestroy } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ProjectApiService } from '@app/api';
import { Subscription, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

@Component({
  templateUrl: 'detail-page.component.html',
  styleUrls: ['detail-page.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProjectDetailPageComponent implements OnDestroy {
  name$ = this.route.paramMap.pipe(map(paramMap => paramMap.get('name')));
  bindingSub: Subscription;

  constructor(
    private route: ActivatedRoute,
    private location: Location,
    private api: ProjectApiService,
  ) {}

  fetchProject = (name: string) =>
    this.api.get(name).pipe(
      catchError(() => {
        this.location.back();
        return of(false);
      }),
    );

  ngOnDestroy() {
    if (this.bindingSub) {
      this.bindingSub.unsubscribe();
    }
  }
}
