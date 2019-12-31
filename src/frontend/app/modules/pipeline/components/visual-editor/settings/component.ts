import { publishRef } from '@alauda/common-snippet';
import {
  ChangeDetectionStrategy,
  Component,
  HostBinding,
  Input,
  OnDestroy,
} from '@angular/core';
import { ValidationErrors } from '@angular/forms';
import { JenkinsApiService, JenkinsBinding } from '@app/api';
import { CODE_CHECK_OPTIONS } from '@app/modules/pipeline/utils';
import { PIPELINE_NAME_RULE } from '@app/utils/patterns';
import * as R from 'ramda';
import { Observable, of } from 'rxjs';
import {
  catchError,
  debounceTime,
  map,
  startWith,
  switchMap,
} from 'rxjs/operators';

import {
  PipelineVisualEditorStoreService,
  changePipelineSettings,
  getPipelineForm,
  mergeFormErrors,
  selectPipelineForm,
} from '../store';

@Component({
  selector: 'alo-pipeline-visual-editor-settings',
  templateUrl: 'component.html',
  styleUrls: ['../side-form.scss', 'component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PipelineVisualEditorSettingsComponent implements OnDestroy {
  constructor(
    private readonly jenkinsApi: JenkinsApiService,
    private readonly store: PipelineVisualEditorStoreService,
  ) {}

  @Input()
  project = '';

  @Input()
  isUpdate = false;

  @Input()
  submitted = false;

  @HostBinding('class')
  class = 'side-form';

  nameRule = PIPELINE_NAME_RULE;

  fg$ = this.store.select(selectPipelineForm).pipe(
    map(form => getPipelineForm(form.values)),
    publishRef(),
  );

  edited$ = this.store
    .select(selectPipelineForm)
    .pipe(map(form => form.edited));

  actionSub = this.fg$
    .pipe(
      switchMap(fg =>
        fg.valueChanges.pipe(
          debounceTime(200),
          map(values => ({ values, errors: mergeFormErrors(fg) })),
        ),
      ),
      map(changePipelineSettings),
    )
    .subscribe(action => this.store.dispatch(action));

  codeChangeOptions = CODE_CHECK_OPTIONS;

  bindingChangedSub = this.fg$
    .pipe(
      switchMap(fg =>
        fg.controls.jenkinsBinding.valueChanges.pipe(map(() => ({ fg }))),
      ),
    )
    .subscribe(({ fg }) => {
      fg.controls.agent.setValue('');
    });

  ngOnDestroy() {
    this.actionSub.unsubscribe();
    this.bindingChangedSub.unsubscribe();
  }

  getJenkinsBindings = (project: string): Observable<JenkinsBinding[]> => {
    if (!project) {
      return of([]);
    }

    return this.jenkinsApi.findBindingsByProject(this.project, null).pipe(
      map(result => result.items),
      startWith([]),
      catchError(() => of([])),
    );
  };

  getJenkinsAgentLabels = (binding: string): Observable<any> => {
    if (!binding) {
      return of([]);
    }
    return this.jenkinsApi.getJenkinsAgentLabels(this.project, binding).pipe(
      map(result => result.labels),
      catchError(() => of([])),
    );
  };

  firstError = (errors: Dictionary<ValidationErrors>) => {
    const result = Object.keys(errors || {}).map(key => {
      switch (key) {
        case 'required':
          return this.nameRule.requiredError;
        case 'pattern':
          return this.nameRule.patternError;
        case 'maxlength':
          return this.nameRule.maxLengthError;
        default:
          return 'unknow_error';
      }
    });
    return R.head(result);
  };
}
