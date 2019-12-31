import { TranslateService } from '@alauda/common-snippet';
import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  Output,
} from '@angular/core';
import { Tool } from '@app/api/tool-chain/tool-chain-api.types';
import { snakeCase } from 'lodash-es';
import { map } from 'rxjs/operators';

@Component({
  selector: 'alo-tool-list',
  templateUrl: 'tool-list.component.html',
  styleUrls: ['tool-list.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ToolListComponent {
  @Input()
  tools: Tool[];

  @Input()
  showType: boolean;

  @Output()
  selectedChange = new EventEmitter<Tool>();

  selectedTool = '';

  @Input()
  tool: Tool;

  @Input()
  toolType: string;

  @Input()
  isSelected: boolean;

  enterpriseIcon$ = this.translate.locale$.pipe(
    map(lang => `icons/enterprise_${lang}.svg`),
  );

  constructor(public translate: TranslateService) {}

  clearSelection() {
    this.selectedTool = '';
    this.selectedChange.emit(null);
  }

  handleCardClicked(tool: Tool) {
    this.selectedTool = tool.name;
    this.selectedChange.emit(tool);
  }

  trackByName(_: number, item: Tool) {
    return item.name;
  }

  getToolType(kind: string, toolType: string) {
    if (kind === 'artifactregistrymanager') {
      return this.translate.get('artifact_registry_manager');
    } else {
      return this.translate.get(snakeCase(toolType));
    }
  }
}
