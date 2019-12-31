import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { SharedModule } from '@app/shared';

import {
  CodeBindingBasicEditComponent,
  CodeBindingDetailComponent,
  CodeBindingListComponent,
  CodeBindingUpdateDialogComponent,
  CodeBindingUpdateReportDialogComponent,
  CodeBindingWizardComponent,
  CodeRemoteRepositorySelectorComponent,
  CodeRepositoryAssignComponent,
  CodeRepositoryAssignDialogComponent,
  CodeRepositoryListComponent,
  SecretValidatingDialogComponent,
} from './components';

@NgModule({
  imports: [SharedModule, RouterModule, FormsModule],
  declarations: [
    CodeBindingListComponent,
    CodeBindingDetailComponent,
    CodeRepositoryListComponent,
    CodeBindingWizardComponent,
    CodeBindingBasicEditComponent,
    CodeRepositoryAssignComponent,
    CodeRemoteRepositorySelectorComponent,
    CodeBindingUpdateDialogComponent,
    CodeRepositoryAssignDialogComponent,
    CodeBindingUpdateReportDialogComponent,
    SecretValidatingDialogComponent,
  ],
  exports: [
    CodeBindingListComponent,
    CodeBindingDetailComponent,
    CodeRepositoryListComponent,
    CodeBindingWizardComponent,
    CodeBindingBasicEditComponent,
    CodeRepositoryAssignComponent,
  ],
  entryComponents: [
    CodeBindingUpdateDialogComponent,
    CodeRepositoryAssignDialogComponent,
    CodeBindingUpdateReportDialogComponent,
    SecretValidatingDialogComponent,
  ],
})
export class CodeModule {}
