import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { DetailPageComponent } from '@app/features/tool-chain/detail/detail.component';
import { ListPageComponent } from '@app/features/tool-chain/list/list-page.component';

const routes: Routes = [
  { path: '', component: ListPageComponent },
  { path: ':kind/:name', component: DetailPageComponent },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class ToolChainRoutingModule {}
