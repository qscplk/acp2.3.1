import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

import { ApplicationModule } from '../../modules/application';
import { SharedModule } from '../../shared';

import { ApplicationsRoutingModule } from './applications-routing.module';
import { ApplicationCreateComponent } from './create/application-create.component';
import { ContainerUpdatePageComponent } from './detail-page/container-update-page/container-update-page.component';
import { ApplicationDetailPageComponent } from './detail-page/detail-page.component';
import { ApplicationListComponent } from './list/application-list.component';
import { ResourceDetailComponent } from './resource-detail/resource-detail.component';
import { ResourceUpdateComponent } from './resource-update/resource-update.component';
import { ApplicationUpdatePageComponent } from './update-page/update-page.component';

@NgModule({
  declarations: [
    ApplicationListComponent,
    ApplicationCreateComponent,
    ApplicationDetailPageComponent,
    ContainerUpdatePageComponent,
    ResourceDetailComponent,
    ResourceUpdateComponent,
    ApplicationUpdatePageComponent,
  ],
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    SharedModule,
    ApplicationModule,
    ApplicationsRoutingModule,
  ],
  providers: [],
})
export class ApplicationsModule {}
