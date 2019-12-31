import {
  DIALOG_DATA,
  DialogRef,
  DialogService,
  NotificationService,
} from '@alauda/ui';
import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  Inject,
  ViewChild,
} from '@angular/core';
import { NgForm } from '@angular/forms';
import {
  ArtifactRegistryService,
  Secret,
  SecretApiService,
  SecretType,
  ToolIntegrateParams,
} from '@app/api';
import { ArtifactRegistryApiService } from '@app/api/tool-chain/artifact-registry-api.service';
import { SecretCreateDialogComponent } from '@app/modules/secret';
import { Subject } from 'rxjs';
import {
  map,
  publishReplay,
  refCount,
  startWith,
  switchMap,
} from 'rxjs/operators';

@Component({
  templateUrl: './update-artifact-registry.component.html',
  styleUrls: ['./update-artifact-registry.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UpdateArtifactRegistryComponent {
  @ViewChild('form', { static: false })
  form: NgForm;

  submitting = false;
  SecretType = SecretType;
  model = {
    name: this.data.name,
    selectName: '',
    artifactType: this.data.artifactType,
    versionPolicy: this.data.versionPolicy,
    fileLocation: this.data.blobStore,
    secretType: SecretType.BasicAuth,
    secretName: this.data.secretName,
    secretNamespace: this.data.secretNamespace,
  };

  secretTypeChange$$ = new Subject<SecretType>();

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

  constructor(
    @Inject(DIALOG_DATA) public data: ArtifactRegistryService,
    private readonly secretApi: SecretApiService,
    private readonly dialog: DialogService,
    private readonly artifactRegistryApi: ArtifactRegistryApiService,
    private readonly cdr: ChangeDetectorRef,
    private readonly notification: NotificationService,
    private readonly dialogRef: DialogRef<
      UpdateArtifactRegistryComponent,
      ToolIntegrateParams
    >,
  ) {}

  secretChange(secret?: Secret) {
    if (secret) {
      this.model = {
        ...this.model,
        secretType: secret.type,
        ...this.parseSecret(secret),
      };
    }
    this.secretTypeChange$$.next();
  }

  addSecret() {
    const dialogRef = this.dialog.open(SecretCreateDialogComponent, {
      data: {
        types: [this.model.secretType],
        showHint: false,
      },
    });

    dialogRef.afterClosed().subscribe((secret?: Secret) => {
      if (secret) {
        this.secretChange(secret);
      }
    });
  }

  secretToValue(secret: Secret) {
    this.model = {
      ...this.model,
      ...this.parseSecret(secret),
    };
  }

  private parseSecret(secret: Secret) {
    return {
      secretName: secret.name,
      secretNamespace: secret.namespace,
    };
  }

  submit() {
    this.form.onSubmit(null);
    if (this.form.invalid) {
      return;
    }
    this.submitting = true;
    const params = {
      ...this.model,
      host: this.data.host,
      accessUrl: this.data.accessUrl,
      type: this.data.type,
    };
    this.artifactRegistryApi.updateRegistryService(params).subscribe(
      _ => {
        this.submitting = false;
        this.cdr.markForCheck();
        this.dialogRef.close(params);
      },
      (error: HttpErrorResponse) => {
        this.submitting = false;
        this.cdr.markForCheck();
        this.notification.error({
          content: error.error.error || error.error.message,
        });
      },
    );
  }
}
