import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AdminComponent } from '@app/features/admin/admin.component';

const routes: Routes = [
  {
    path: '',
    component: AdminComponent,
    children: [
      { path: '', redirectTo: 'projects', pathMatch: 'full' },
      {
        path: 'projects',
        loadChildren: () =>
          import('../projects/projects.module').then(m => m.ProjectsModule),
      },
      {
        path: 'secrets',
        loadChildren: () =>
          import('../secrets/for-admin.module').then(m => m.ForAdminModule),
      },
      {
        path: 'tool-chain',
        loadChildren: () =>
          import('../tool-chain/tool-chain.module').then(
            m => m.ToolChainModule,
          ),
      },
    ],
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class AdminRoutingModule {}
