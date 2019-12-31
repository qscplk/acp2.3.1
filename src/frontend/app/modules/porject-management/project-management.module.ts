import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { SharedModule } from '@app/shared';

import { AssignProjectDialogComponent } from './components/assign-project-dialog/assign-project-dialog.component';
import { ProjectManagementBindingBasicEditComponent } from './components/binding-basic-edit/binding-basic-edit.component';
import { ProjectManagementBindingUpdateDialogComponent } from './components/binding-update-dialog/binding-update-dialog.component';
import { ProjectManagementBindingWizardComponent } from './components/binding-wizard/binding-wizard.component';
import { IssueDetailComponent } from './components/issue-detail/issue-detail.component';
import { IssuesListComponent } from './components/issues-list/issues-list.component';
import { IssuesOptionsComponent } from './components/issues-options/issues-options.component';
import { IssuesWizardComponent } from './components/issues-wizard/issues-wizard.component';
import { ProjectAssignComponent } from './components/project-assign/project-assign.component';
import { ProjectManagementProjectListComponent } from './components/project-list/project-list.component';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    SharedModule,
    ReactiveFormsModule,
  ],
  declarations: [
    ProjectManagementBindingWizardComponent,
    ProjectManagementBindingBasicEditComponent,
    ProjectAssignComponent,
    ProjectManagementProjectListComponent,
    ProjectManagementBindingUpdateDialogComponent,
    AssignProjectDialogComponent,
    IssuesListComponent,
    IssuesWizardComponent,
    IssuesOptionsComponent,
    IssueDetailComponent,
  ],
  exports: [
    ProjectManagementBindingWizardComponent,
    ProjectManagementBindingBasicEditComponent,
    ProjectAssignComponent,
    ProjectManagementProjectListComponent,
    IssuesListComponent,
    IssuesWizardComponent,
    IssuesOptionsComponent,
    IssueDetailComponent,
  ],
  entryComponents: [
    ProjectManagementBindingUpdateDialogComponent,
    AssignProjectDialogComponent,
  ],
})
export class ProjectManagementModule {}
