import { TranslateService } from '@alauda/common-snippet';
import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  Output,
} from '@angular/core';
import { ToolBinding } from '@app/api/tool-chain/tool-chain-api.types';
import { snakeCase } from 'lodash-es';
import { map } from 'rxjs/operators';

@Component({
  selector: 'alo-project-binding-list',
  templateUrl: 'project-binding-list.component.html',
  styleUrls: ['project-binding-list.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProjectBindingListComponent {
  @Input()
  bindings: ToolBinding[];

  @Input()
  showTag = true;

  @Output()
  cardClick = new EventEmitter<ToolBinding>();

  snakeCase = snakeCase;

  enterpriseIcon$ = this.translate.locale$.pipe(
    map(lang => `icons/enterprise_${lang}.svg`),
  );

  constructor(private readonly translate: TranslateService) {}

  trackByName(_: number, item: ToolBinding) {
    return item.name;
  }
}
