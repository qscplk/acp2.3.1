import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';

@Component({
  selector: 'alo-pipeline-global-setting',
  templateUrl: './global-setting.component.html',
  styleUrls: ['./global-setting.component.scss'],
})
export class PipelineGlobalSettingComponent implements OnChanges {
  @Input()
  globalSettings: string;

  agent: { agent: { label: string; raw: string }; options: { raw: string } };

  ngOnChanges({ globalSettings }: SimpleChanges): void {
    if (globalSettings && globalSettings.currentValue) {
      this.agent = JSON.parse(globalSettings.currentValue);
    }
  }
}
