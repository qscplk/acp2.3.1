import { CodeEditorModule } from '@alauda/code-editor';
import {
  AsyncDataModule,
  DisabledContainerModule,
  UtilsModule,
  TranslateModule,
} from '@alauda/common-snippet';

import {
  AutocompleteModule,
  ButtonModule,
  CardModule,
  CheckboxModule,
  DialogModule,
  DropdownModule,
  FormModule,
  IconModule,
  InlineAlertModule,
  InputModule,
  PaginatorModule,
  RadioModule,
  SelectModule,
  SortModule,
  StatusBarModule,
  SwitchModule,
  TableModule,
  TabsModule,
  TagModule,
  TooltipModule,
  TreeSelectModule,
} from '@alauda/ui';
import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FlexLayoutModule } from '@angular/flex-layout';

import { ComponentsModule } from './components/components.module';
import { QualityGatePieModule } from './components/quality-gate-pie/quality-gate-pie.module';
import { DirectivesModule } from './directives/directives.module';
import { PipesModule } from './pipes/pipes.module';

const EXPORTABLE_IMPORTS = [
  // Vendor modules:
  CommonModule,
  TranslateModule,
  FlexLayoutModule,

  // AUI imports
  TableModule,
  SortModule,
  SwitchModule,
  AutocompleteModule,
  ButtonModule,
  CodeEditorModule,
  CardModule,
  InputModule,
  FormModule,
  TooltipModule,
  TagModule,
  SelectModule,
  RadioModule,
  DropdownModule,
  IconModule,
  InlineAlertModule,
  CheckboxModule,
  PaginatorModule,
  DialogModule,
  TreeSelectModule,
  TabsModule,
  StatusBarModule,

  // App shared modules:
  ComponentsModule,
  PipesModule,
  DirectivesModule,
  QualityGatePieModule,
];
const COMMON_MODULES = [UtilsModule, DisabledContainerModule, AsyncDataModule];

@NgModule({
  imports: [...EXPORTABLE_IMPORTS, ...COMMON_MODULES],
  exports: [...EXPORTABLE_IMPORTS, ...COMMON_MODULES],
})
export class SharedModule {}
