import { Location } from '@angular/common';
import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { ProjectManagementBinding } from '@app/api/project-management/project-management.types';

@Component({
  selector: 'alo-project-management-binding-wizard',
  templateUrl: 'binding-wizard.component.html',
  styleUrls: ['binding-wizard.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProjectManagementBindingWizardComponent {
  @Input()
  namespace: string;
  @Input()
  service: string;

  step = 'bindAccount';
  loading = false;
  binding: ProjectManagementBinding;

  constructor(private location: Location) {}

  cancel() {
    this.location.back();
  }

  accountBound(binding: ProjectManagementBinding) {
    this.step = 'assignProject';
    this.binding = binding;
  }
}
