import { ThemeService } from '@alauda/theme';
import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';

import { OAuthValidatorService } from './shared/components/oauth-validator';

@Component({
  selector: 'alo-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppComponent implements OnInit {
  constructor(
    private readonly oauthSecretValidator: OAuthValidatorService,
    themeService: ThemeService,
  ) {
    themeService.subscribePlatformTheme();
  }

  ngOnInit() {
    const queryParams = getParams(window.location.search);
    if (
      ['true', '1'].includes(
        (queryParams.is_secret_validate || '').trim().toLowerCase(),
      )
    ) {
      this.oauthSecretValidator.transportCode(queryParams.code);
    }
  }
}

function getParams(search: string): { [name: string]: string } {
  if (!search) {
    return {};
  }
  const queryString = search.substr(1);
  if (!queryString) {
    return {};
  }

  return queryString.split('&').reduce((accum: any, segment: string) => {
    if (!segment) {
      return accum;
    }
    const [key, value] = segment.split('=');
    if (!key) {
      return accum;
    }
    return {
      ...accum,
      [key]: value,
    };
  }, {});
}
