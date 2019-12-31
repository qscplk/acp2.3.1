import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  Output,
} from '@angular/core';
import {
  ToolBinding,
  ToolService,
  ToolType,
} from '@app/api/tool-chain/tool-chain-api.types';
import { snakeCase } from 'lodash-es';

@Component({
  selector: 'alo-tool-type-bar',
  templateUrl: 'tool-type-bar.component.html',
  styleUrls: ['tool-type-bar.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ToolTypeBarComponent {
  @Input()
  selectedType = 'all';
  @Input()
  types: ToolType[] = [];
  @Input()
  resources: Array<ToolService | ToolBinding>;
  @Input()
  additionalCount: Dictionary<number> = {};
  @Output()
  selectedTypeChange = new EventEmitter<string>();

  get addTotal() {
    return this.additionalCount
      ? Object.keys(this.additionalCount).reduce(
          (prev: number, cur: string) => {
            return prev + this.additionalCount[cur];
          },
          0,
        )
      : 0;
  }

  snakeCase = snakeCase;

  handleLabelClicked(type: string) {
    if (type !== this.selectedType) {
      this.selectedTypeChange.emit(type);
    }
  }

  getResourcesCount(type: ToolType) {
    return (
      this.resources.filter((item: ToolService | ToolBinding) => {
        const toolType =
          (item as ToolService).toolType ||
          (item.tool && item.tool.toolType) ||
          '';
        return toolType === type.name;
      }).length + (this.additionalCount[type.name] || 0)
    );
  }
}
