import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ListPageComponent } from '@app/features/shallow-integration/list-page/list-page.component';

const routes: Routes = [{ path: ':toolType', component: ListPageComponent }];

@NgModule({
  imports: [RouterModule.forChild(routes)],
})
export class ShallowIntegrationRoutingModule {}
