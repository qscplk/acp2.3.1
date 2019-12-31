import { TranslateService } from '@alauda/common-snippet';
import {
  DIALOG_DATA,
  DialogRef,
  MessageService,
  NotificationService,
} from '@alauda/ui';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  Inject,
  OnInit,
} from '@angular/core';
import {
  ApplicationApiService,
  Container,
  ContainerSize,
  ResourceIdentity,
  VolumeInfo,
} from '@app/api';
import { pickBy } from 'lodash-es';

@Component({
  templateUrl: './container-update-differ-dialog.component.html',
  styleUrls: ['./container-update-differ-dialog.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ContainerUpdateDifferDialogComponent implements OnInit {
  saving = false;

  collapseDetail = true;

  constructor(
    private readonly api: ApplicationApiService,
    private readonly cdr: ChangeDetectorRef,
    private readonly message: MessageService,
    private readonly notifaction: NotificationService,
    private readonly translate: TranslateService,
    private readonly dialogRef: DialogRef,
    @Inject(DIALOG_DATA)
    public data: {
      resourceName: string;
      params: ResourceIdentity;
      kind: string;
      container: Container;
      volumeInfo: VolumeInfo[];
    },
  ) {}

  ngOnInit() {}

  save() {
    this.saving = true;
    const resources = this.handleResource(this.data.container.resources);
    const payload = {
      container: {
        name: this.data.container.name,
        image: this.data.container.image,
        resources: resources,
        env: this.data.container.env,
        envFrom: this.data.container.envFrom,
        args: this.data.container.args || [],
        command: this.data.container.command
          ? this.data.container.command.split(' ')
          : [],
      },
      volumeInfo: this.data.volumeInfo,
    };
    this.api
      .putContainer(
        this.data.kind,
        this.data.params.cluster,
        this.data.params.namespace,
        this.data.params.resourceName,
        this.data.container.name,
        payload,
      )
      .subscribe(
        () => {
          this.saving = false;
          this.message.success({
            content: this.translate.get('application.container_update_success'),
          });
          this.cdr.detectChanges();
          this.dialogRef.close(true);
        },
        (error: any) => {
          this.notifaction.error({
            title: this.translate.get('application.container_update_fail'),
            content: error.error.error || error.error.message,
          });
          this.saving = false;
          this.cdr.detectChanges();
        },
      );
  }

  handleResource(resources: ContainerSize) {
    return {
      limits: pickBy(resources.limits),
      requests: pickBy(resources.requests),
    };
  }

  cancel() {
    this.dialogRef.close();
  }
}
