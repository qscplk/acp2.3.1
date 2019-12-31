import { TranslateService } from '@alauda/common-snippet';
import { MessageService } from '@alauda/ui';
import { Location } from '@angular/common';
import { ChangeDetectionStrategy, Component, ViewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { BindingKind } from '@app/api/tool-chain/utils';
import { ArtifactRegistryBindingFormComponent } from '@app/modules/tool-chain/components/artifact-registry-binding-form/artifact-registry-binding-form.component';

@Component({
  templateUrl: 'artifact-registry-binding-create-page.component.html',
  styleUrls: ['artifact-registry-binding-create-page.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ArtifactRegistryBindingCreatePageComponent {
  @ViewChild('form', { static: false })
  form: ArtifactRegistryBindingFormComponent;

  project = this.activatedRoute.snapshot.paramMap.get('name');
  service = this.activatedRoute.snapshot.paramMap.get('service');

  loading = false;
  constructor(
    private readonly activatedRoute: ActivatedRoute,
    private readonly router: Router,
    private readonly message: MessageService,
    private readonly translate: TranslateService,
    private readonly location: Location,
  ) {}

  cancel() {
    this.location.back();
  }

  submit() {
    this.form.submit();
  }

  saved(model: Dictionary<string>) {
    this.message.success(this.translate.get('project.bind_account_succ'));
    const next = this.activatedRoute.snapshot.queryParamMap.get('next');
    if (next) {
      this.router.navigateByUrl(decodeURI(next));
    } else {
      this.router.navigate([
        '/admin/projects',
        this.project,
        BindingKind.ArtifactRegistry,
        model.name,
      ]);
    }
  }

  statusChange(status: string) {
    this.loading = status === 'loading';
  }
}
