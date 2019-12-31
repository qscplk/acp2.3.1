import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  Input,
  OnDestroy,
  OnInit,
} from '@angular/core';
import { FormGroup, Validators } from '@angular/forms';
import { PipelineApiService } from '@app/api';
import { cronRuleValidator } from '@app/modules/pipeline/constant';
import { Subject } from 'rxjs';
import { debounceTime, takeUntil } from 'rxjs/operators';

@Component({
  selector: 'alo-pipeline-cron-trigger-form',
  templateUrl: './cron-trigger-form.component.html',
  styleUrls: ['./cron-trigger-form.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PipelineCronTriggerFormComponent implements OnInit, OnDestroy {
  nextTime: number;
  loading = false;
  @Input()
  form: FormGroup;
  @Input()
  project: string;
  @Input()
  jenkinsBinding: string;

  destroyed$ = new Subject<void>();

  constructor(
    private api: PipelineApiService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit() {
    this.form.controls.cron_string.valueChanges
      .pipe(
        debounceTime(1000),
        takeUntil(this.destroyed$),
      )
      .subscribe((value: string) => {
        if (value) {
          this.loading = true;
          this.nextTime = 0;
          this.cdr.detectChanges();
          this.api
            .cronCheck(this.project, this.jenkinsBinding, { cron: value })
            .subscribe(
              (data: { next: string; previous: string }) => {
                this.nextTime = parseInt(data.next, 10);
                this.loading = false;
                this.cdr.detectChanges();
              },
              () => {
                this.loading = false;
                this.cdr.detectChanges();
              },
            );
        } else {
          this.nextTime = 0;
        }
      });
  }

  ngOnDestroy() {
    this.destroyed$.next();
  }

  inputTypeChange() {
    let type = this.form.controls.sourceType.value;
    if (type === 'select') {
      type = 'input';
      if (this.formValue('enabled')) {
        this.form.controls.cron_string.setValidators([Validators.required]);
      }
      this.form.controls.cron_object.clearValidators();
    } else {
      type = 'select';
      if (this.formValue('enabled')) {
        this.form.controls.cron_object.setValidators([
          Validators.required,
          cronRuleValidator,
        ]);
      }
      this.form.controls.cron_string.clearValidators();
    }
    this.form.controls.cron_string.updateValueAndValidity();
    this.form.controls.cron_object.updateValueAndValidity();
    this.form.controls.sourceType.patchValue(type);
  }

  formValue(name: string) {
    return !!this.form.get(name).value;
  }
}
