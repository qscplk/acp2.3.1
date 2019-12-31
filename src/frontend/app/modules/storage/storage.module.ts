import { DialogModule, TableOfContentsModule } from '@alauda/ui';
import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { FeatureSharedCommonModule } from '@app/features-shared/common';
import { SharedModule } from '@app/shared';

import {
  PersistentVolumeClaimFormComponent,
  StorageCreateComponent,
  StorageDetailComponent,
  StorageListComponent,
  StorageUpdateComponent,
} from './components';

@NgModule({
  imports: [
    DialogModule,
    TableOfContentsModule,
    CommonModule,
    FormsModule,
    SharedModule,
    RouterModule,
    ReactiveFormsModule,
    FeatureSharedCommonModule,
  ],
  declarations: [
    StorageListComponent,
    PersistentVolumeClaimFormComponent,
    StorageCreateComponent,
    StorageDetailComponent,
    StorageUpdateComponent,
  ],
  exports: [
    StorageListComponent,
    StorageCreateComponent,
    StorageDetailComponent,
    StorageUpdateComponent,
  ],
})
export class StorageModule {}
