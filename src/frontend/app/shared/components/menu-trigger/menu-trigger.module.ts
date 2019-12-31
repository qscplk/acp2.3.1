import { ButtonModule, DropdownModule, IconModule } from '@alauda/ui';
import { NgModule } from '@angular/core';
import { MenuTriggerComponent } from '@app/shared/components/menu-trigger/menu-trigger.component';

@NgModule({
  imports: [ButtonModule, DropdownModule, IconModule],
  declarations: [MenuTriggerComponent],
  exports: [MenuTriggerComponent],
})
export class MenuTriggerModule {}
