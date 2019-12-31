import { TranslateService } from '@alauda/common-snippet';
import { MessageService, NotificationService } from '@alauda/ui';
import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  Output,
} from '@angular/core';
import { RegistryApiService } from '@app/api/registry/registry-api.service';
import { RegistryBinding } from '@app/api/registry/registry-api.types';
import { mapRepositoriesToTreeNodes } from '@app/modules/registry/components/binding-wizard/distribute-registry-form/utils';
import { ReplaySubject, Subject, combineLatest, merge, of } from 'rxjs';
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
  selector: 'alo-distribute-registry-form',
  templateUrl: 'distribute-registry-form.component.html',
  styleUrls: ['distribute-registry-form.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DistributeRegistryFormComponent {
  private _namespace: string;
  private _binding: RegistryBinding;

  private readonly namespace$$ = new ReplaySubject<string>(1);
  private readonly binding$$ = new ReplaySubject<RegistryBinding>(1);

  @Input()
  get namespace() {
    return this._namespace;
  }

  set namespace(val) {
    if (!val) {
      return;
    }
    this._namespace = val;
    this.namespace$$.next(val);
  }

  @Input()
  get binding() {
    return this._binding;
  }

  set binding(val) {
    if (!val) {
      return;
    }
    this._binding = val;
    this.binding$$.next(val);
  }

  @Output()
  statusChange = new EventEmitter<boolean>();

  @Output()
  assigned = new EventEmitter<void>();

  currentAddress: string = null;
  loading = false;

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
    }, []),
    publishReplay(1),
    refCount(),
  );

  addressList$ = combineLatest(this.namespace$$, this.binding$$).pipe(
    tap(() => {
      this.loading = true;
    }),
    switchMap(([namespace, binding]) =>
      this.registryApi.getAllRemoteRepositoriesByRegistryBinding(
        namespace,
        binding.name,
      ),
    ),
    tap(() => {
      this.loading = false;
    }),
    catchError(error => {
      this.loading = false;
      this.notifaction.error({
        title: this.translate.get('registry.fetch_remote_repositories_failed'),
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
    private readonly registryApi: RegistryApiService,
    private readonly message: MessageService,
    private readonly notifaction: NotificationService,
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
    this.statusChange.emit(true);
    this.selectedAddressList$
      .pipe(
        take(1),
        switchMap(repoList =>
          this.registryApi.updateBinding({
            ...this.binding,
            repositories: repoList,
          }),
        ),
      )
      .subscribe(
        () => {
          this.message.success(
            this.translate.get('registry.assign_repositories_succ'),
          );
          this.statusChange.emit(false);
          this.assigned.emit();
        },
        error => {
          this.notifaction.error({
            title: this.translate.get('registry.assign_repositories_failed'),
            content: error.error.error || error.error.message,
          });
          this.statusChange.emit(false);
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
