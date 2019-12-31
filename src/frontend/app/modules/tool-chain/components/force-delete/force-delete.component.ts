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
import { ToolChainApiService } from '@app/api/tool-chain/tool-chain-api.service';
import { ToolKind } from '@app/api/tool-chain/utils';

@Component({
  templateUrl: 'force-delete.component.html',
  styleUrls: ['force-delete.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ForceDeleteComponent {
  inputingName = '';
  loading = false;

  constructor(
    @Inject(DIALOG_DATA) public data: { name: string; kind: ToolKind },
    private readonly dialogRef: DialogRef,
    private readonly toolChainApi: ToolChainApiService,
    private readonly notifaction: NotificationService,
    private readonly message: MessageService,
    private readonly translate: TranslateService,
    private readonly cdr: ChangeDetectorRef,
    private readonly router: Router,
  ) {}

  delete() {
    this.loading = true;
    this.toolChainApi.deleteTool(this.data.kind, this.data.name).subscribe(
      () => {
        this.loading = false;
        this.message.success(
          this.translate.get('tool_chain.delete_successful'),
        );
        this.dialogRef.close(true);
        this.router.navigateByUrl('/admin/tool-chain');
        this.cdr.markForCheck();
      },
      err => {
        this.loading = false;
        this.notifaction.error({
          title: this.translate.get('tool_chain.delete_failed'),
          content: err.error.errors || err.error.message,
        });
        this.cdr.markForCheck();
      },
    );
  }
}
