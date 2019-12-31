import {
  ImagePullDialogComponent,
  ImageRepositoryValue,
  noop,
} from '@alauda/common-snippet';
import { DialogService, DialogSize } from '@alauda/ui';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  EventEmitter,
  Injector,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
  forwardRef,
} from '@angular/core';
import {
  ControlValueAccessor,
  NG_VALIDATORS,
  NG_VALUE_ACCESSOR,
  ValidationErrors,
  Validator,
} from '@angular/forms';
import {
  ApplicationIdentity,
  Container,
  SecretType,
  VolumeInfo,
  splitImageAddress,
  toRepoName,
} from '@app/api';
import { LocalImageSelectorDataContext } from '@app/modules/pipeline/components/forms/parameters/local-image-selector-data-context';
import { Observable } from 'rxjs';

import { UpdateImageDialogComponent } from '../update-image/update-image-dialog.component';

enum SecretAction {
  Add = 'add',
  Delete = 'delete',
}
@Component({
  selector: 'alo-app-create-container-field',
  templateUrl: './container-field.component.html',
  styleUrls: ['./container-field.component.scss'],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => AppCreateContainerFieldComponent),
      multi: true,
    },
    {
      provide: NG_VALIDATORS,
      useExisting: forwardRef(() => AppCreateContainerFieldComponent),
      multi: true,
    },
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppCreateContainerFieldComponent
  implements ControlValueAccessor, Validator, OnChanges {
  constructor(
    private readonly cdr: ChangeDetectorRef,
    private readonly dialog: DialogService,
    private readonly injector: Injector,
  ) {}

  get canClose() {
    return this.containers.length > 1;
  }

  @Output()
  secretChange = new EventEmitter<any>();

  @Input()
  params: ApplicationIdentity;

  containers: Array<{ container: Container }> = [];
  activeContainerIndex = 0;
  imageSelectorDataContext = new LocalImageSelectorDataContext(this.injector);

  ngOnChanges({ params }: SimpleChanges): void {
    if (params && params.currentValue) {
      this.imageSelectorDataContext.crossCluster = true;
      this.imageSelectorDataContext.params = {
        project: this.params.project,
        cluster: this.params.cluster,
        namespace: this.params.namespace,
        template: null,
        secretType: SecretType.DockerConfig,
      };
    }
  }

  propagateChange = (_: any) => {};

  trackByFn(_index: number, row: any) {
    return row;
  }

  writeValue(containers: any[]): void {
    if (containers) {
      this.containers = [];
      containers.forEach(container => {
        this.containers.push({ container: container });
      });
      this.cdr.detectChanges();
    }
  }

  registerOnChange(fn: any): void {
    this.propagateChange = fn;
  }

  registerOnTouched() {
    return noop;
  }

  validate(): ValidationErrors {
    return null;
  }

  onValueChange() {
    this.propagateChange(
      this.containers.map(container => {
        return container.container;
      }),
    );
  }

  selectImage(index: number) {
    const { address, tag } = splitImageAddress(
      this.containers[index].container.image,
    );
    this.openUpdateImageDialog(address, tag).subscribe(
      (result: {
        repository_name: string;
        repository_address: string;
        secret: string;
        tag: string;
      }) => {
        if (result) {
          this.containers[index].container.image = result.tag
            ? `${result.repository_address}:${result.tag}`
            : result.repository_address;
          this.cdr.detectChanges();
        }
      },
    );
  }

  openUpdateImageDialog(address: string, tag: string): Observable<any> {
    const dialogRef = this.dialog.open(UpdateImageDialogComponent, {
      size: DialogSize.Large,
      data: {
        project: this.params.project,
        address: address,
        tag: tag,
      },
    });
    return dialogRef.afterClosed();
  }

  openAddImageDialog(): Observable<any> {
    const dialogRef = this.dialog.open(ImagePullDialogComponent, {
      size: DialogSize.Large,
      data: { context: this.imageSelectorDataContext },
    });
    return dialogRef.afterClosed();
  }

  close(index: number) {
    const secretName = this.containers[index].container.secret;
    this.containers.splice(index, 1);
    this.onSecretChange(SecretAction.Delete, secretName);
    this.onValueChange();
  }

  add() {
    this.openAddImageDialog().subscribe((result: ImageRepositoryValue) => {
      if (result) {
        this.onSecretChange(SecretAction.Add, result.secretName);
        const repoName = toRepoName(
          result.tag,
          result.repositoryPath,
          result.repositoryPath,
        );
        this.containers.push({
          container: {
            name: repoName,
            image: result.tag
              ? `${result.repositoryPath}:${result.tag}`
              : result.repositoryPath,
            resources: {
              limits: { cpu: '', memory: '' },
              requests: { cpu: '', memory: '' },
            },
            command: '',
            args: [''],
            volumeMounts: [] as VolumeInfo[],
            secret: result.secretName,
          },
        });
        this.activeContainerIndex = this.containers.length - 1;
        this.onValueChange();
      }
    });
  }

  onSecretChange(action: SecretAction, secretName: string) {
    if (secretName) {
      switch (action) {
        case SecretAction.Add:
          this.secretChange.emit({ action: action, name: secretName });
          break;
        case SecretAction.Delete: {
          const index = this.containers.findIndex(container => {
            return container.container.secret === secretName;
          });
          if (index < 0) {
            this.secretChange.emit({ action: action, name: secretName });
          }
          break;
        }
      }
    }
  }
}
