import { DIALOG_DATA, DialogRef } from '@alauda/ui';
import { ChangeDetectionStrategy, Component, Inject } from '@angular/core';
import { Router } from '@angular/router';
import { ArtifactRegistryApiService } from '@app/api/tool-chain/artifact-registry-api.service';
import { ToolChainApiService } from '@app/api/tool-chain/tool-chain-api.service';
import {
  ArtifactRegistryManagerService,
  ArtifactRegistryService,
  ToolService,
  ToolType,
} from '@app/api/tool-chain/tool-chain-api.types';
import { groupBy } from 'lodash-es';
import { BehaviorSubject, Subject, combineLatest, forkJoin } from 'rxjs';
import {
  map,
  publishReplay,
  refCount,
  startWith,
  switchMap,
  tap,
} from 'rxjs/operators';

@Component({
  selector: 'alo-select-service',
  templateUrl: 'select-service.component.html',
  styleUrls: ['select-service.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SelectServiceComponent {
  loading = true;
  selectedType = 'all';
  registryCount = 0;

  selectedType$$ = new BehaviorSubject<string>(this.selectedType);
  allServices$ = this.toolChainApi.findToolServices().pipe(
    tap(() => {
      this.loading = false;
    }),
    // map(data => data.items.filter(item => !item.shallow)), // TODO bring it back
    map(data => data.items),
    publishReplay(1),
    refCount(),
  );

  filteredServices$ = combineLatest(
    this.allServices$,
    this.selectedType$$,
  ).pipe(
    map(([tools, selectedType]) =>
      tools.filter(
        tool => selectedType === 'all' || tool.toolType === selectedType,
      ),
    ),
    publishReplay(1),
    refCount(),
  );

  hasServices$ = this.allServices$.pipe(
    map(services => services.length),
    publishReplay(1),
    refCount(),
  );

  registryUpdate$ = new Subject<null>();

  managers$ = this.registryUpdate$
    .pipe(
      startWith(null),
      switchMap(_ =>
        forkJoin(
          this.artifactRegistryApi.findArtifactRegistryManagers(),
          this.artifactRegistryApi.findAllRegistries(),
        ),
      ),
    )
    .pipe(
      tap(([, registries]) => (this.registryCount = registries.items.length)),
      map(([managers, registries]) => {
        const registryGroups = groupBy(
          registries.items,
          'artifactRegistryManager',
        );
        return managers.items.map(manager => ({
          ...manager,
          registries: registryGroups[manager.name] || [],
        }));
      }),
      publishReplay(1),
      refCount(),
    );

  filteredManagers$ = combineLatest(this.managers$, this.selectedType$$).pipe(
    map(([managers, selectedType]) => {
      return managers.filter(() =>
        ['all', 'artifactRepository'].includes(selectedType),
      );
    }),
    publishReplay(1),
    refCount(),
  );

  hasManagers$ = this.managers$.pipe(
    map(managers => managers.length),
    publishReplay(1),
    refCount(),
  );

  constructor(
    @Inject(DIALOG_DATA) public data: { types: ToolType[]; project: string },
    private readonly toolChainApi: ToolChainApiService,
    private readonly dialogRef: DialogRef<SelectServiceComponent, ToolService>,
    private readonly artifactRegistryApi: ArtifactRegistryApiService,
    private readonly router: Router,
  ) {}

  selectService(ins: ToolService) {
    this.dialogRef.close(ins);
  }

  navigateToDetail(
    ins: ToolService | ArtifactRegistryManagerService | ArtifactRegistryService,
  ) {
    this.router.navigate(['/admin/tool-chain', ins.kind, ins.name]);
  }

  closeSelf() {
    this.dialogRef.close();
  }
}
