import { AuthorizationGuardService } from '@alauda/common-snippet';
import { NgModule } from '@angular/core';
import { PreloadAllModules, RouterModule, Routes } from '@angular/router';

const routes: Routes = [
  {
    path: '',
    redirectTo: '/home/projects',
    pathMatch: 'full',
  },
  // List lazy loading modules here:
  {
    path: 'home',
    loadChildren: () =>
      import('./features/home/home.module').then(m => m.HomeModule),
    canActivate: [AuthorizationGuardService],
  },
  {
    path: 'admin',
    loadChildren: () =>
      import('./features/admin/admin.module').then(m => m.AdminModule),
    canActivate: [AuthorizationGuardService],
    data: { admin: true },
  },
  {
    path: 'workspace',
    loadChildren: () =>
      import('./features/workspace/workspace.module').then(
        m => m.WorkspaceModule,
      ),
    canActivate: [AuthorizationGuardService],
  },
  {
    path: 'terminal',
    loadChildren: () =>
      import('app/terminal/module').then(m => m.TerminalModule),
    canActivate: [AuthorizationGuardService],
    data: {
      auth: true,
    },
  },
];

@NgModule({
  imports: [
    RouterModule.forRoot(routes, {
      useHash: true,
      preloadingStrategy: PreloadAllModules,
      paramsInheritanceStrategy: 'always',
      scrollPositionRestoration: 'top',
    }),
  ],
  exports: [RouterModule],
})
export class AppRoutingModule {}
