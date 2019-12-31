import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { SecretCreateComponent } from './create/secret-create.component';
import { SecretDetailPageComponent } from './detail-page/detail-page.component';
import { SecretListPageComponent } from './list-page/list-page.component';

const routes: Routes = [
  { path: '', component: SecretListPageComponent },
  { path: 'create', component: SecretCreateComponent },
  { path: ':name', component: SecretDetailPageComponent },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class ForWorkspaceRoutingModule {}
