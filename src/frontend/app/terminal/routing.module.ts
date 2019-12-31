import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';

import { TerminalPageComponent } from './page/component';

@NgModule({
  imports: [
    RouterModule.forChild([
      {
        path: '',
        component: TerminalPageComponent,
      },
    ]),
  ],
  exports: [RouterModule],
})
export class TerminalRoutingModule {}
