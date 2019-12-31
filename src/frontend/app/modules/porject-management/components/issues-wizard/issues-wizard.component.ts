import { Component, Input } from '@angular/core';
import { ToolBinding } from '@app/api';
import { IssuesQueryOptions } from '@app/api/project-management/project-management.types';

@Component({
  selector: 'alo-project-management-issues-wizard',
  templateUrl: './issues-wizard.component.html',
  styleUrls: ['./issues-wizard.component.scss'],
})
export class IssuesWizardComponent {
  @Input()
  bind: ToolBinding;

  options: IssuesQueryOptions;

  constructor() {}

  optionsChanged(options: IssuesQueryOptions) {
    this.options = options;
  }
}
