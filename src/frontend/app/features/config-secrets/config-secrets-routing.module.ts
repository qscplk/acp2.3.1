import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { ConfigSecretCreatePageComponent } from './create-page/create-page.component';
import { ConfigSecretDetailPageComponent } from './detail-page/detail-page.component';
import { ConfigSecretListPageComponent } from './list-page/list-page.component';
import { ConfigSecretUpdatePageComponent } from './update-page/update-page.component';
const sample = `apiVersion: v1
kind: Secret
metadata:
  namespace: default
type: Opaque`;

const routes: Routes = [
  { path: '', component: ConfigSecretListPageComponent },
  {
    path: 'create',
    component: ConfigSecretCreatePageComponent,
    data: {
      sample: sample,
    },
  },
  {
    path: 'update/:name',
    component: ConfigSecretUpdatePageComponent,
  },
  {
    path: 'detail/:name',
    component: ConfigSecretDetailPageComponent,
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class ConfigSecretsRoutingModule {}
