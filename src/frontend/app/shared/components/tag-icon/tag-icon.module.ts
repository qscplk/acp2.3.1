import { IconModule } from '@alauda/ui';
import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { TagIconComponent } from '@app/shared/components/tag-icon/tag-icon.component';

@NgModule({
  imports: [CommonModule, IconModule],
  declarations: [TagIconComponent],
  exports: [TagIconComponent],
})
export class TagIconModule {}
