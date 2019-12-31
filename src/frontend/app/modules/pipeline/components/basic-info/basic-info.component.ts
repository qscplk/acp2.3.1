import { DialogService, DialogSize } from '@alauda/ui';
import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { PipelineConfig, PipelineKind, PipelineTrigger } from '@app/api';
import {
  getCodeCheckNameByValue,
  hasEnabledTriggers,
  mapTriggerIcon,
  mapTriggerTranslateKey,
} from '@app/modules/pipeline/utils';
import { get } from 'lodash-es';

import { ScanLogsComponent } from '../scan-logs/scan-logs.component';

@Component({
  selector: 'alo-basic-info',
  templateUrl: './basic-info.component.html',
  styleUrls: ['../../shared-style/fields.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BasicInfoComponent {
  @Input()
  pipeline: PipelineConfig;

  @Input()
  viewLogsPermission: boolean;

  mapTriggerTranslateKey = mapTriggerTranslateKey;
  mapTriggerIcon = mapTriggerIcon;
  getCodeCheckNameByValue = getCodeCheckNameByValue;
  hasEnabledTriggers = hasEnabledTriggers;

  kinds = PipelineKind;

  get method() {
    const kind = get(this.pipeline, ['labels', 'pipeline.kind']);
    return kind === 'multi-branch'
      ? PipelineKind.MultiBranch
      : get(this.pipeline, '__original.spec.template.pipelineTemplate')
      ? PipelineKind.Graph
      : get(this.pipeline, 'labels.templateName')
      ? PipelineKind.Template
      : PipelineKind.Script;
  }

  constructor(private readonly dialog: DialogService) {}

  openScanLog() {
    this.dialog.open(ScanLogsComponent, {
      data: this.pipeline,
      size: DialogSize.Large,
    });
  }

  get enabledTriggers() {
    const triggers = get(this.pipeline, 'triggers', []);
    return triggers.filter((trigger: PipelineTrigger) => {
      return trigger.enabled;
    });
  }
}
