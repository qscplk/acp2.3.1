import { DialogModule, TableOfContentsModule } from '@alauda/ui';
import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { FeatureSharedCommonModule } from '@app/features-shared/common';
import { SharedModule } from '@app/shared';

import {
  ConfigMapCreateComponent,
  ConfigMapDataViwerComponent,
  ConfigMapDetailComponent,
  ConfigMapFormComponent,
  ConfigMapListComponent,
  ConfigmapUpdateComponent,
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
    ConfigMapListComponent,
    ConfigMapFormComponent,
    ConfigMapDetailComponent,
    ConfigMapDataViwerComponent,
    ConfigMapCreateComponent,
    ConfigmapUpdateComponent,
  ],
  exports: [
    ConfigMapListComponent,
    ConfigMapFormComponent,
    ConfigMapDetailComponent,
    ConfigMapCreateComponent,
    ConfigmapUpdateComponent,
  ],
})
export class ConfigmapModule {}
