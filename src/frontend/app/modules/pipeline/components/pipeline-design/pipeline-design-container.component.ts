import {
  ChangeDetectionStrategy,
  Component,
  Input,
  OnChanges,
  SimpleChange,
} from '@angular/core';
import {
  CodeRepositoryModel,
  PipelineConfig,
  TemplateArgumentField,
  TemplateArgumentItem,
} from '@app/api';
import { toRepoModel } from '@app/api/pipeline/utils';
import { viewActions } from '@app/utils/code-editor-config';
import { flatMap, get } from 'lodash-es';

@Component({
  selector: 'alo-pipeline-design-container',
  templateUrl: './pipeline-design-container.component.html',
  styleUrls: ['./pipeline-design-container.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PipelineDesignContainerComponent implements OnChanges {
  @Input()
  pipelineConfig: PipelineConfig;

  type: string;
  source: { repo: CodeRepositoryModel; path: string; branch: string };
  creating: boolean;
  fields: TemplateArgumentItem[] = [];
  jenkinsfile: string;
  editorOptions = { language: 'Jenkinsfile', readOnly: true };
  actionsConfig = viewActions;
  globalSettings: string;

  ngOnChanges({ pipelineConfig }: { pipelineConfig: SimpleChange }) {
    if (pipelineConfig && pipelineConfig.currentValue) {
      this.onPipelineConfigChange(pipelineConfig.currentValue);
    }
  }

  private onPipelineConfigChange(pipelineConfig: PipelineConfig) {
    const multiBranchKind = 'multi-branch';

    const isMultiBranch =
      get(pipelineConfig, ['labels', 'pipeline.kind']) === multiBranchKind;

    this.type = isMultiBranch
      ? multiBranchKind
      : this.getSourcePath(pipelineConfig)
      ? 'repo'
      : 'script';

    this.source =
      ([multiBranchKind, 'repo'].includes(this.type) && {
        path: get(pipelineConfig, 'strategy.jenkins.jenkinsfilePath', ''),
        branch: isMultiBranch
          ? get(
              pipelineConfig,
              'strategy.jenkins.multiBranch.behaviours.filterExpression',
              '',
            )
          : this.getSourceBranch(pipelineConfig),
        repo: toRepoModel(pipelineConfig),
      }) ||
      null;

    this.jenkinsfile = get(pipelineConfig, 'strategy.jenkins.jenkinsfile');
    this.creating = get(pipelineConfig, 'status.phase') === 'Creating';
    this.fields = this.getFields(pipelineConfig);
    this.globalSettings = get(
      pipelineConfig,
      ['template', 'values', '_pipeline_'],
      '',
    ) as string;
  }

  private getFields(pipelineConfig: PipelineConfig) {
    const argumentList: TemplateArgumentField[] = get(
      pipelineConfig,
      'strategy.template.arguments',
      [],
    );
    return flatMap(argumentList, argument => argument.items);
  }

  trackField(index: number) {
    return index;
  }

  private getSourcePath(pipelineConfig: PipelineConfig) {
    return (
      get(pipelineConfig, 'source.git.uri', '') ||
      get(pipelineConfig, 'source.svn.uri') ||
      get(pipelineConfig, 'source.codeRepository.name', '')
    );
  }

  private getSourceBranch(pipelineConfig: PipelineConfig) {
    return (
      get(pipelineConfig, 'source.git.ref') ||
      get(pipelineConfig, 'source.svn.ref') ||
      get(pipelineConfig, 'source.codeRepository.ref', '')
    );
  }
}
