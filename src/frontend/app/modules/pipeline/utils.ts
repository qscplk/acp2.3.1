import {
  PipelineConfig,
  PipelineConfigModel,
  PipelineTemplate,
  PipelineTrigger,
  TemplateArgumentField,
  TemplateArgumentItem,
} from '@app/api';
import { get, isObject } from 'lodash-es';

export function mapTriggerTranslateKey(triggerType: string) {
  switch (triggerType) {
    case 'cron':
      return 'pipeline_trigger_cron';
    case 'codeChange':
      return 'pipeline_trigger_code_change';
    case 'imageChange':
      return 'pipeline_trigger_image_change';
    default:
      return 'unknown';
  }
}

export function mapTriggerIcon(triggerType: string) {
  switch (triggerType) {
    case 'cron':
      return 'basic:time';
    case 'codeChange':
      return 'basic:code';
    case 'imageChange':
    // TODO: 添加代码仓库图标
    default:
      return 'unknown';
  }
}

const historyStatusIconMap: { [key: string]: string } = {
  Queued: 'basic:hourglass_half_circle_s',
  Pending: 'basic:play_circle_s',
  Running: 'basic:sync_circle_s',
  Failed: 'basic:close_circle_s ',
  Complete: 'check_circle_s',
  Cancelled: 'basic:stop_circle_s',
  Aborted: 'basic:paused_circle_s',
  Unknown: 'basic:question_circle_s',
  Paused: 'exclamation_circle_s',
};

const historyDetailStatusIconMap: { [key: string]: string } = {
  Queued: 'basic:queue_s',
  Pending: 'basic:play_12_s',
  Running: 'basic:sync',
  Failed: 'basic:fail_s ',
  Complete: 'basic:success_s',
  Cancelled: 'basic:stop_s',
  Aborted: 'basic:stop_s',
  Unknown: 'basic:unknown_s',
  Paused: 'basic:exclamation',
};

const historyStatusTranslateMap: { [key: string]: string } = {
  Queued: 'pipeline.history_queued',
  Pending: 'pipeline.history_pending',
  Running: 'pipeline.history_running',
  Failed: 'pipeline.history_failed',
  Complete: 'pipeline.history_complete',
  Cancelled: 'pipeline.history_stopped',
  Aborted: 'pipeline.history_aborted',
  Unknown: 'pipeline.history_unknown',
  Paused: 'pipeline.history_waiting',
};

export function getHistoryStatus(phase: string, type?: 'detail' | 'preview') {
  let icon;
  if (type === 'detail') {
    icon =
      historyDetailStatusIconMap[phase] || historyDetailStatusIconMap.Unknown;
  } else {
    icon = historyStatusIconMap[phase] || historyStatusIconMap.Unknown;
  }
  return {
    icon,
    translateKey:
      historyStatusTranslateMap[phase] || historyStatusTranslateMap.Unknown,
  };
}

export const PIPELINE_ALL_STATUS = [
  'Queued',
  'Pending',
  'Running',
  'Failed',
  'Complete',
  'Cancelled',
  'Aborted',
  'Unknown',
];

export function stringifyEach(data: any) {
  Object.keys(data).forEach(key => {
    if (
      isObject(data[key]) ||
      typeof data[key] === 'number' ||
      typeof data[key] === 'boolean'
    ) {
      data[key] = JSON.stringify(data[key]);
    }
  });
  return data;
}

export function toNewPipelineConfig<
  T extends PipelineConfig | PipelineConfigModel
>(pipelineConfig: T, targetTemplate: PipelineTemplate): T {
  // TODO: temp fix typings
  const values =
    get(pipelineConfig, ['template', 'values']) || <T['template']['values']>{};
  const arg = get(targetTemplate, ['arguments']);
  return {
    ...pipelineConfig,
    strategy: {
      ...pipelineConfig.strategy,
      template: {
        ...targetTemplate,
        arguments: (arg || []).map((argument: TemplateArgumentField) => ({
          ...argument,
          items: (argument.items || []).map((item: TemplateArgumentItem) => ({
            ...item,
            value: values[item.name],
          })),
        })),
      },
    },
  };
}

export const CODE_CHECK_OPTIONS = [
  { name: 'pipeline.trigger_every_2_minute', value: 'H/2 * * * *' },
  { name: 'pipeline.trigger_every_5_minute', value: 'H/5 * * * *' },
  { name: 'pipeline.trigger_every_30_minute', value: 'H/30 * * * *' },
  { name: 'pipeline.trigger_every_hour', value: 'H * * * *' },
  { name: 'pipeline.trigger_every_day', value: 'H H * * *' },
];

export function getCodeCheckNameByValue(value: string) {
  const option = CODE_CHECK_OPTIONS.find(
    (item: { name: string; value: string }) => {
      return item.value === value;
    },
  );
  return (option && option.name) || value;
}

export function hasEnabledTriggers(triggers: PipelineTrigger[]) {
  return (triggers || []).some((trigger: PipelineTrigger) => {
    return trigger.enabled;
  });
}
