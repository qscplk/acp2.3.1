import { TranslateService } from '@alauda/common-snippet';
import { Injectable } from '@angular/core';

@Injectable()
export class LocalImageIntl {
  changes = this.translate.locale$;

  get pipelineSelect() {
    return this.translate.get('select');
  }

  get pipelineSelectImage() {
    return this.translate.get('pipeline.select_image');
  }

  get pipelineSelectImagePlaceholder() {
    return this.translate.get('pipeline.select_image_placeholder');
  }

  get pipelineMethod() {
    return this.translate.get('pipeline.method');
  }

  get pipelineInput() {
    return this.translate.get('pipeline.input');
  }

  get pipelineConfirm() {
    return this.translate.get('confirm');
  }

  get cancel() {
    return this.translate.get('cancel');
  }

  get pipelineImageRepository() {
    return this.translate.get('image_repository');
  }

  get pipelineSelectOrInputImageTag() {
    return this.translate.get('pipeline.select_or_input_tag');
  }

  get pipelineImageRepositoryAddress() {
    return this.translate.get('image_address');
  }

  get pipelineInputRegistryAddressTip() {
    return this.translate.get('pipeline.please_input_repository_tag');
  }

  get pipelineDefaultRegistryTips() {
    return this.translate.get(
      'pipeline.if_not_provide_tag_then_tag_default_to_latest',
    );
  }

  get pipelineSecret() {
    return this.translate.get('secret');
  }

  get noData() {
    return this.translate.get('no_data');
  }

  get pipelineSecretAdd() {
    return this.translate.get('add_secret');
  }

  get pipelineImage() {
    return this.translate.get('image');
  }

  get pipelineNew() {
    return this.translate.get('pipeline.new');
  }

  get pipelineRepositoryAddress() {
    return this.translate.get('repository_address');
  }

  get pipelineTemplateVersionChange() {
    return this.translate.get('pipeline.version');
  }

  get pipelineAdd() {
    return this.translate.get('add');
  }

  get pipelineChange() {
    return this.translate.get('pipeline.modify');
  }

  constructor(private readonly translate: TranslateService) {}
}
