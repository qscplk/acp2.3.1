import { Location } from '@angular/common';
import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { RegistryBinding } from '@app/api/registry/registry-api.types';
import { BindingKind } from '@app/api/tool-chain/utils';

@Component({
  selector: 'alo-registry-binding-wizard',
  templateUrl: 'binding-wizard.component.html',
  styleUrls: ['binding-wizard.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RegistryBindingWizardComponent {
  @Input() namespace: string;
  @Input() service: string;

  step = 'bindAccount';
  loading = false;
  binding: RegistryBinding;

  constructor(
    private location: Location,
    private router: Router,
    private activatedRoute: ActivatedRoute,
  ) {}

  accountBound(binding: RegistryBinding) {
    this.step = 'assignRepository';
    this.binding = binding;
  }

  repoAssigned() {
    const next = this.activatedRoute.snapshot.queryParamMap.get('next');
    if (next) {
      this.router.navigateByUrl(decodeURI(next));
    } else {
      this.router.navigate([
        '/admin/projects',
        this.binding.namespace,
        BindingKind.Registry,
        this.binding.name,
      ]);
    }
  }

  cancel() {
    this.location.back();
  }
}
