import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { ListPageComponent } from '@app/features/shallow-integration/list-page/list-page.component';
import { ShallowIntegrationRoutingModule } from '@app/features/shallow-integration/shallow-integration-routing.module';
import { SharedModule } from '@app/shared';

@NgModule({
  imports: [
    CommonModule,
    RouterModule,
    SharedModule,
    ShallowIntegrationRoutingModule,
  ],
  declarations: [ListPageComponent],
})
export class ShallowIntegrationModule {}
