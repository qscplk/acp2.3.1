import { TranslateService } from '@alauda/common-snippet';
import { DIALOG_DATA, DialogRef, NotificationService } from '@alauda/ui';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  Inject,
  OnInit,
  ViewChild,
} from '@angular/core';
import { NgForm } from '@angular/forms';
import { ApplicationApiService } from '@app/api';
import { Observable, Subject, of } from 'rxjs';
import { catchError, switchMap, tap } from 'rxjs/operators';

enum volumeMountTypes {
  PVC = 'PersistentVolumeClaim',
  ConfigMap = 'ConfigMap',
  Secret = 'Secret',
  HostPath = 'HostPath',
}

@Component({
  selector: 'alo-volume-mount',
  templateUrl: './volume-mount-dialog.component.html',
  styleUrls: ['./volume-mount-dialog.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VolumeMountDialogComponent implements OnInit {
  selectedType: volumeMountTypes;
  pvcParams = {
    pvc: '',
    subpath: '',
    containerpath: '',
  };

  hostpathParams = {
    hostpath: '',
    containerpath: '',
  };

  configmapParams = {
    configmap: '',
    separatereference: false,
    containerpath: '',
    key: [['', '']],
  };

  secretParams = {
    secret: '',
    separatereference: false,
    containerpath: '',
    key: [['', '']],
  };

  title = '';
  isSubmit = false;
  isErrorKey = false;
  submitting = false;
  loading = false;
  configmapOptions: any[] = [];
  secretOptions: any[] = [];
  configmapKeyOptions: string[] = [];
  secretKeyOptions: string[] = [];
  pvcOptions: string[] = [];
  @ViewChild('form', { static: true })
  form: NgForm;

  typeChange$ = new Subject<string>();
  requests$ = this.typeChange$.pipe(
    tap(() => (this.loading = true)),
    switchMap(type => this.editDataHandlers[type]()),
    tap(() => {
      this.loading = false;
      this.cdr.detectChanges();
    }),
  );

  editDataHandlers: { [type: string]: () => Observable<any> } = {
    [volumeMountTypes.HostPath]: () =>
      of([]).pipe(
        tap(() => {
          if (this.data.isEdit && this.data.editData) {
            this.hostpathParams.hostpath = this.data.editData.hostPath;
            this.hostpathParams.containerpath = this.data.editData.volumeMountInfos[0].mountPath;
          }
        }),
      ),
    [volumeMountTypes.ConfigMap]: () =>
      this.api
        .getVolumeMount(
          volumeMountTypes.ConfigMap,
          this.data.cluster,
          this.data.namespace,
        )
        .pipe(
          tap((res: any) => {
            this.configmapOptions = res.items;
            if (this.data.isEdit && this.data.editData) {
              this.configmapParams.configmap = this.data.editData.resourceName;
              this.configmapChange(this.data.editData.resourceName);
              if (
                this.data.editData.volumeMountInfos &&
                this.data.editData.volumeMountInfos[0].subPath
              ) {
                this.configmapParams.separatereference = true;
                this.configmapParams.key = this.data.editData.volumeMountInfos.map(
                  (volumeMount: any) => {
                    return [volumeMount.subPath, volumeMount.mountPath];
                  },
                );
              } else {
                this.configmapParams.containerpath = this.data.editData.volumeMountInfos[0].mountPath;
              }
              this.cdr.detectChanges();
            }
          }),
        ),
    [volumeMountTypes.Secret]: () =>
      this.api
        .getVolumeMount(
          volumeMountTypes.Secret,
          this.data.cluster,
          this.data.namespace,
        )
        .pipe(
          tap(
            (res: any) => {
              this.secretOptions = res.secrets;
              if (this.data.isEdit && this.data.editData) {
                this.secretParams.secret = this.data.editData.resourceName;
                this.secretChange(this.data.editData.resourceName);
                if (
                  this.data.editData.volumeMountInfos &&
                  this.data.editData.volumeMountInfos[0].subPath
                ) {
                  this.secretParams.separatereference = true;
                  this.secretParams.key = this.data.editData.volumeMountInfos.map(
                    (volumeMount: any) => {
                      return [volumeMount.subPath, volumeMount.mountPath];
                    },
                  );
                } else {
                  this.secretParams.containerpath = this.data.editData.volumeMountInfos[0].mountPath;
                }
                this.cdr.detectChanges();
              }
            },
            catchError((error: any) =>
              of({
                error,
              }).pipe(
                tap((err: any) => {
                  this.displayError(err.error.error || err.error.message);
                }),
              ),
            ),
          ),
        ),
    [volumeMountTypes.PVC]: () =>
      this.api
        .getVolumeMount(
          volumeMountTypes.PVC,
          this.data.cluster,
          this.data.namespace,
        )
        .pipe(
          tap((res: any) => {
            this.pvcOptions = res.items;
            if (this.data.isEdit && this.data.editData) {
              this.pvcParams.pvc = this.data.editData.resourceName;
              this.pvcParams.containerpath = this.data.editData.volumeMountInfos[0].mountPath;
              this.pvcParams.subpath =
                this.data.editData.volumeMountInfos[0].subPath || '';
              this.cdr.detectChanges();
            }
          }),
        ),
  };

  payloadDataHandlers = {
    [volumeMountTypes.HostPath]: () => {
      return {
        type: this.selectedType,
        hostPath: this.hostpathParams.hostpath,
        volumeMountInfos: [{ mountPath: this.hostpathParams.containerpath }],
      };
    },
    [volumeMountTypes.ConfigMap]: () => {
      return {
        type: this.selectedType,
        resourceName: this.configmapParams.configmap,
        volumeMountInfos: this.configmapParams.separatereference
          ? this.handleKeyValue(this.configmapParams.key)
          : [{ mountPath: this.configmapParams.containerpath }],
      };
    },
    [volumeMountTypes.Secret]: () => {
      return {
        type: this.selectedType,
        resourceName: this.secretParams.secret,
        volumeMountInfos: this.secretParams.separatereference
          ? this.handleKeyValue(this.secretParams.key)
          : [{ mountPath: this.secretParams.containerpath }],
      };
    },
    [volumeMountTypes.PVC]: () => {
      return {
        type: this.selectedType,
        resourceName: this.pvcParams.pvc,
        volumeMountInfos: [
          {
            mountPath: this.pvcParams.containerpath,
            subPath: this.pvcParams.subpath,
          },
        ],
      };
    },
  };

  typeTranslateHandlers = {
    [volumeMountTypes.HostPath]: () => this.translate.get('hostpath'),
    [volumeMountTypes.ConfigMap]: () =>
      this.translate.get('application.configmap'),
    [volumeMountTypes.Secret]: () => this.translate.get('application.secret'),
    [volumeMountTypes.PVC]: () => this.translate.get('persistent_volume_claim'),
  };

  constructor(
    private readonly dialogRef: DialogRef<VolumeMountDialogComponent>,
    @Inject(DIALOG_DATA)
    public data: {
      title: string;
      resourceKind: string;
      resourceName: string;
      containerName: string;
      cluster: string;
      namespace: string;
      isEdit?: boolean;
      editData?: any;
    },
    private readonly api: ApplicationApiService,
    private readonly notifaction: NotificationService,
    private readonly cdr: ChangeDetectorRef,
    public translate: TranslateService,
  ) {
    this.title = data.title;
  }

  ngOnInit() {
    this.requests$.subscribe();
    if (this.data.isEdit && this.data.editData) {
      this.selectedType = this.data.editData.type;
    } else {
      this.selectedType = volumeMountTypes.PVC;
    }
    this.typeChange$.next(this.selectedType);
  }

  typechange(type: volumeMountTypes) {
    this.selectedType = type;
    this.typeChange$.next(this.selectedType);
  }

  configmapChange(name: string) {
    const selectedConfigmap = this.configmapOptions.find(
      configmap => name === configmap.objectMeta.name,
    );
    this.configmapKeyOptions = selectedConfigmap.keys;
  }

  secretChange(name: string) {
    const selectedSecret = this.secretOptions.find(
      secret => name === secret.objectMeta.name,
    );
    this.secretKeyOptions = selectedSecret.keys;
  }

  displayError(error: string) {
    this.notifaction.warning({
      content: error,
    });
  }

  getTypeTranslate(type: volumeMountTypes) {
    return this.typeTranslateHandlers[type]();
  }

  checkKeyValid(type: volumeMountTypes) {
    if (
      type === volumeMountTypes.Secret &&
      this.secretParams.separatereference
    ) {
      return this.checkKeyValueData(this.secretParams.key);
    }
    if (
      type === volumeMountTypes.ConfigMap &&
      this.configmapParams.separatereference
    ) {
      return this.checkKeyValueData(this.configmapParams.key);
    }
  }

  checkKeyValueData(keyParams: any[]) {
    if (keyParams.length === 0) {
      this.isErrorKey = true;
      return true;
    } else {
      let hasEmptyValue = false;
      keyParams.forEach(item => {
        if (!item[0] || !item[1]) {
          hasEmptyValue = true;
        }
      });
      if (hasEmptyValue) {
        this.isErrorKey = true;
        return true;
      } else {
        this.isErrorKey = false;
        return false;
      }
    }
  }

  async save() {
    this.isSubmit = true;
    this.form.onSubmit(null);
    this.checkKeyValid(this.selectedType);
    if (this.form.invalid || this.isErrorKey) {
      return;
    }
    const payload = this.handleMountInfos();
    if (this.data.isEdit) {
      this.dialogRef.close(payload);
      return;
    }
    this.submitting = true;
    this.api
      .createVolumeMount(
        this.data.resourceKind,
        this.data.cluster,
        this.data.namespace,
        this.data.resourceName,
        this.data.containerName,
        payload,
      )
      .subscribe(
        () => {
          this.dialogRef.close(true);
        },
        (error: any) => {
          this.submitting = false;
          this.notifaction.error({
            title: this.translate.get('add_fail'),
            content: error.error.error || error.error.message,
          });
        },
      );
  }

  handleMountInfos() {
    return this.payloadDataHandlers[this.selectedType]();
  }

  handleKeyValue(params: any) {
    return params.map((item: any) => {
      return { subPath: item[0], mountPath: item[1] };
    });
  }
}
