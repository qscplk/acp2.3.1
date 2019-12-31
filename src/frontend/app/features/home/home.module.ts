import { ButtonModule, PageModule } from '@alauda/ui';
import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { ProjectModule } from '../../modules/project';
import { SharedModule } from '../../shared';
import { GlobalActionsModule } from '../shared/global-actions';

import { HomeRoutingModule } from './home-routing.module';
import { HomeComponent } from './home.component';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    HomeRoutingModule,
    SharedModule,
    ButtonModule,
    GlobalActionsModule,
    ProjectModule,
    PageModule,
  ],
  declarations: [HomeComponent],
  providers: [],
})
export class HomeModule {}
