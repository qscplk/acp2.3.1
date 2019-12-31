import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { CodeBinding } from '@app/api/code/code-api.types';

@Component({
  selector: 'alo-code-binding-list',
  templateUrl: 'binding-list.component.html',
  styleUrls: ['binding-list.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CodeBindingListComponent {
  @Input() data: CodeBinding[] = [];
  @Input() hideProject = false;

  columns = ['name', 'account', 'project'];
  columnsWithoutProject = ['name', 'account'];

  @Input() itemRoute = (item: CodeBinding) => ['./', item.name];

  bindingIdentity(_: number, item: CodeBinding) {
    return item.name;
  }
}
