import { DIALOG_DATA, DialogRef, NotificationService } from '@alauda/ui';
import {
  ChangeDetectionStrategy,
  Component,
  Inject,
  OnDestroy,
  OnInit,
} from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import {
  JenkinsApiService,
  PipelineGlobalSettings,
  TemplateAgent,
} from '@app/api';
import { assign } from 'lodash-es';
import { Subject, of } from 'rxjs';
import { catchError, takeUntil } from 'rxjs/operators';

interface DialogValue {
  project: string;
  name: string;
  agent: TemplateAgent;
  options: string;
  globalSetting: PipelineGlobalSettings;
}

@Component({
  templateUrl: './global-setting-dialog.component.html',
  styleUrls: ['./global-setting-dialog.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GlobalSettingDialogComponent implements OnInit, OnDestroy {
  private unsubscribe$ = new Subject<void>();
  form = this.buildForm();

  agentLabels$ = this.jenkinsApi
    .getJenkinsAgentLabels(
      this.data.value.project,
      this.data.value.name,
      this.data.value.agent.labelMatcher,
    )
    .pipe(
      catchError(error => {
        this.notification.error({
          content: error.error.error || error.error.message,
        });
        return of([]);
      }),
    );

  constructor(
    private fb: FormBuilder,
    private dialogRef: DialogRef<GlobalSettingDialogComponent>,
    @Inject(DIALOG_DATA)
    public data: {
      value: DialogValue;
    },
    private jenkinsApi: JenkinsApiService,
    private notification: NotificationService,
  ) {}

  ngOnInit(): void {
    this.form
      .get('mode')
      .valueChanges.pipe(takeUntil(this.unsubscribe$))
      .subscribe((mode: string) => {
        if (mode === 'label') {
          this.form.get('raw').setErrors(null);
        } else {
          this.form.get('label').setErrors(null);
        }
      });
  }

  ngOnDestroy() {
    this.unsubscribe$.next();
    this.unsubscribe$.complete();
  }

  private buildForm() {
    return this.fb.group(fromValue(this.data.value), {
      validators: this.formValidator,
    });
  }

  submit() {
    if (this.form.invalid) {
      return;
    }
    this.dialogRef.close(
      assign(this.form.value, {
        labelMatcher: this.data.value.agent.labelMatcher,
      }),
    );
  }

  formValidator(ctrl: FormGroup): ValidationErrors {
    const mode = ctrl.get('mode');
    switch (mode && mode.value) {
      case 'label':
        const label = Validators.required(ctrl.get('label'));
        return label ? { label } : null;
      case 'raw':
        const raw = Validators.required(ctrl.get('raw'));
        return raw ? { raw } : null;
      default:
        return null;
    }
  }
}

function fromValue(value: DialogValue) {
  const defaultValue = {
    mode: value.agent.label ? 'label' : 'raw',
    label: value.agent.label,
    raw: value.agent.raw,
    options: value.options,
  };
  const { mode, label, raw, options } = value.globalSetting || defaultValue;
  return {
    mode,
    label,
    raw,
    options,
  };
}
