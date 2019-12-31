import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { AssignRepositoryComponent } from '@app/modules/registry/components/assign-repository/assign-repository.component';
import { BindAccountFormComponent } from '@app/modules/registry/components/binding-wizard/bind-account-form/bind-account-form.component';
import { RegistryBindingWizardComponent } from '@app/modules/registry/components/binding-wizard/binding-wizard.component';
import { DistributeRegistryFormComponent } from '@app/modules/registry/components/binding-wizard/distribute-registry-form/distribute-registry-form.component';
import { ImageTagListComponent } from '@app/modules/registry/components/image-tag-list/image-tag-list.component';
import { RepositoryListComponent } from '@app/modules/registry/components/repository-list/repository-list.component';
import { ScanStatusComponent } from '@app/modules/registry/components/scan-status/scan-status.component';
import { TagListSectionComponent } from '@app/modules/registry/components/tag-list-section/tag-list-section.component';
import { UpdateRegistryBindingComponent } from '@app/modules/registry/components/update-binding/update-binding.component';
import { SharedModule } from '@app/shared';

@NgModule({
  imports: [CommonModule, FormsModule, RouterModule, SharedModule],
  declarations: [
    BindAccountFormComponent,
    DistributeRegistryFormComponent,
    RegistryBindingWizardComponent,
    UpdateRegistryBindingComponent,
    RepositoryListComponent,
    AssignRepositoryComponent,
    ImageTagListComponent,
    TagListSectionComponent,
    ScanStatusComponent,
  ],
  exports: [
    RegistryBindingWizardComponent,
    RepositoryListComponent,
    ImageTagListComponent,
    TagListSectionComponent,
    ScanStatusComponent,
  ],
  entryComponents: [UpdateRegistryBindingComponent, AssignRepositoryComponent],
})
export class RegistryCommonModule {}
