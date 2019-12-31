import { TranslateService } from '@alauda/common-snippet';
import { DIALOG_DATA, DialogRef, MessageService } from '@alauda/ui';
import {
  ChangeDetectionStrategy,
  Component,
  Inject,
  ViewChild,
} from '@angular/core';
import { ArtifactRegistryBinding } from '@app/api';

import { ArtifactRegistryBindingFormComponent } from '../artifact-registry-binding-form/artifact-registry-binding-form.component';

@Component({
  templateUrl: './update-artifact-registry-binding.component.html',
  styleUrls: ['./update-artifact-registry-binding.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UpdateArtifactRegistryBindingComponent {
  @ViewChild('form', { static: false })
  form: ArtifactRegistryBindingFormComponent;

  loading = false;
  constructor(
    @Inject(DIALOG_DATA) public data: ArtifactRegistryBinding,
    private readonly translate: TranslateService,
    private readonly message: MessageService,
    private readonly dialogRef: DialogRef<
      UpdateArtifactRegistryBindingComponent,
      Dictionary<string>
    >,
  ) {}

  submit() {
    this.form.submit();
  }

  saved(model: Dictionary<string>) {
    this.message.success(this.translate.get('update_succeeded'));
    this.dialogRef.close(model);
  }

  statusChange(status: string) {
    this.loading = status === 'loading';
  }
}
