import { publishRef } from '@alauda/common-snippet';
import { DialogService, DialogSize } from '@alauda/ui';
import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  OnInit,
} from '@angular/core';
import { Router } from '@angular/router';
import { ListResult } from '@app/api/api.types';
import { ArtifactRegistryApiService } from '@app/api/tool-chain/artifact-registry-api.service';
import { ToolChainApiService } from '@app/api/tool-chain/tool-chain-api.service';
import {
  ArtifactRegistryManagerService,
  ArtifactRegistryService,
  ToolService,
  ToolType,
} from '@app/api/tool-chain/tool-chain-api.types';
import { IntegrateToolComponent } from '@app/modules/tool-chain/components/integrate-tool/integrate-tool.component';
import * as R from 'ramda';
import { BehaviorSubject, Subject, combineLatest, forkJoin } from 'rxjs';
import {
  delay,
  map,
  startWith,
  switchMap,
  take,
  takeUntil,
  tap,
} from 'rxjs/operators';

const compareByName = (prev: { name: string }, next: { name: string }) => {
  return prev.name.localeCompare(next.name);
};
@Component({
  templateUrl: 'list-page.component.html',
  styleUrls: ['list-page.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ListPageComponent implements OnInit, OnDestroy {
  selectedType = 'all';
  loading = true;
  loadingManagers = true;
  registryCount = 0;

  destroy$ = new Subject<void>();

  selectedType$$ = new BehaviorSubject<string>(this.selectedType);
  toolTypes$ = this.toolChainApi.getToolChains().pipe(
    map(types =>
      types
        .filter(type => type.enabled)
        .slice()
        .sort(compareByName)
        .map(type => ({
          ...type,
          items: type.items.filter(item => item.enabled),
        })),
    ),
    publishRef(),
  );

  // Hide ArtifactRegistryManger types
  visibleToolTypes$ = this.toolTypes$.pipe(
    map(types => types.filter(type => type.name !== 'artifactRegistryManager')),
    publishRef(),
  );

  refetchServices$ = new Subject<void>();
  allServices$ = combineLatest([
    this.toolTypes$,
    this.refetchServices$.pipe(startWith(null)),
  ]).pipe(
    switchMap(([types]) =>
      this.toolChainApi.findToolServices().pipe(
        map(services => ({
          services,
          types,
        })),
      ),
    ),
    tap(() => {
      this.loading = false;
    }),
    map(data => this.sortByToolTypeAndName(data)),
    publishRef(),
  );

  servicesPull$ = this.allServices$.pipe(delay(5000), takeUntil(this.destroy$));

  filteredServices$ = combineLatest([
    this.allServices$,
    this.selectedType$$,
  ]).pipe(
    map(([tools, selectedType]) =>
      tools.filter(
        tool => selectedType === 'all' || tool.toolType === selectedType,
      ),
    ),
    publishRef(),
  );

  refetchRegistries$ = new Subject<void>();
  managers$ = this.refetchRegistries$.pipe(
    startWith(null),
    switchMap(() =>
      forkJoin([
        this.artifactRegistryApi.findArtifactRegistryManagers(),
        this.artifactRegistryApi.findAllRegistries(),
      ]),
    ),
    tap(([, registries]) => (this.registryCount = registries.items.length)),
    map(([managers, registries]) => {
      const registryGroups = R.groupBy(
        R.prop('artifactRegistryManager'),
        registries.items,
      );
      return managers.items.sort(compareByName).map(manager => ({
        ...manager,
        registries: (registryGroups[manager.name] || []).sort(compareByName),
      }));
    }),
    publishRef(),
  );

  filteredManages$ = combineLatest([this.managers$, this.selectedType$$]).pipe(
    map(([tools, selectedType]) =>
      tools.filter(() => ['all', 'artifactRepository'].includes(selectedType)),
    ),
    publishRef(),
  );

  hasServices$ = this.allServices$.pipe(
    map(ins => ins && ins.length),
    publishRef(),
  );

  registriesPull$ = this.managers$.pipe(delay(5000), takeUntil(this.destroy$));

  constructor(
    private readonly toolChainApi: ToolChainApiService,
    private readonly artifactRegistryApi: ArtifactRegistryApiService,
    private readonly dialog: DialogService,
    private readonly router: Router,
  ) {}

  ngOnInit() {
    this.registriesPull$.subscribe(() => {
      this.refetchRegistries$.next();
    });
    this.servicesPull$.subscribe(() => {
      this.refetchServices$.next();
    });
  }

  getToolType(tools: ToolType[]) {
    return tools.map(tool => tool.name);
  }

  sortByToolTypeAndName(data: {
    services: ListResult<ToolService>;
    types: ToolType[];
  }): ToolService[] {
    const toolType = this.getToolType(data.types);
    const groupByToolTypeFn = R.groupBy((item: ToolService) =>
      R.indexOf(item.toolType, toolType),
    );
    const byNameFn = R.ascend((item: ToolService) => item.name);
    const sortByToolNameFn = R.map((item: Array<Dictionary<ToolService>>) =>
      R.sort(byNameFn, item as ToolService[]),
    );
    return R.unnest(
      R.values(sortByToolNameFn(groupByToolTypeFn(data.services.items))),
    );
  }

  integrateTool() {
    combineLatest([
      this.toolTypes$,
      this.allServices$.pipe(
        map(items => items.filter(item => item.public).map(item => item.type)),
      ),
    ])
      .pipe(
        take(1),
        map(([allTypes, excludeTypes]) =>
          allTypes.map(toolType => ({
            ...toolType,
            items: toolType.items.filter(
              tool => !tool.public || !excludeTypes.includes(tool.type),
            ),
          })),
        ),
      )
      .subscribe(toolTypes => {
        const dialogRef = this.dialog.open(IntegrateToolComponent, {
          data: toolTypes,
          size: DialogSize.Large,
        });
        dialogRef.afterClosed().subscribe(data => {
          if (data) {
            this.router.navigate(['/admin/tool-chain', data.kind, data.name]);
          }
        });
      });
  }

  navigateToDetail(
    ins: ToolService | ArtifactRegistryManagerService | ArtifactRegistryService,
  ) {
    this.router.navigate(['/admin/tool-chain', ins.kind, ins.name]);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
  }
}
