import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  Output,
} from '@angular/core';
import { ArtifactRegistryManagerService, ToolService } from '@app/api';
import { snakeCase } from 'lodash-es';

@Component({
  selector: 'alo-artifact-manager-list',
  templateUrl: './artifact-manager-list.component.html',
  styleUrls: ['./artifact-manager-list.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ArtifactManagerListComponent {
  @Input()
  managers: ArtifactRegistryManagerService[];
  @Input()
  showTag = true;
  @Output()
  cardClick = new EventEmitter<ToolService>();

  snakeCase = snakeCase;
}
