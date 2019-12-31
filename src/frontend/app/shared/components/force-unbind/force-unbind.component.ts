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
} from '@angular/core';
import { Router } from '@angular/router';
import { ResourceBinding } from '@app/api/api.types';
import { Observable } from 'rxjs';

@Component({
  templateUrl: 'force-unbind.component.html',
  styleUrls: ['force-unbind.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ForceUnbindComponent {
  binding: ResourceBinding;
  inputingName = '';
  loading = false;
  redirect: boolean;

  constructor(
    @Inject(DIALOG_DATA)
    public data: {
      binding: ResourceBinding;
      redirect?: boolean;
      unbind: () => Observable<void>;
      hint?: string;
    },
    private readonly dialogRef: DialogRef,
    private readonly message: MessageService,
    private readonly notifaction: NotificationService,
    private readonly translate: TranslateService,
    private readonly cdr: ChangeDetectorRef,
    private readonly router: Router,
  ) {
    this.binding = data.binding;
    this.redirect = data.hasOwnProperty('redirect') ? data.redirect : true;
  }

  unbind() {
    this.loading = true;
    this.data.unbind().subscribe(
      () => {
        this.loading = false;
        this.message.success(this.translate.get('project.unbind_successfully'));
        this.dialogRef.close(true);
        if (this.redirect) {
          this.router.navigate(['/admin/projects', this.binding.namespace]);
        }
        this.cdr.markForCheck();
      },
      error => {
        this.loading = false;
        this.notifaction.error({
          title: this.translate.get('project.unbind_failed'),
          content: error.error.error || error.error.message,
        });
        this.cdr.markForCheck();
      },
    );
  }
}
