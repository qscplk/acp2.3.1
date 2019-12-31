import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { SharedModule } from '@app/shared';

import {
  CodeQualityBindingDetailComponent,
  CodeQualityBindingUpdateDialogComponent,
  CodeQualityGlobalStatusComponent,
  CodeQualityIconComponent,
  CodeQualityLegendsComponent,
  CodeQualityProjectCardListComponent,
  CodeQualityProjectListComponent,
} from './components';

@NgModule({
  imports: [SharedModule, RouterModule, FormsModule],
  declarations: [
    CodeQualityProjectListComponent,
    CodeQualityProjectCardListComponent,
    CodeQualityIconComponent,
    CodeQualityLegendsComponent,
    CodeQualityBindingDetailComponent,
    CodeQualityBindingUpdateDialogComponent,
    CodeQualityGlobalStatusComponent,
  ],
  exports: [
    CodeQualityProjectListComponent,
    CodeQualityProjectCardListComponent,
    CodeQualityIconComponent,
    CodeQualityLegendsComponent,
    CodeQualityBindingDetailComponent,
    CodeQualityGlobalStatusComponent,
  ],
  entryComponents: [CodeQualityBindingUpdateDialogComponent],
})
export class CodeQualityModule {}
