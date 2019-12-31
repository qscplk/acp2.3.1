import { NgModule } from '@angular/core';
import { CodeModule } from '@app/modules/code';
import { SharedModule } from '@app/shared';

import { CodeRepositoriesRoutingModule } from './code-repositories-routing.module';
import { CodeRepositoryListPageComponent } from './list-page/list-page.component';

@NgModule({
  imports: [SharedModule, CodeModule, CodeRepositoriesRoutingModule],
  declarations: [CodeRepositoryListPageComponent],
})
export class CodeRepositoriesModule {}
