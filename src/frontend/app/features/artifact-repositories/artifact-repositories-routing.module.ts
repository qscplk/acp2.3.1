import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ListPageComponent } from '@app/features/artifact-repositories/list-page/list-page.component';
import { TagListPageComponent } from '@app/features/artifact-repositories/tag-list-page/tag-list-page.component';

const routes: Routes = [
  { path: '', component: ListPageComponent },
  { path: ':name', component: TagListPageComponent },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
})
export class ArtifactRepositoriesRoutingModule {}
