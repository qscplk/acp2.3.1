import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { StorageCreatePageComponent } from './create-page/create-page.component';
import { StorageDetailPageComponent } from './detail-page/detail-page.component';
import { StorageListPageComponent } from './list-page/list-page.component';

const sample = `apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  namespace: default
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 8Gi`;

const routes: Routes = [
  { path: '', component: StorageListPageComponent },
  {
    path: 'create',
    component: StorageCreatePageComponent,
    data: {
      sample,
    },
  },
  // 存储暂时不提供更新功能
  // {
  //   path: 'update/:name',
  //   component: StorageUpdatePageComponent,
  // },
  {
    path: 'detail/:name',
    component: StorageDetailPageComponent,
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class StoragesRoutingModule {}
