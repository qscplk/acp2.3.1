import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { CodeQualityProjectListPageComponent } from './list-page/list-page.component';

const routes: Routes = [
  { path: '', component: CodeQualityProjectListPageComponent },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
})
export class CodeQualityProjectsRoutingModule {}
