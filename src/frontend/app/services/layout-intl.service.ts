import { TranslateService } from '@alauda/common-snippet';
import { Injectable } from '@angular/core';

@Injectable()
export class LayoutIntlService {
  changes = this.translate.locale$;

  get namespace() {
    return this.translate.get('namespace');
  }

  get filterByNamePlaceholder() {
    return this.translate.get('filter_by_name');
  }

  get noAvailableNamespaces() {
    return this.translate.get('no_namespace');
  }

  get product() {
    return this.translate.get('product');
  }

  get project() {
    return this.translate.get('project');
  }

  get noResult() {
    return this.translate.get('no_result');
  }

  get switchProduct() {
    return this.translate.get('switch_product');
  }

  constructor(private readonly translate: TranslateService) {}
}
