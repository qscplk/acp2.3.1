import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { ConfigmapModule } from '@app/modules/configmap';

import { SharedModule } from '../../shared';

import { ConfigMapsRoutingModule } from './configmaps-routing.module';
import { ConfigMapCreatePageComponent } from './create-page/create-page.component';
import { ConfigMapDetailPageComponent } from './detail-page/detail-page.component';
import { ConfigMapListPageComponent } from './list-page/list-page.component';
import { ConfigMapUpdatePageComponent } from './update-page/update-page.component';

@NgModule({
  imports: [
    CommonModule,
    ConfigmapModule,
    RouterModule,
    FormsModule,
    ReactiveFormsModule,
    SharedModule,
    ConfigMapsRoutingModule,
  ],
  declarations: [
    ConfigMapListPageComponent,
    ConfigMapCreatePageComponent,
    ConfigMapUpdatePageComponent,
    ConfigMapDetailPageComponent,
  ],
})
export class ConfigmapsModule {}
