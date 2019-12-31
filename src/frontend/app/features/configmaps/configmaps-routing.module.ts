import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { ConfigMapCreatePageComponent } from './create-page/create-page.component';
import { ConfigMapDetailPageComponent } from './detail-page/detail-page.component';
import { ConfigMapListPageComponent } from './list-page/list-page.component';
import { ConfigMapUpdatePageComponent } from './update-page/update-page.component';

const sample = `apiVersion: v1
kind: ConfigMap
metadata:
  namespace: default`;

const routes: Routes = [
  { path: '', component: ConfigMapListPageComponent },
  {
    path: 'create',
    component: ConfigMapCreatePageComponent,
    data: {
      sample: sample,
    },
  },
  {
    path: 'update/:name',
    component: ConfigMapUpdatePageComponent,
  },
  {
    path: 'detail/:name',
    component: ConfigMapDetailPageComponent,
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class ConfigMapsRoutingModule {}
