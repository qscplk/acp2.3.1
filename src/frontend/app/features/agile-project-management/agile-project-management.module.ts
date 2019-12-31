import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { AgileProjectManagementRoutingModule } from '@app/features/agile-project-management/agile-project-management-routing.module';
import { AgileProjectManagementIssueDetailComponent } from '@app/features/agile-project-management/detail/detail.component';
import { AgileProjectManagementIssuesListComponent } from '@app/features/agile-project-management/list/list.component';
import { ProjectManagementModule } from '@app/modules/porject-management/project-management.module';
import { SharedModule } from '@app/shared';

@NgModule({
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    SharedModule,
    AgileProjectManagementRoutingModule,
    ProjectManagementModule,
  ],
  declarations: [
    AgileProjectManagementIssuesListComponent,
    AgileProjectManagementIssueDetailComponent,
  ],
})
export class AgileProjectManagementModule {}
