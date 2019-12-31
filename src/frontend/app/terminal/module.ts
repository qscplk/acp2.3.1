import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

import { SharedModule } from '../shared';

import { TerminalPageComponent } from './page/component';
import { TerminalRoutingModule } from './routing.module';

@NgModule({
  imports: [SharedModule, RouterModule, TerminalRoutingModule, FormsModule],
  declarations: [TerminalPageComponent],
})
export class TerminalModule {
  // For lazy loaded modules, you need to manually load the language pack by your self.
  constructor() {}
}
