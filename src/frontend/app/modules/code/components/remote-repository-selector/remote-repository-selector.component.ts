import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  Output,
} from '@angular/core';
import { RemoteRepositoryOwner } from '@app/api/code/code-api.types';

@Component({
  selector: 'alo-remote-repository-selector',
  templateUrl: 'remote-repository-selector.component.html',
  styleUrls: ['remote-repository-selector.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CodeRemoteRepositorySelectorComponent {
  @Input() account: RemoteRepositoryOwner;
  @Input() selected: string[] = [];
  @Input() autoSync = false;

  @Output() selectedChange = new EventEmitter<string[]>();
  @Output() autoSyncChange = new EventEmitter<boolean>();

  get active() {
    return this.autoSync || this.selected.length;
  }
}
