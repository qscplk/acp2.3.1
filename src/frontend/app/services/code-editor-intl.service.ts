import { CodeEditorIntl } from '@alauda/code-editor';
import { Injectable } from '@angular/core';

@Injectable()
export class CustomCodeEditorIntlService extends CodeEditorIntl {
  getLanguageLabel(lang: string) {
    if (lang && lang.toLowerCase() === 'jenkinsfile') {
      return 'Jenkinsfile';
    }
    return super.getLanguageLabel(lang);
  }
}
