import { TranslateService } from '@alauda/common-snippet';
import {
  ChangeDetectionStrategy,
  Component,
  HostBinding,
  Injector,
  Input,
  OnDestroy,
  OnInit,
} from '@angular/core';
import { FormBuilder, ValidationErrors, Validators } from '@angular/forms';
import { PIPELINE_NAME_RULE } from '@app/utils/patterns';
import { shallowEqual } from '@app/utils/shallow-equal';
import * as R from 'ramda';
import { Subscription } from 'rxjs';
import {
  debounceTime,
  distinctUntilChanged,
  filter,
  map,
  tap,
} from 'rxjs/operators';

import { LocalImageSelectorDataContext } from '../../forms/parameters/local-image-selector-data-context';
import {
  CompiledFieldDefine,
  LocalizedString,
  PipelineVisualEditorStoreService,
  StageEntity,
  changeStageName,
  createStageFormAndTask,
  createStageFormSelector,
  createStageSelector,
  createTaskSelector,
  mergeFormErrors,
  removeStage,
  tryChangeStageValues,
} from '../store';

@Component({
  selector: 'alo-pipeline-visual-editor-stage',
  templateUrl: 'component.html',
  styleUrls: ['../side-form.scss', 'component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PipelineVisualEditorStageComponent implements OnInit, OnDestroy {
  constructor(
    private readonly store: PipelineVisualEditorStoreService,
    private readonly translate: TranslateService,
    private readonly injector: Injector,
    private readonly fb: FormBuilder,
  ) {}

  @Input()
  id: string;

  @Input()
  project: string;

  @Input()
  submitted = false;

  imageSelectorDataContext = new LocalImageSelectorDataContext(
    this.injector,
    true,
  );

  @HostBinding('class')
  class = 'side-form';

  showAdvanced = false;

  nameRule = PIPELINE_NAME_RULE;

  private nameFormSubscription: Subscription = null;
  private settingsFormSubscription: Subscription = null;

  ngOnInit() {
    this.imageSelectorDataContext.params = {
      project: this.project,
      template: null,
    };
  }

  ngOnDestroy() {
    this.nameFormSubscription && this.nameFormSubscription.unsubscribe();
    this.settingsFormSubscription &&
      this.settingsFormSubscription.unsubscribe();
  }

  toNameForm = (id: string) =>
    this.store.select(createStageSelector(id)).pipe(
      filter(stage => !!stage),
      map(stage => stage.name),
      distinctUntilChanged(),
      map(name =>
        this.fb.group({
          name: [
            name,
            [
              Validators.required,
              Validators.pattern(this.nameRule.pattern),
              Validators.maxLength(this.nameRule.maxLength),
            ],
          ],
        }),
      ),
      tap(fg => {
        this.nameFormSubscription && this.nameFormSubscription.unsubscribe();

        this.nameFormSubscription = fg.valueChanges
          .pipe(debounceTime(200))
          .subscribe(({ name }) =>
            this.store.dispatch(changeStageName(id, name)),
          );
      }),
    );

  toSettingsForm = (id: string) =>
    this.store.select(createStageFormAndTask(id), shallowEqual).pipe(
      filter(({ task, form }) => !!task && !!form),
      map(({ task, form: { values, errors, options } }) => {
        const formConfig = R.mapObjIndexed(field => {
          const validators =
            field.required && !field.hidden(values)
              ? [Validators.required, ...field.validators]
              : field.validators;

          return [R.prop(field.name, values), validators];
        }, task.fields);

        const getGroupFields = R.reduce(
          (
            accum: Array<CompiledFieldDefine & { errors: ValidationErrors }>,
            fieldName: string,
          ) => {
            if (task.fields[fieldName].hidden(values)) {
              return accum;
            }

            return [
              ...accum,
              R.merge(task.fields[fieldName], {
                errors: R.prop(fieldName, errors),
                options: R.pathOr([], [fieldName, 'items'], options),
                optionsPending: R.pathOr(
                  false,
                  [fieldName, 'pending'],
                  options,
                ),
              }),
            ];
          },
          [],
        );
        const basic = getGroupFields(task.basic || []);
        const advanced = getGroupFields(task.advanced || []);

        return {
          basic,
          advanced,
          fg: this.fb.group(formConfig),
        };
      }),
      tap(({ fg }) => {
        this.settingsFormSubscription &&
          this.settingsFormSubscription.unsubscribe();

        const originalValues = fg.value;

        this.settingsFormSubscription = fg.valueChanges
          .pipe(debounceTime(200))
          .subscribe(values =>
            this.store.dispatch(
              tryChangeStageValues(
                id,
                originalValues,
                values,
                mergeFormErrors(fg),
              ),
            ),
          );
      }),
    );

  getEdited = (id: string) =>
    this.store.select(state => {
      const stage = createStageSelector(id)(state);
      const form = createStageFormSelector(id)(state);

      if (!stage || !form) {
        return false;
      }

      return stage.edited || form.edited;
    });

  getStage = (id: string) => {
    return this.store.select(createStageSelector(id));
  };

  getTaskDisplayName = (taskId: string) => {
    return this.store.select(createTaskSelector(taskId)).pipe(
      filter(task => !!task),
      map(task => task.displayName),
    );
  };

  getTaskDescription = (taskId: string) => {
    return this.store.select(createTaskSelector(taskId)).pipe(
      filter(task => !!task),
      map(task => task.description),
    );
  };

  toCurrentLang = (str: LocalizedString) => {
    return this.translate.locale$.pipe(
      map(lang => (lang === 'en' ? str.en : str['zh-CN'])),
    );
  };

  firstError = (errors: ValidationErrors) => {
    const result = Object.keys(errors || {}).map(key => {
      switch (key) {
        case 'required':
          return 'required';
        case 'pattern':
          return 'format_invalid';
        case 'maxlength':
          return 'over_max_length';
        default:
          return 'unknow_error';
      }
    });
    return R.head(result);
  };

  fieldTracker(field: CompiledFieldDefine) {
    return field.name;
  }

  trackFn(val: any) {
    if (val && val.key) {
      return val.key;
    }

    if (val && val.name) {
      const prefix = (val.namespace && `${val.namespace}/`) || '';
      return `${prefix}${val.name}`;
    }

    return val;
  }

  normalizeEditorOptions(args: any) {
    return args || { language: 'shell' };
  }

  remove(stage: StageEntity) {
    this.store.dispatch(removeStage(stage.id, stage.parent));
  }

  nameFirstError = (errors: ValidationErrors) => {
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

  multiTrackFn(val: any) {
    if (val && val.name) {
      const prefix = (val.namespace && `${val.namespace}/`) || '';
      return `${prefix}${val.name}`;
    }

    return val;
  }
}
