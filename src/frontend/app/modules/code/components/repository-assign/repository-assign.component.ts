import { TranslateService } from '@alauda/common-snippet';
import {
  DialogService,
  DialogSize,
  MessageService,
  NotificationService,
} from '@alauda/ui';
import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  EventEmitter,
  Input,
  OnChanges,
  Output,
} from '@angular/core';
import { CodeApiService } from '@app/api/code/code-api.service';
import {
  CodeBinding,
  CodeRepoOwner,
  RemoteRepositoryOwner,
} from '@app/api/code/code-api.types';
import { forkJoin } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';

import { CodeBindingUpdateReportDialogComponent } from '../binding-update-report-dialog/binding-update-report-dialog.component';

@Component({
  selector: 'alo-code-repository-assign',
  templateUrl: 'repository-assign.component.html',
  styleUrls: ['repository-assign.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  exportAs: 'alo-code-repository-assign',
})
export class CodeRepositoryAssignComponent implements OnChanges {
  @Input()
  namespace: string;

  @Input()
  name: string;

  @Output()
  saved = new EventEmitter<void>();

  personalAccounts: RemoteRepositoryOwner[];

  teamAccounts: RemoteRepositoryOwner[];

  hasError = false;

  owners: {
    [name: string]: CodeRepoOwner;
  };

  initialized = false;

  loading = false;

  saving = false;

  private original: CodeBinding;

  constructor(
    private readonly codeApi: CodeApiService,
    private readonly cdr: ChangeDetectorRef,
    private readonly notifaction: NotificationService,
    private readonly message: MessageService,
    private readonly dialog: DialogService,
    private readonly translate: TranslateService,
  ) {}

  ngOnChanges() {
    this.loadForm();
  }

  refresh() {
    this.loadForm(true);
  }

  submit() {
    this.saving = true;
    const owners = Object.keys(this.owners)
      .filter(
        key => this.owners[key].all || this.owners[key].repositories.length,
      )
      .map(key =>
        this.owners[key].all
          ? { ...this.owners[key], repositories: [] }
          : this.owners[key],
      );
    this.saving = true;
    this.codeApi
      .updateBinding({
        ...this.original,
        owners,
      })
      .subscribe(
        result => {
          this.saving = false;
          this.cdr.markForCheck();
          this.saved.emit();
          this.message.success(
            this.translate.get('registry.assigning_repositories'),
          );
          if (result.items && result.items.length) {
            this.dialog.open(CodeBindingUpdateReportDialogComponent, {
              size: DialogSize.Large,
              data: result.items,
            });
          }
        },
        (error: any) => {
          this.saving = false;
          this.cdr.markForCheck();
          this.notifaction.error({
            title: 'code.repository_assign_fail',
            content: error.error.error || error.error.message || undefined,
          });
        },
      );
  }

  getMatched(account: RemoteRepositoryOwner) {
    if (!this.owners[`${account.type}/${account.name}`]) {
      this.owners[`${account.type}/${account.name}`] = {
        type: account.type,
        name: account.name,
        all: false,
        repositories: [],
      };
    }

    return this.owners[`${account.type}/${account.name}`];
  }

  updateSelected(account: RemoteRepositoryOwner, repositories: string[] = []) {
    const matched = this.getMatched(account);
    this.owners[`${account.type}/${account.name}`] = {
      ...matched,
      repositories,
    };
  }

  updateAutoSync(account: RemoteRepositoryOwner, all = false) {
    const matched = this.getMatched(account);
    this.owners[`${account.type}/${account.name}`] = {
      ...matched,
      all,
    };
  }

  private loadForm(force = false) {
    if ((!this.initialized || force) && this.name && this.namespace) {
      this.loading = true;
      this.hasError = false;
      forkJoin(this.getOwners(), this.getRemoteRepository()).subscribe(
        ([owners, { personal, team }]) => {
          this.personalAccounts = personal;
          this.teamAccounts = team;
          this.owners = owners;
          this.initialized = true;
          this.loading = false;
          this.cdr.markForCheck();
        },
        (error: { title: string; content: string }) => {
          this.personalAccounts = [];
          this.teamAccounts = [];
          this.hasError = true;
          this.owners = {};
          this.initialized = true;
          this.loading = false;
          this.cdr.markForCheck();
          this.notifaction.warning(error);
        },
      );
    }
  }

  private getRemoteRepository() {
    return this.codeApi
      .getBindingRemoteRepositories(this.namespace, this.name)
      .pipe(
        map(result => {
          return (result.owners || []).reduce(
            (accum, item) => {
              return {
                ...accum,
                personal:
                  item.type === 'User'
                    ? [
                        ...accum.personal,
                        { ...item, repositories: item.repositories || [] },
                      ]
                    : accum.personal,
                team:
                  item.type === 'Org'
                    ? [
                        ...accum.team,
                        { ...item, repositories: item.repositories || [] },
                      ]
                    : accum.team,
              };
            },
            {
              personal: [] as RemoteRepositoryOwner[],
              team: [] as RemoteRepositoryOwner[],
            },
          );
        }),
        catchError(
          this.throwFriendlyError('code.remote_repositories_load_fail'),
        ),
      );
  }

  private getOwners() {
    return this.codeApi.getBinding(this.namespace, this.name).pipe(
      tap(result => (this.original = result)),
      map(result =>
        result.owners.reduce(
          (accum, item) => ({ ...accum, [`${item.type}/${item.name}`]: item }),
          {},
        ),
      ),
      catchError(this.throwFriendlyError('code.code_binding_not_found')),
    );
  }

  private throwFriendlyError(translateKey: string) {
    return (error: HttpErrorResponse) => {
      throw {
        title: this.translate.get(translateKey),
        content: error.error.error || error.error.message || undefined,
      };
    };
  }
}
