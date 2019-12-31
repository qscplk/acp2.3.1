import { TranslateService } from '@alauda/common-snippet';
import { Injectable } from '@angular/core';

@Injectable()
export class CustomTooltipIntlService {
  constructor(private readonly translate: TranslateService) {}
  get copyTip() {
    return this.translate.get('copy_tooltip_click_to_copy');
  }

  get copySuccessTip() {
    return this.translate.get('copy_tooltip_copy_succeeded');
  }

  get copyFailTip() {
    return this.translate.get('copy_tooltip_copy_faield');
  }
}
