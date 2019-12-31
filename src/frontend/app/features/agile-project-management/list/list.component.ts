import { ChangeDetectionStrategy, Component } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ToolBinding, ToolChainApiService } from '@app/api';
import { BindingKind, getCamelCaseToolKind } from '@app/api/tool-chain/utils';
import { Observable } from 'rxjs';
import {
  catchError,
  map,
  publishReplay,
  refCount,
  switchMap,
} from 'rxjs/operators';

@Component({
  templateUrl: './list.component.html',
  styleUrls: ['./list.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AgileProjectManagementIssuesListComponent {
  bindings$: Observable<ToolBinding[]>;

  constructor(
    private route: ActivatedRoute,
    private toolChainApi: ToolChainApiService,
  ) {
    this.bindings$ = this.fetchProjectManagementBindings();
  }

  fetchProjectManagementBindings() {
    return this.route.paramMap.pipe(
      switchMap(params => {
        const project = params.get('project');
        const toolType = getCamelCaseToolKind(BindingKind.ProjectManagement);
        return this.toolChainApi.getBindingsByProject(project, toolType);
      }),
      map(bindings =>
        bindings
          .slice()
          .sort(
            (a: ToolBinding, b: ToolBinding) =>
              +new Date(a.creationTimestamp) - +new Date(b.creationTimestamp),
          ),
      ),
      catchError(() => []),
      publishReplay(1),
      refCount(),
    );
  }
}
