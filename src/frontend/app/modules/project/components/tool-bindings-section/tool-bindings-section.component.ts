import { DialogService, DialogSize } from '@alauda/ui';
import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { Router } from '@angular/router';
import { ArtifactRegistryApiService } from '@app/api/tool-chain/artifact-registry-api.service';
import { ToolChainApiService } from '@app/api/tool-chain/tool-chain-api.service';
import { ToolBinding } from '@app/api/tool-chain/tool-chain-api.types';
import { SelectServiceComponent } from '@app/modules/tool-chain/components/select-service/select-service.component';
import {
  BehaviorSubject,
  ReplaySubject,
  Subject,
  combineLatest,
  forkJoin,
} from 'rxjs';
import {
  map,
  publishReplay,
  refCount,
  startWith,
  switchMap,
  take,
  tap,
} from 'rxjs/operators';

@Component({
  selector: 'alo-tool-bindings-section',
  templateUrl: 'tool-bindings-section.component.html',
  styleUrls: ['tool-bindings-section.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ToolBindingsSectionComponent {
  @Input()
  get project() {
    return this._project;
  }

  set project(val) {
    if (val === this._project) {
      return;
    }
    this._project = val;
    this.project$$.next(val);
  }

  private _project: string;

  selectedType = 'all';
  loading = false;

  registryCount = 0;
  resourceBindings: ToolBinding[] = [];

  selectedType$$ = new BehaviorSubject<string>(this.selectedType);
  filterKey$$ = new BehaviorSubject<string>('');
  bindingUpdated$$ = new Subject<void>();
  project$$ = new ReplaySubject<string>(1);
  toolTypes$ = this.toolChainApi.getToolChains().pipe(
    map(types =>
      types.filter(
        type => type.enabled && type.name !== 'artifactRegistryManager',
      ),
    ),
    publishReplay(1),
    refCount(),
  );

  allBindings$ = combineLatest(
    this.project$$,
    this.bindingUpdated$$.pipe(startWith(null)),
  ).pipe(
    tap(() => {
      this.loading = true;
    }),
    switchMap(([namespace]) =>
      forkJoin(
        this.toolChainApi.getBindingsByProject(namespace),
        this.artifactRegistryApi.getBindingsByProject(namespace),
      ),
    ),
    tap(([bindings, registryBindings]) => {
      this.loading = false;
      this.registryCount = registryBindings.length;
      this.resourceBindings = bindings;
    }),
    map(([bindings, registryBindings]) => [...bindings, ...registryBindings]),
    publishReplay(1),
    refCount(),
  );

  filteredBindings$ = combineLatest(
    this.allBindings$,
    this.selectedType$$,
    this.filterKey$$,
    this.toolTypes$.pipe(
      map(types =>
        types.reduce(
          (prev, type, index) => ({ ...prev, [type.name]: index }),
          {} as { [key: string]: number },
        ),
      ),
    ),
  ).pipe(
    map(([bindings, selectedType, filterKey, typeWeight]) =>
      bindings
        .filter(binding => {
          return (
            selectedType === 'all' ||
            (selectedType === 'artifactRepository'
              ? ['artifactRepository', 'artifactRegistry'].includes(
                  binding.tool.toolType,
                )
              : binding.tool.toolType === selectedType)
          );
        })
        .filter(binding => binding.name.includes(filterKey))
        .sort((a, b) => {
          if (a.tool.toolType === b.tool.toolType) {
            return a.name.localeCompare(b.name);
          } else {
            return typeWeight[a.tool.toolType] - typeWeight[b.tool.toolType];
          }
        }),
    ),
    publishReplay(1),
    refCount(),
  );

  hasBindings$ = this.allBindings$.pipe(
    map(item => item && item.length),
    publishReplay(1),
    refCount(),
  );

  constructor(
    private readonly toolChainApi: ToolChainApiService,
    private readonly artifactRegistryApi: ArtifactRegistryApiService,
    private readonly router: Router,
    private readonly dialog: DialogService,
  ) {}

  navigateToDetail(binding: ToolBinding) {
    this.router.navigate([
      'admin/projects',
      this.project,
      binding.kind,
      binding.name,
    ]);
  }

  bindTool() {
    this.toolTypes$.pipe(take(1)).subscribe(types => {
      this.dialog
        .open(SelectServiceComponent, {
          size: DialogSize.Large,
          data: {
            types,
            project: this.project,
          },
        })
        .afterClosed()
        .subscribe(ins => {
          if (ins) {
            this.router.navigate([
              '/admin/projects/',
              this.project,
              'create-binding',
              ins.kind,
              ins.name,
            ]);
          }
        });
    });
  }
}
