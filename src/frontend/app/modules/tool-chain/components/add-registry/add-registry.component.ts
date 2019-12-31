import { publishRef } from '@alauda/common-snippet';
import { DIALOG_DATA, NotificationService } from '@alauda/ui';
import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  EventEmitter,
  Inject,
  OnDestroy,
  OnInit,
  Output,
  ViewChild,
} from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  FormGroup,
  NgForm,
  Validators,
} from '@angular/forms';
import { Secret, SecretApiService, SecretType } from '@app/api';
import { ArtifactRegistryApiService } from '@app/api/tool-chain/artifact-registry-api.service';
import { ToolKind } from '@app/api/tool-chain/utils';
import { SecretActions } from '@app/modules/secret/services/acitons';
import { TOOLCHAIN_BINDING_NAME } from '@app/utils/patterns';
import * as R from 'ramda';
import { Subject, forkJoin, of, race } from 'rxjs';
import {
  catchError,
  delay,
  map,
  publishReplay,
  refCount,
  startWith,
  switchMap,
  takeUntil,
  tap,
  toArray,
  withLatestFrom,
} from 'rxjs/operators';

@Component({
  templateUrl: './add-registry.component.html',
  styleUrls: ['./add-registry.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AddRegistryComponent implements OnInit, OnDestroy {
  @ViewChild('formRef', { static: false })
  formRef: NgForm;

  @Output()
  saved = new EventEmitter<void>();

  submitting = false;
  disable: boolean;
  SecretType = SecretType;
  form: FormGroup;
  showAdvanced = false;
  registryNames: string[] = [];

  nameRule = TOOLCHAIN_BINDING_NAME;
  unsubscribe$ = new Subject<void>();
  secretTypeChange$$ = new Subject<SecretType>();

  fileLocations$ = this.artifactRegistryApi
    .getFileLocations(this.data.managerName)
    .pipe(
      catchError((error: HttpErrorResponse) => {
        this.notification.error(error.error || error.message);
        return of([]);
      }),
      publishReplay(1),
      refCount(),
    );

  secrets$ = this.secretTypeChange$$.pipe(startWith(null)).pipe(
    switchMap(() => this.secretApi.find({})),
    map(res =>
      res.items.filter(
        item => item.type === SecretType.BasicAuth && !item.private,
      ),
    ),
    publishReplay(1),
    refCount(),
  );

  existedRegistries$ = forkJoin([
    this.artifactRegistryApi.findExistedRegistries(this.data.managerName),
    this.artifactRegistryApi
      .findRegistiresByManager(this.data.managerName)
      .pipe(map(r => r.items)),
  ]).pipe(
    tap(registries => {
      this.registryNames = R.unnest(registries).map(
        ({ name }: { name: string }) => name,
      );
    }),
    switchMap(([existed]) => existed),
    toArray(),
    catchError((error: HttpErrorResponse) => {
      this.notification.error(error.error || error.message);
      return of([]);
    }),
    publishRef(),
  );

  constructor(
    @Inject(DIALOG_DATA)
    public data = {
      mode: 'create',
      managerName: '',
      error: false,
      project: '',
      secret: {
        name: '',
        namespace: '',
      },
    },
    private readonly artifactRegistryApi: ArtifactRegistryApiService,
    private readonly secretApi: SecretApiService,
    private readonly notification: NotificationService,
    private readonly cdr: ChangeDetectorRef,
    private readonly fb: FormBuilder,
    private readonly secretActions: SecretActions,
  ) {}

  ngOnInit(): void {
    this.disable = true;
    this.form = this.fb.group({
      name: [
        '',
        [
          Validators.pattern(this.nameRule.pattern),
          Validators.maxLength(this.nameRule.maxLength),
          this.existingValidator,
        ],
      ],
      integrateName: [
        '',
        [
          Validators.pattern(this.nameRule.pattern),
          Validators.maxLength(this.nameRule.maxLength),
        ],
      ],
      selectName: '',
      artifactType: 'Maven',
      versionPolicy: this.data.mode === 'create' ? 'Release' : '',
      fileLocation: '',
      secretType: SecretType.BasicAuth,
      secretName: [this.data.secret.name],
      secretNamespace: this.data.secret.namespace,
    });

    race([
      this.form.get('name').valueChanges,
      this.form.get('selectName').valueChanges,
    ])
      .pipe(
        delay(500),
        withLatestFrom(this.existedRegistries$),
        takeUntil(this.unsubscribe$),
      )
      .subscribe(([name]) => {
        this.setIntegrateNameValue(name);
      });
  }

  ngOnDestroy(): void {
    this.unsubscribe$.next();
    this.unsubscribe$.complete();
  }

  setIntegrateNameValue(name: string) {
    if (name) {
      this.disable = false;
    }
    this.form.get('integrateName').setValue(name);
  }

  addSecret() {
    this.secretActions
      .createForToolChain(
        ToolKind.ArtifactRegistry,
        'Maven2',
        SecretType.BasicAuth,
      )
      .subscribe(result => {
        if (result) {
          this.secretToValue(result);
        }
      });
  }

  secretToValue(secret: Secret) {
    this.form.patchValue({
      secretName: secret.name,
      secretNamespace: secret.namespace,
    });
  }

  private readonly existingValidator = (
    control: AbstractControl,
  ): { existing: boolean } | null => {
    return this.registryNames.includes(control.value)
      ? { existing: true }
      : null;
  };

  submit() {
    this.formRef.onSubmit(null);
    if (this.formRef.invalid) {
      return;
    }
    this.submitting = true;
    this.artifactRegistryApi
      .createRegistryService(
        this.data.managerName,
        this.data.project,
        this.form.value,
      )
      .subscribe(
        () => {
          this.submitting = false;
          this.cdr.markForCheck();
          this.saved.emit();
        },
        (error: HttpErrorResponse) => {
          this.submitting = false;
          this.cdr.markForCheck();
          this.notification.error({
            content: error.error || error.message,
          });
        },
      );
  }
}
