import { DialogService, DialogSize } from '@alauda/ui';
import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  Output,
} from '@angular/core';
import { ArtifactRegistryManagerService, ToolService } from '@app/api';
import { snakeCase } from 'lodash-es';

import { AddRegistryComponent } from '../add-registry/add-registry.component';

@Component({
  selector: 'alo-artifact-registry-binding-options',
  templateUrl: './artifact-registry-binding-options.component.html',
  styleUrls: ['./artifact-registry-binding-options.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ArtifactRegistryBindingOptionsComponent {
  @Input()
  project: string;

  @Input()
  managers: ArtifactRegistryManagerService[];
  @Input()
  showTag = true;
  @Output()
  cardClick = new EventEmitter<ToolService>();

  @Output()
  close = new EventEmitter<void>();

  @Output()
  registryAdd = new EventEmitter<void>();

  snakeCase = snakeCase;

  constructor(private readonly dialog: DialogService) {}

  addRegistry(
    mode: 'create' | 'integrate',
    manager: ArtifactRegistryManagerService,
  ) {
    const dialogRef = this.dialog.open(AddRegistryComponent, {
      size: DialogSize.Big,
      data: {
        mode,
        managerName: manager.name,
        project: this.project,
        secret: {
          name: manager.secretName,
          namespace: manager.secretNamespace,
        },
        error: manager.status.phase === 'Error',
      },
    });

    dialogRef.componentInstance.saved.subscribe(() => {
      dialogRef.close();
      this.registryAdd.emit();
    });
  }
}
