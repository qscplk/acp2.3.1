import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { StorageModule } from '@app/modules/storage/storage.module';

import { SharedModule } from '../../shared';

import { StorageCreatePageComponent } from './create-page/create-page.component';
import { StorageDetailPageComponent } from './detail-page/detail-page.component';
import { StorageListPageComponent } from './list-page/list-page.component';
import { StoragesRoutingModule } from './storages-routing.module';
import { StorageUpdatePageComponent } from './update-page/update-page.component';

@NgModule({
  imports: [
    CommonModule,
    StorageModule,
    RouterModule,
    FormsModule,
    ReactiveFormsModule,
    SharedModule,
    StoragesRoutingModule,
  ],
  declarations: [
    StorageListPageComponent,
    StorageDetailPageComponent,
    StorageCreatePageComponent,
    StorageUpdatePageComponent,
  ],
})
export class StoragesModule {
  constructor() {}
}
