import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AgileProjectManagementIssueDetailComponent } from '@app/features/agile-project-management/detail/detail.component';
import { AgileProjectManagementIssuesListComponent } from '@app/features/agile-project-management/list/list.component';

const routes: Routes = [
  { path: 'issues', component: AgileProjectManagementIssuesListComponent },
  {
    path: 'issues/:binding/:key',
    component: AgileProjectManagementIssueDetailComponent,
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class AgileProjectManagementRoutingModule {}
