import { NotificationService } from '@alauda/ui';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  EventEmitter,
  Input,
  OnInit,
  Output,
} from '@angular/core';
import { FormGroup } from '@angular/forms';
import { JenkinsApiService } from '@app/api/jenkins/jenkins-api.service';
import { JenkinsBinding } from '@app/api/jenkins/jenkins-api.types';
import { of } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { PIPELINE_NAME_RULE } from '@app/utils/patterns';

@Component({
  selector: 'alo-pipeline-basic-form',
  templateUrl: './basic-form.component.html',
  styleUrls: ['./basic-form.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PipelineBasicFormComponent implements OnInit {
  jenkinsfielSourceType = [
    { value: 'repo', name: 'pipeline.from_repo' },
    { value: 'script', name: 'pipeline.from_script' },
  ];

  jenkinsRunPolicy = [
    { value: 'Serial', name: 'pipeline.serial' },
    { value: 'Parallel', name: 'pipeline.parallel' },
  ];

  // apps: any[];
  jenkins: JenkinsBinding[];
  nameRule = PIPELINE_NAME_RULE;

  @Input()
  form: FormGroup;

  @Input()
  project: string;

  @Input()
  type: 'create' | 'update' = 'create';

  @Input()
  method: string;

  @Output()
  jenkinsChanged = new EventEmitter<any>();

  get values() {
    return this.form.value;
  }

  constructor(
    private readonly jenkinsApi: JenkinsApiService,
    // private appApi: ApplicationApiService,
    private readonly notification: NotificationService,
    private readonly cdr: ChangeDetectorRef,
  ) {}

  ngOnInit() {
    this.fetchData();
  }

  fetchData() {
    this.getJenkins().subscribe((instanceResult: any) => {
      if (instanceResult.error) {
        this.errorHandler(instanceResult.content);
      }
    });
  }

  getJenkins() {
    return this.jenkinsApi.findBindingsByProject(this.project, {}).pipe(
      tap(result => {
        this.jenkins = result.items;
        if (this.jenkins && !this.jenkins.length) {
          this.form.controls.jenkins_instance.disable();
        }
        this.jenkinsChanged.emit(this.jenkins);
        this.cdr.markForCheck();
      }),
      catchError(error => {
        this.jenkins = [];
        return of({ content: error, error: true });
      }),
    );
  }

  private errorHandler(error: any) {
    this.notification.error({
      content: error.error.error || error.error.message,
    });
  }
}
