import {
  ImageIntl,
  ImageModule,
  PipelineDiagramModule,
} from '@alauda/common-snippet';
import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { PipelineApiService } from '@app/api/pipeline/pipeline-api.service';
import { ConfigSecretModule } from '@app/modules/config-secret';
import { SecretModule } from '@app/modules/secret';
import { SharedModule } from '@app/shared';
import { DynamicFormsModule } from 'alauda-ui-dynamic-forms';

import { BasicInfoComponent } from './components/basic-info/basic-info.component';
import { PipelineCreateContainerComponent } from './components/create/pipeline-create-container.component';
import {
  PipelineBasicFormComponent,
  PipelineCodeChangeTriggerFormComponent,
  PipelineCronTriggerFormComponent,
  PipelineCronTriggerSelectorComponent,
  PipelineRepositoryFormComponent,
  PipelineScriptFormComponent,
  TriggerTimeSelectorComponent,
} from './components/forms';
import { PipelineDynamicParameterFormComponent } from './components/forms/parameters/parameters.component';
import { PipelineTemplateSelectFormComponent } from './components/forms/template-select/template-select.component';
import { GlobalSettingDialogComponent } from './components/global-setting-dialog/global-setting-dialog.component';
import { PipelineHistoriesComponent } from './components/histories/histories.component';
import { PipelineHistoryBasicInfoComponent } from './components/history-basic-info/history-basic-info.component';
import { PipelineHistoryDetailLogComponent } from './components/history-detail-log/history-detail-log.component';
import { HistoryPreviewComponent } from './components/history-preview/history-preview.component';
import { PipelineHistoryStepInputDialogComponent } from './components/history-step-input-dialog/history-step-input-dialog.component';
import { PipelineHistoryStepComponent } from './components/history-step/history-step.component';
import { PipelineHistoryTableComponent } from './components/history-table/history-table.component';
import { PipelineHistoryTestReportLogComponent } from './components/history-test-report-log/history-test-report-log.component';
import { PipelineHistoryTestReportComponent } from './components/history-test-report/history-test-report.component';
import { LogsComponent } from './components/logs/logs.component';
import { ModeSelectComponent } from './components/mode-select/mode-select.component';
import { PipelineParameterTriggerComponent } from './components/parameter-trigger/parameter-trigger.component';
import { PipelineParametersInputFormComponent } from './components/parameters-input-form/parameters-input-form.component';
import { PipelineBranchesComponent } from './components/pipeline-branches/pipeline-branches.component';
import { PipelineGlobalSettingComponent } from './components/pipeline-design/global-setting/global-setting.component';
import { PipelineDesignParametersComponent } from './components/pipeline-design/parameters/parameters.component';
import { PipelineDesignContainerComponent } from './components/pipeline-design/pipeline-design-container.component';
import { PipelineDesignSourceComponent } from './components/pipeline-design/source/pipeline-design-source.component';
import { PipelineListComponent } from './components/pipeline-list/pipeline-list.component';
import { PreviewJenkinsfileComponent } from './components/preview-jenkinsfile/preview-jenkinsfile.component';
import { RepositorySelectorComponent } from './components/repository-selector/repository-selector.component';
import { ScanLogsComponent } from './components/scan-logs/scan-logs.component';
import { StepsComponent } from './components/steps/steps.component';
import { PipelineTemplateBasicInfoComponent } from './components/template/basic-info/pipeline-template-basic-info.component';
import { PipelineTemplateDetailParameterTableComponent } from './components/template/detail-parameter-table/pipeline-template-detail-parameter-table.component';
import { PipelineTemplateDetailComponent } from './components/template/detail/pipeline-template-detail.component';
import { PipelineTemplateListCardComponent } from './components/template/list-card/pipeline-template-list-card.component';
import { PipelineTemplateListContainerComponent } from './components/template/list-container/list-container.component';
import { PipelineTemplateListComponent } from './components/template/list/pipeline-template-list.component';
import { PipelineTemplateComponent } from './components/template/pipeline-template/pipeline-template.component';
import { PipelineTemplateSettingComponent } from './components/template/setting/pipeline-template-setting.component';
import { PipelineTemplateSyncReportComponent } from './components/template/sync-report/pipeline-template-sync-report.component';
import { PipelineUpdateContainerComponent } from './components/update/pipeline-update-container.component';
import {
  PipelineVisualEditorComponent,
  PipelineVisualEditorDiagramComponent,
  PipelineVisualEditorParallelComponent,
  PipelineVisualEditorSettingsComponent,
  PipelineVisualEditorStageComponent,
  PipelineVisualEditorTaskSelectComponent,
} from './components/visual-editor';
import { LocalImageIntl } from './local-image-intl';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterModule,
    SharedModule,
    PipelineDiagramModule,
    SecretModule,
    ConfigSecretModule,
    DynamicFormsModule,
    ImageModule,
  ],
  declarations: [
    PipelineListComponent,
    HistoryPreviewComponent,
    LogsComponent,
    ModeSelectComponent,
    PipelineCreateContainerComponent,
    StepsComponent,
    PipelineBasicFormComponent,
    PipelineRepositoryFormComponent,
    PipelineCodeChangeTriggerFormComponent,
    PipelineCronTriggerFormComponent,
    TriggerTimeSelectorComponent,
    PipelineScriptFormComponent,
    PipelineCronTriggerSelectorComponent,
    RepositorySelectorComponent,
    PipelineUpdateContainerComponent,
    PipelineListComponent,
    HistoryPreviewComponent,
    LogsComponent,
    ScanLogsComponent,
    BasicInfoComponent,
    PipelineHistoryTableComponent,
    PipelineHistoriesComponent,
    PipelineDesignContainerComponent,
    PipelineDesignSourceComponent,
    PipelineHistoryDetailLogComponent,
    PipelineHistoryBasicInfoComponent,
    PipelineHistoryStepComponent,
    PipelineHistoryStepInputDialogComponent,
    PipelineParametersInputFormComponent,
    PipelineTemplateSettingComponent,
    PipelineTemplateListComponent,
    PipelineTemplateDetailComponent,
    PipelineTemplateBasicInfoComponent,
    PipelineTemplateComponent,
    PipelineTemplateListCardComponent,
    PipelineTemplateSyncReportComponent,
    PipelineTemplateDetailParameterTableComponent,
    PipelineParameterTriggerComponent,
    PipelineDynamicParameterFormComponent,
    PipelineTemplateSelectFormComponent,
    PipelineTemplateListContainerComponent,
    PipelineDesignParametersComponent,
    PipelineGlobalSettingComponent,
    PreviewJenkinsfileComponent,
    PipelineBranchesComponent,
    PipelineHistoryTestReportComponent,
    PipelineHistoryTestReportLogComponent,
    PipelineVisualEditorComponent,
    PipelineVisualEditorDiagramComponent,
    PipelineVisualEditorSettingsComponent,
    PipelineVisualEditorTaskSelectComponent,
    PipelineVisualEditorStageComponent,
    PipelineVisualEditorParallelComponent,
    GlobalSettingDialogComponent,
  ],
  exports: [
    PipelineListComponent,
    ModeSelectComponent,
    PipelineCreateContainerComponent,
    RepositorySelectorComponent,
    PipelineUpdateContainerComponent,
    LogsComponent,
    ScanLogsComponent,
    BasicInfoComponent,
    PipelineHistoriesComponent,
    PipelineDesignContainerComponent,
    PipelineHistoryDetailLogComponent,
    PipelineHistoryBasicInfoComponent,
    PipelineTemplateSettingComponent,
    PipelineTemplateListComponent,
    PipelineTemplateDetailComponent,
    PipelineTemplateBasicInfoComponent,
    PipelineTemplateComponent,
    PipelineTemplateListCardComponent,
    PipelineTemplateSyncReportComponent,
    PipelineTemplateDetailParameterTableComponent,
    PipelineParameterTriggerComponent,
    PipelineBranchesComponent,
    PipelineHistoryTestReportComponent,
    PipelineHistoryTestReportLogComponent,
    PipelineParametersInputFormComponent,
    PipelineVisualEditorComponent,
    GlobalSettingDialogComponent,
  ],
  providers: [
    PipelineApiService,
    { provide: ImageIntl, useClass: LocalImageIntl },
  ],
  entryComponents: [
    ModeSelectComponent,
    RepositorySelectorComponent,
    LogsComponent,
    ScanLogsComponent,
    PipelineTemplateSettingComponent,
    PipelineTemplateDetailComponent,
    PipelineTemplateSyncReportComponent,
    PipelineParameterTriggerComponent,
    PreviewJenkinsfileComponent,
    PipelineHistoryStepInputDialogComponent,
    GlobalSettingDialogComponent,
  ],
})
export class PipelineModule {}
