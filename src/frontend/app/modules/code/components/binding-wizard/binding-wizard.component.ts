import { TranslateService } from '@alauda/common-snippet';
import { MessageService } from '@alauda/ui';
import { Location } from '@angular/common';
import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { BindingKind } from '@app/api/tool-chain/utils';

@Component({
  selector: 'alo-code-binding-wizard',
  templateUrl: 'binding-wizard.component.html',
  styleUrls: ['binding-wizard.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CodeBindingWizardComponent {
  @Input()
  namespace: string;

  @Input()
  service: string;

  codeBinding = '';
  status = {
    bindingAccount: '',
    assignRepository: '',
  };

  get step() {
    return this._steps[this._stepIndex];
  }

  private readonly _steps = ['bindAccount', 'assignRepository'];
  private _stepIndex = 0;

  constructor(
    private readonly router: Router,
    private readonly message: MessageService,
    private readonly translate: TranslateService,
    private readonly location: Location,
    private readonly activatedRoute: ActivatedRoute,
  ) {}

  nextStep(event: any) {
    if (this.step === 'bindAccount') {
      this.codeBinding = event.name;
    }
    if (this.step === 'assignRepository') {
      this.message.success({
        content: this.translate.get('code.create_binding_succ'),
      });
      this.goToDetail();
    }
    if (this._stepIndex < this._steps.length - 1) {
      this._stepIndex++;
    }
  }

  goBack() {
    this.location.back();
  }

  goToDetail() {
    const next = this.activatedRoute.snapshot.queryParamMap.get('next');
    if (next) {
      this.router.navigateByUrl(decodeURI(next));
    } else {
      this.router.navigate([
        '/admin/projects',
        this.namespace,
        BindingKind.CodeRepo,
        this.codeBinding,
      ]);
    }
  }

  onBindingAccountStatusChange(status: string) {
    this.status.bindingAccount = status;
  }
}
