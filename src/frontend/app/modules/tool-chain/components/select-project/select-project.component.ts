import { DialogRef } from '@alauda/ui';
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { Project, ProjectApiService } from '@app/api';
import { BehaviorSubject } from 'rxjs';
import { tap } from 'rxjs/internal/operators/tap';
import { publishReplay, refCount, switchMap } from 'rxjs/operators';

@Component({
  templateUrl: 'select-project.component.html',
  styleUrls: ['select-project.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SelectProjectComponent {
  searchBy = 'name';
  loading = false;

  keyword$$ = new BehaviorSubject('');
  projectList$ = this.keyword$$.pipe(
    tap(() => {
      this.loading = true;
    }),
    switchMap(keyword =>
      this.projectApi.find(
        keyword && {
          fieldSelector: `metadata.name=${keyword}`,
        },
      ),
    ),
    tap(() => {
      this.loading = false;
    }),
    publishReplay(1),
    refCount(),
  );

  constructor(
    private projectApi: ProjectApiService,
    private dialogRef: DialogRef,
  ) {}

  select(project: Project) {
    this.dialogRef.close(project.name);
  }
}
