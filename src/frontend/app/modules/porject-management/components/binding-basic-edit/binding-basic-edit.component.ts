import { ObservableInput, TranslateService } from '@alauda/common-snippet';
import { MessageService, NotificationService } from '@alauda/ui';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
  ViewChild,
} from '@angular/core';
import { FormBuilder, FormGroup, NgForm, Validators } from '@angular/forms';
import { Secret, SecretApiService, SecretType, groupByScope } from '@app/api';
import { ProjectManagementApiService } from '@app/api/project-management/project-management.service';
import { ProjectManagementBinding } from '@app/api/project-management/project-management.types';
import { ToolKind } from '@app/api/tool-chain/utils';
import { SecretActions } from '@app/modules/secret/services/acitons';
import { TOOLCHAIN_BINDING_NAME } from '@app/utils/patterns';
import { Observable, Subject, combineLatest, of } from 'rxjs';
import {
  catchError,
  map,
  publishReplay,
  refCount,
  startWith,
  switchMap,
} from 'rxjs/operators';

@Component({
  selector: 'alo-project-management-binding-account-form',
  templateUrl: './binding-basic-edit.component.html',
  styleUrls: ['./binding-basic-edit.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProjectManagementBindingBasicEditComponent implements OnChanges {
  form: FormGroup;
  SecretType = SecretType;

  @Input()
  namespace: string;

  @ObservableInput(true)
  private readonly namespace$: Observable<string>;

  @Input()
  service: string;

  @Output()
  statusChange = new EventEmitter<boolean>();

  @Output()
  bound = new EventEmitter<ProjectManagementBinding>();

  @ViewChild('ngForm', { static: false })
  ngForm: NgForm;

  nameRule = TOOLCHAIN_BINDING_NAME;

  private readonly secretsUpdated$$ = new Subject<void>();

  secrets$ = combineLatest([
    this.namespace$,
    this.secretsUpdated$$.pipe(startWith(null)),
  ]).pipe(
    switchMap(([namespace]) => this.secretApi.find(null, namespace, true)),
    map(res => res.items.filter(item => item.type === SecretType.BasicAuth)),
    map(groupByScope),
    publishReplay(1),
    refCount(),
  );

  constructor(
    private readonly fb: FormBuilder,
    private readonly cdr: ChangeDetectorRef,
    private readonly secretApi: SecretApiService,
    private readonly projectManagementApi: ProjectManagementApiService,
    private readonly secretActions: SecretActions,
    private readonly notification: NotificationService,
    private readonly translate: TranslateService,
    private readonly message: MessageService,
  ) {}

  ngOnChanges({ namespace, service }: SimpleChanges): void {
    if (
      namespace &&
      namespace.currentValue &&
      service &&
      service.currentValue
    ) {
      this.form = this.buildForm();
    }
  }

  private buildForm() {
    return this.fb.group({
      name: this.fb.control(`${this.service}-${this.namespace}`, [
        Validators.required,
        Validators.pattern(this.nameRule.pattern),
        Validators.maxLength(this.nameRule.maxLength),
      ]),
      description: '',
      authType: SecretType.BasicAuth,
      secret: this.fb.control('', [Validators.required]),
    });
  }

  secretToValue(secret: Secret) {
    return `${secret.namespace}/${secret.name}`;
  }

  addSecret() {
    this.projectManagementApi
      .getService(this.service)
      .pipe(
        catchError(() => of(null)),
        switchMap(service => {
          return this.secretActions.createForToolChain(
            ToolKind.ProjectManagement,
            service.type,
            SecretType.BasicAuth,
          );
        }),
      )
      .subscribe(result => {
        if (result) {
          this.form.controls.secret.setValue(this.secretToValue(result));
          this.secretsUpdated$$.next();
        }
      });
  }

  submit() {
    this.ngForm.onSubmit(null);
    this.cdr.markForCheck();
    if (this.form.invalid) {
      return;
    }
    this.statusChange.emit(true);
    this.projectManagementApi
      .createBinding({
        namespace: this.namespace,
        service: this.service,
        name: this.form.value.name,
        description: this.form.value.description,
        secret: this.form.value.secret,
      })
      .subscribe(
        binding => {
          this.message.success(this.translate.get('project.bind_account_succ'));
          this.statusChange.emit(false);
          this.bound.emit(binding);
        },
        (error: any) => {
          this.notification.error({
            title: this.translate.get('project.bind_account_failed'),
            content: error.error.error || error.error.message,
          });
          this.statusChange.emit(false);
        },
      );
  }
}
