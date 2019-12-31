import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { CodeRepositoryListPageComponent } from './list-page/list-page.component';

const routes: Routes = [
  { path: '', component: CodeRepositoryListPageComponent },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
})
export class CodeRepositoriesRoutingModule {}
