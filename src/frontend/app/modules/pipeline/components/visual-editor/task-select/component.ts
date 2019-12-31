import { TranslateService } from '@alauda/common-snippet';
import {
  ChangeDetectionStrategy,
  Component,
  HostBinding,
  Input,
} from '@angular/core';
import * as R from 'ramda';
import { map } from 'rxjs/operators';

import {
  LocalizedString,
  PipelineVisualEditorStoreService,
  TaskEntity,
  TaskGroup,
  addParallelByStage,
  addStage,
  createTaskSelector,
  selectTaskGroups,
  snapshot,
} from '../store';

@Component({
  selector: 'alo-pipeline-visual-editor-task-select',
  templateUrl: 'component.html',
  styleUrls: ['../side-form.scss', 'component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PipelineVisualEditorTaskSelectComponent {
  constructor(
    private readonly translate: TranslateService,
    private readonly store: PipelineVisualEditorStoreService,
  ) {}

  @Input()
  prefix: string;

  @Input()
  id: string;

  @Input()
  project: string;

  @HostBinding('class')
  class = 'side-form';

  groups$ = this.store.select(selectTaskGroups).pipe(
    map(R.toPairs),
    map(groups =>
      groups
        .slice(0)
        .sort((a, b) =>
          !a[0] ? 1 : !b[0] ? -1 : a[0] === b[0] ? 0 : a[0] < b[0] ? -1 : 1,
        ),
    ),
  );

  groupIdentity(_: number, group: string) {
    return group;
  }

  taskIdentity(_: number, task: string) {
    return task;
  }

  select(task: TaskEntity) {
    if (this.prefix === 'after') {
      this.store.dispatch(
        addParallelByStage(task, this.id, snapshot(null, task)),
      );
    } else {
      this.store.dispatch(addStage(task, this.id, snapshot(null, task)));
    }
  }

  toTask = (id: string) => this.store.select(createTaskSelector(id));

  toCurrentLang = (text: LocalizedString) =>
    this.translate.locale$.pipe(
      map(lang => (lang === 'en' ? text.en : text['zh-CN'])),
    );

  groupName = ([_, { translates }]: [string, TaskGroup]) => translates;

  groupLength = ([_, { tasks }]: [string, TaskGroup]) => {
    return (tasks && tasks.length) || 0;
  };

  groupTasks = ([_, { tasks }]: [string, TaskGroup]) => {
    return tasks;
  };

  toIconUrl = (icon: string) => {
    const BASE_PATH = 'icons/pipeline/tasks';

    switch ((icon || '').toLowerCase()) {
      case 'ci':
        return `${BASE_PATH}/ci.svg`;
      case 'cd':
        return `${BASE_PATH}/cd.svg`;
      case 'syncimage':
        return `${BASE_PATH}/sync-image.svg`;
      default:
        return `${BASE_PATH}/others.svg`;
    }
  };
}
