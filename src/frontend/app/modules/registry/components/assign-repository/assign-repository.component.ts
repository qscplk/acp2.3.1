import { TranslateService } from '@alauda/common-snippet';
import {
  DIALOG_DATA,
  DialogRef,
  MessageService,
  NotificationService,
} from '@alauda/ui';
import { ChangeDetectionStrategy, Component, Inject } from '@angular/core';
import { RegistryApiService } from '@app/api/registry/registry-api.service';
import { RegistryBinding } from '@app/api/registry/registry-api.types';
import { mapRepositoriesToTreeNodes } from '@app/modules/registry/components/binding-wizard/distribute-registry-form/utils';
import { Subject, combineLatest, merge, of } from 'rxjs';
import {
  catchError,
  map,
  publishReplay,
  refCount,
  scan,
  startWith,
  switchMap,
  take,
  tap,
} from 'rxjs/operators';

@Component({
  templateUrl: 'assign-repository.component.html',
  styleUrls: ['assign-repository.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AssignRepositoryComponent {
  currentAddress: string = null;
  loading = true;

  addAddress$$ = new Subject<string>();
  removeAddress$$ = new Subject<string>();

  selectedAddressList$ = merge(
    this.addAddress$$.pipe(
      map(address => (list: string[]) => {
        if (address === '/') {
          return ['/'];
        } else {
          return list
            .filter(item => !`${item}/`.startsWith(`${address}/`))
            .concat(address);
        }
      }),
    ),
    this.removeAddress$$.pipe(
      map(address => (list: string[]) => list.filter(item => item !== address)),
    ),
  ).pipe(
    startWith((arg: any) => arg),
    scan((prev: string[], operator: (list: string[]) => string[]) => {
      return operator(prev);
    }, this.data.binding.repositories),
    publishReplay(1),
    refCount(),
  );

  addressList$ = this.registryApi
    .getAllRemoteRepositoriesByRegistryBinding(
      this.data.binding.namespace,
      this.data.binding.name,
    )
    .pipe(
      tap(() => {
        this.loading = false;
      }),
      catchError(error => {
        this.loading = false;
        this.notifaction.error({
          title: this.translate.get(
            'registry.fetch_remote_repositories_failed',
          ),
          content: error.error.error || error.error.message,
        });
        return of([] as string[]);
      }),
      publishReplay(1),
      refCount(),
    );

  filteredAddressList$ = combineLatest(
    this.addressList$,
    this.selectedAddressList$,
  ).pipe(
    map(([allAddresses, selectedAddresses]) => {
      if (selectedAddresses.find(item => item === '/')) {
        return null;
      } else {
        return allAddresses.filter(
          address =>
            !selectedAddresses.find(selected =>
              `${address}/`.startsWith(`${selected}/`),
            ),
        );
      }
    }),
    map(mapRepositoriesToTreeNodes),
    publishReplay(1),
    refCount(),
  );

  constructor(
    @Inject(DIALOG_DATA)
    private readonly data: {
      binding: RegistryBinding;
    },
    private readonly dialogRef: DialogRef,
    private readonly registryApi: RegistryApiService,
    private readonly notifaction: NotificationService,
    private readonly message: MessageService,
    private readonly translate: TranslateService,
  ) {}

  addAddress() {
    if (!this.currentAddress) {
      return;
    }
    this.addAddress$$.next(this.currentAddress);
    this.currentAddress = null;
  }

  removeAddress(path: string) {
    this.removeAddress$$.next(path);
  }

  submit() {
    this.selectedAddressList$
      .pipe(
        take(1),
        switchMap(repoList =>
          this.registryApi.updateBinding({
            ...this.data.binding,
            repositories: repoList,
          }),
        ),
      )
      .subscribe(
        () => {
          this.message.success(
            this.translate.get('registry.assigning_repositories'),
          );
          this.dialogRef.close(true);
        },
        error => {
          this.notifaction.error({
            title: this.translate.get('registry.assign_repositories_failed'),
            content: error.error.error || error.error.message,
          });
        },
      );
  }

  filterAddressFn(filter: string, node: { label: string; value: string[] }) {
    return node.value.join('/').includes(filter);
  }

  valueChange = (addressList: string[]) => {
    this.currentAddress = addressList.join('/');
  };
}
