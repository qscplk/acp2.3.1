import { AlaudaMonacoProviderService } from '@alauda/code-editor';
import { Injectable } from '@angular/core';

import { syntaxDefinition } from './language.jenkinsfile';
const CODE_EDITOR_THEME_KEY = 'code-editor-theme';
@Injectable()
export class CustomMonacoProviderService extends AlaudaMonacoProviderService {
  initMonaco() {
    return super.initMonaco().then(() => {
      const { monaco } = window as any;
      monaco.languages.register({
        id: 'Jenkinsfile',
        aliases: ['Jenkinsfile'],
        extensions: ['.jenkinsfile'],
        mimetypes: ['text/plain'],
      });
      monaco.languages.setMonarchTokensProvider(
        'Jenkinsfile',
        syntaxDefinition,
      );

      this.changeTheme(localStorage.getItem(CODE_EDITOR_THEME_KEY));
    });
  }
  changeTheme(theme: string) {
    super.changeTheme(theme);
    localStorage.setItem(CODE_EDITOR_THEME_KEY, theme);
  }
}
