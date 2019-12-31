import { TranslateService } from '@alauda/common-snippet';
import { DIALOG_DATA, NotificationService } from '@alauda/ui';
import { Component, Inject, OnInit } from '@angular/core';
import {
  PipelineApiService,
  PipelineConfigTemplate,
  PipelineTemplate,
} from '@app/api';
import { stringifyEach } from '@app/modules/pipeline/utils';
import { viewActions } from '@app/utils/code-editor-config';
import { API_GROUP_VERSION } from '@app/constants';

@Component({
  templateUrl: './preview-jenkinsfile.component.html',
})
export class PreviewJenkinsfileComponent implements OnInit {
  editorOptions = { language: 'Jenkinsfile', readOnly: true };
  actionsConfig = viewActions;
  template: PipelineTemplate & PipelineConfigTemplate;
  postData: any;
  project: string;
  mode: string;
  pipelineConfigName: string;
  jenkinsfilePreview: string;
  constructor(
    @Inject(DIALOG_DATA) private readonly data: any,
    private readonly api: PipelineApiService,
    private readonly translate: TranslateService,
    private readonly notification: NotificationService,
  ) {
    this.template = this.data.template;
    this.postData = stringifyEach(this.data.postData);
    this.project = this.data.project;
    this.mode = this.data.mode;
    this.pipelineConfigName = this.data.pipelineConfigName || '';
  }

  ngOnInit() {
    const mode = this.mode;
    const templateName =
      this.template.name || this.template.pipelineTemplateRef.name;
    const kind = this.template.kind || this.template.pipelineTemplateRef.kind;
    const pipelineConfigName = this.pipelineConfigName;
    const previewParams = {
      mode,
      templateName,
      kind,
      pipelineConfigName,
    };
    this.api
      .previewPipelineJenkinsfile(this.project, previewParams, {
        kind: 'JenkinsfilePreviewOptions',
        apiVersion: API_GROUP_VERSION,
        values: this.postData,
      })
      .subscribe(
        (res: string) => {
          this.jenkinsfilePreview = res;
        },
        (error: any) => {
          this.notification.error({
            title: this.translate.get('error'),
            content: error.error.error || error.error.message,
          });
        },
      );
  }
}
