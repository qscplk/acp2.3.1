import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';

import { DurationPipe } from './duration.pipe';
import { MapValuesPipe } from './mapValue.pipe';
import { PurePipe } from './pure.pipe';
import { SIPrefixPipe } from './si-prefix.pipe';

@NgModule({
  imports: [CommonModule],
  declarations: [PurePipe, DurationPipe, MapValuesPipe, SIPrefixPipe],
  exports: [PurePipe, DurationPipe, MapValuesPipe, SIPrefixPipe],
})
export class PipesModule {}
