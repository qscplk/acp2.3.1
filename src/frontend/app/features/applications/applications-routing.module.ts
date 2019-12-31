import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { ApplicationCreateComponent } from './create/application-create.component';
import { ContainerUpdatePageComponent } from './detail-page/container-update-page/container-update-page.component';
import { ApplicationDetailPageComponent } from './detail-page/detail-page.component';
import { ApplicationListComponent } from './list/application-list.component';
import { ResourceDetailComponent } from './resource-detail/resource-detail.component';
import { ResourceUpdateComponent } from './resource-update/resource-update.component';
import { ApplicationUpdatePageComponent } from './update-page/update-page.component';

const routes: Routes = [
  { path: '', component: ApplicationListComponent },
  { path: 'create', component: ApplicationCreateComponent },
  { path: ':name', component: ApplicationDetailPageComponent },
  { path: ':name/update', component: ApplicationUpdatePageComponent },
  { path: ':name/:resourceName', component: ContainerUpdatePageComponent },
  { path: ':name/:kind/:resourceName', component: ResourceDetailComponent },
  {
    path: ':name/:kind/:resourceName/update',
    component: ResourceUpdateComponent,
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class ApplicationsRoutingModule {}
