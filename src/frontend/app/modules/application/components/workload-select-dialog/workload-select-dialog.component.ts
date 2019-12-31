import {
  K8sApiService,
  TranslateService,
  publishRef,
} from '@alauda/common-snippet';
import {
  DIALOG_DATA,
  DialogRef,
  MessageService,
  NotificationService,
} from '@alauda/ui';
import {
  ChangeDetectionStrategy,
  Component,
  Inject,
  OnInit,
  ViewChild,
} from '@angular/core';
import { FormBuilder, FormGroup, NgForm, Validators } from '@angular/forms';
import { ApplicationApiService } from '@app/api';
import { isIndependentWorkload } from '@app/api/application/utils';
import { Constants, TOKEN_CONSTANTS } from '@app/constants';
import { APPLICATION_NAME_RULE } from '@app/utils/patterns';
import { get, omit } from 'lodash-es';
import { forkJoin } from 'rxjs';
import { map, tap } from 'rxjs/operators';

@Component({
  templateUrl: './workload-select-dialog.component.html',
  styleUrls: ['./workload-select-dialog.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WorkloadSelectDialogComponent implements OnInit {
  loading = true;
  form: FormGroup;

  get validatorRule() {
    const maxLength = 62 - get(this.data, 'namespace.length', 0);
    return APPLICATION_NAME_RULE(maxLength);
  }

  @ViewChild('ngForm', { static: false })
  ngForm: NgForm;

  workloads$ = forkJoin([
    this.getWorkloadList('DEPLOYMENT'),
    this.getWorkloadList('DAEMONSET'),
    this.getWorkloadList('STATEFULSET'),
  ]).pipe(
    map(([deployments, daemonsets, statefulsets]) => {
      return {
        deployments,
        daemonsets,
        statefulsets,
      };
    }),
    tap(() => {
      this.loading = false;
    }),
    publishRef(),
  );

  constructor(
    private readonly k8sApi: K8sApiService,
    private readonly applicationApi: ApplicationApiService,
    private readonly translate: TranslateService,
    private readonly fb: FormBuilder,
    private readonly message: MessageService,
    private readonly notification: NotificationService,
    private readonly dialogRef: DialogRef,
    @Inject(DIALOG_DATA)
    public data: {
      type: string;
      cluster: string;
      namespace: string;
    },
    @Inject(TOKEN_CONSTANTS) private readonly constants: Constants,
  ) {}

  ngOnInit() {
    this.form = this.buildForm();
  }

  getWorkloadList(type: string) {
    return this.k8sApi
      .getResourceList({
        type,
        cluster: this.data.cluster,
        namespace: this.data.namespace,
      })
      .pipe(
        map((res: any) => {
          return get(res, 'items', []).filter((workload: any) =>
            isIndependentWorkload(workload, this.constants.ANNOTATION_PREFIX),
          );
        }),
      );
  }

  private buildForm() {
    return this.fb.group({
      applicationName: this.fb.control('', [
        Validators.required,
        Validators.pattern(this.validatorRule.pattern),
        Validators.maxLength(this.validatorRule.maxLength),
      ]),
      workload: this.fb.control(null, [Validators.required]),
    });
  }

  create() {
    this.ngForm.onSubmit(null);
    if (this.form.invalid) {
      return;
    }
    const rawWorkload = this.form.value.workload;
    const metadata = get(rawWorkload, 'metadata', {});
    const workload = {
      ...omit(rawWorkload, 'status'),
      metadata: {
        ...omit(metadata, [
          'creationTimestamp',
          'resourceVersion',
          'selfLink',
          'uid',
        ]),
      },
    };

    const body = {
      objectMeta: {
        name: this.form.value.applicationName,
      },
      typeMeta: {
        kind: 'application',
      },
      resources: [workload],
      source: 'workload',
      description: '',
    };

    this.applicationApi
      .createApplicationWithYaml(this.data.cluster, this.data.namespace, body)
      .subscribe(
        (res: any) => {
          this.message.success({
            content: this.translate.get('application_create_succ'),
          });
          this.dialogRef.close(res);
        },
        (error: any) => {
          this.notification.error({
            title: this.translate.get('application_create_fail'),
            content: error.error.error || error.error.message,
          });
        },
      );
  }

  cancel() {
    this.dialogRef.close();
  }
}
