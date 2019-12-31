import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { DetailPageComponent } from '@app/features/tool-chain/detail/detail.component';
import { ListPageComponent } from '@app/features/tool-chain/list/list-page.component';
import { ToolChainRoutingModule } from '@app/features/tool-chain/tool-chain-routing.module';
import { ToolChainCommonModule } from '@app/modules/tool-chain/tool-chain-common.module';
import { SharedModule } from '@app/shared';

@NgModule({
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    SharedModule,
    ToolChainRoutingModule,
    ToolChainCommonModule,
  ],
  declarations: [ListPageComponent, DetailPageComponent],
})
export class ToolChainModule {}
