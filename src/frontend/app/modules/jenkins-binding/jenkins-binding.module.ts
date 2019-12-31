import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { SharedModule } from '@app/shared';

import { JenkinsBindingUpdateDialogComponent } from './components';
@NgModule({
  imports: [SharedModule, RouterModule, FormsModule],
  declarations: [JenkinsBindingUpdateDialogComponent],
  exports: [JenkinsBindingUpdateDialogComponent],
  entryComponents: [JenkinsBindingUpdateDialogComponent],
})
export class JenkinsBindingModule {}
