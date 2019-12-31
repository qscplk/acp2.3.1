import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { ArtifactRepositoriesRoutingModule } from '@app/features/artifact-repositories/artifact-repositories-routing.module';
import { ListPageComponent } from '@app/features/artifact-repositories/list-page/list-page.component';
import { TagListPageComponent } from '@app/features/artifact-repositories/tag-list-page/tag-list-page.component';
import { RegistryCommonModule } from '@app/modules/registry/registry-common.module';
import { SharedModule } from '@app/shared';

@NgModule({
  imports: [
    CommonModule,
    RouterModule,
    SharedModule,
    RegistryCommonModule,
    ArtifactRepositoriesRoutingModule,
  ],
  declarations: [ListPageComponent, TagListPageComponent],
})
export class ArtifactRepositoriesModule {}
