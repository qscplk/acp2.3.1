import { TranslateService } from '@alauda/common-snippet';
import {
  DIALOG_DATA,
  DialogRef,
  MessageService,
  NotificationService,
} from '@alauda/ui';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  Inject,
  OnInit,
  ViewChild,
} from '@angular/core';
import { NgForm } from '@angular/forms';
import {
  JenkinsApiService,
  Secret,
  SecretApiService,
  SecretType,
  groupByScope,
} from '@app/api';
import { SecretActions } from '@app/modules/secret/services/acitons';
import debug from 'debug';
import { Subject, combineLatest, of } from 'rxjs';
import {
  catchError,
  map,
  publishReplay,
  refCount,
  startWith,
  switchMap,
} from 'rxjs/operators';

const log = debug('jenkinsbinding:binding-update-dialog');

interface FormModel {
  description: string;
  secret: string;
}

@Component({
  templateUrl: 'binding-update-dialog.component.html',
  styleUrls: ['binding-update-dialog.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class JenkinsBindingUpdateDialogComponent implements OnInit {
  model: FormModel = null;

  service: string;

  loading = false;

  saving = false;

  secretTypes = SecretType;

  private readonly secretsUpdated$$ = new Subject<void>();

  secrets$ = combineLatest(
    of(null),
    this.secretsUpdated$$.pipe(startWith(null)),
  ).pipe(
    switchMap(() => this.secretApi.find(null, this.data.namespace, true)),
    map(res => res.items.filter(item => item.type === SecretType.BasicAuth)),
    map(groupByScope),
    publishReplay(1),
    refCount(),
  );

  @ViewChild('form', { static: true })
  form: NgForm;

  constructor(
    @Inject(DIALOG_DATA) public data: any,
    private readonly dialogRef: DialogRef,
    private readonly jenkinsApi: JenkinsApiService,
    private readonly secretApi: SecretApiService,
    private readonly secretActions: SecretActions,
    private readonly notification: NotificationService,
    private readonly message: MessageService,
    private readonly translate: TranslateService,
    private readonly cdr: ChangeDetectorRef,
  ) {
    this.model = {
      description: '',
      secret: '',
    };
  }

  ngOnInit() {
    this.loading = true;
    this.jenkinsApi.getBinding(this.data.namespace, this.data.name).subscribe(
      binding => {
        this.model = {
          description: binding.description,
          secret: binding.secret,
        };
        this.service = binding.service;
        this.loading = false;
        this.cdr.markForCheck();
      },
      (error: any) => {
        this.notification.warning({
          title: '',
          content: error.error.error || error.error.message,
        });
        this.loading = false;
        this.cdr.markForCheck();
      },
    );
  }

  addSecret() {
    return this.jenkinsApi
      .getService(this.service)
      .pipe(
        catchError(() => of(null)),
        switchMap(data => {
          if (!data) {
            return this.secretActions.create([SecretType.BasicAuth], '');
          }

          const { toolKind, toolType } = data;

          return this.secretActions.createForToolChain(
            toolKind,
            toolType,
            SecretType.BasicAuth,
          );
        }),
      )
      .subscribe(result => {
        if (result) {
          this.model.secret = this.secretToValue(result);
          this.secretsUpdated$$.next();
        }
      });
  }

  secretToValue(secret: Secret) {
    return `${secret.namespace}/${secret.name}`;
  }

  submit() {
    this.form.onSubmit(null);

    log('form value', this.model);

    if (this.form.invalid) {
      return;
    }

    this.saving = true;

    this.jenkinsApi
      .updateBinding({
        namespace: this.data.namespace,
        name: this.data.name,
        service: this.service,
        ...this.model,
      })
      .subscribe(
        () => {
          this.message.success(
            this.translate.get('jenkins_binding.update_binding_succ'),
          );
          this.dialogRef.close(true);
        },
        (error: any) => {
          this.notification.error({
            title: this.translate.get('jenkins_binding.update_binding_failed'),
            content: error.error.error || error.error.message,
          });
          this.saving = false;
          this.cdr.markForCheck();
        },
      );
  }
}
