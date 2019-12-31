import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { NoNamespacePageComponent } from './no-namespace-page.component';
import { WorkspaceComponent } from './workspace.component';

const routes: Routes = [
  {
    path: ':project',
    component: WorkspaceComponent,
    children: [
      { path: '', redirectTo: 'overview', pathMatch: 'full' },
      {
        path: 'overview',
        loadChildren: () =>
          import('../dashboard/dashboard.module').then(m => m.DashboardModule),
      },
      {
        path: 'pipelines',
        loadChildren: () =>
          import('../pipelines/pipelines.module').then(m => m.PipelinesModule),
      },
      {
        path: 'agile-project-management',
        loadChildren: () =>
          import(
            '../agile-project-management/agile-project-management.module'
          ).then(m => m.AgileProjectManagementModule),
      },
      {
        path: 'secrets',
        loadChildren: () =>
          import('../secrets/for-workspace.module').then(
            m => m.ForWorkspaceModule,
          ),
      },
      {
        path: 'code-repositories',
        loadChildren: () =>
          import('../code-repositories/code-repositories.module').then(
            m => m.CodeRepositoriesModule,
          ),
      },
      {
        path: 'artifact-repositories',
        loadChildren: () =>
          import('../artifact-repositories/artifact-repositories.module').then(
            m => m.ArtifactRepositoriesModule,
          ),
      },
      {
        path: 'shallow-integration',
        loadChildren: () =>
          import('../shallow-integration/shallow-integration.module').then(
            m => m.ShallowIntegrationModule,
          ),
      },
      {
        path: 'code-quality-projects',
        loadChildren: () =>
          import('../code-quality-projects/module').then(
            m => m.CodeQualityProjectsModule,
          ),
      },
      {
        path: 'no-namespace',
        component: NoNamespacePageComponent,
      },
      {
        path: 'clusters/:cluster/namespaces/:namespace',
        children: [
          {
            path: 'applications',
            loadChildren: () =>
              import('../applications/applications.module').then(
                m => m.ApplicationsModule,
              ),
          },
          {
            path: 'configmaps',
            loadChildren: () =>
              import('../configmaps/configmaps.module').then(
                m => m.ConfigmapsModule,
              ),
          },
          {
            path: 'configsecrets',
            loadChildren: () =>
              import('../config-secrets/config-secrets.module').then(
                m => m.ConfigSecretsModule,
              ),
          },
          {
            path: 'storages',
            loadChildren: () =>
              import('../storages/storages.module').then(m => m.StoragesModule),
          },
        ],
      },
    ],
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class WorkspaceRoutingModule {}
