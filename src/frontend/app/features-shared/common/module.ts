import { TranslateModule } from '@alauda/common-snippet';
import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { SharedModule } from '@app/shared';
import { ZeroStateComponent } from '@app/shared/components/zero-state/zero-state.component';

import {
  ArrayFormTableComponent,
  ArrayFormTableFooterDirective,
  ArrayFormTableHeaderDirective,
  ArrayFormTableRowControlDirective,
  ArrayFormTableRowDirective,
  ArrayFormTableZeroStateDirective,
} from './array-form-table/component';
import { KeyValueFormListComponent } from './key-value-form-list/component';
import { KeyValueFormTableComponent } from './key-value-form-table/component';

const EXPORTS = [
  ArrayFormTableComponent,
  ArrayFormTableFooterDirective,
  ArrayFormTableHeaderDirective,
  ArrayFormTableRowControlDirective,
  ArrayFormTableRowDirective,
  ArrayFormTableZeroStateDirective,
  KeyValueFormTableComponent,
  KeyValueFormListComponent,
];

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    SharedModule,
    TranslateModule,
  ],
  declarations: [...EXPORTS, ZeroStateComponent],
  exports: EXPORTS,
})
export class FeatureSharedCommonModule {}
