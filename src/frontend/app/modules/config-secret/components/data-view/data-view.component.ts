import { TranslateService } from '@alauda/common-snippet';
import {
  Component,
  Input,
  OnChanges,
  OnInit,
  SimpleChanges,
} from '@angular/core';
import { Observable, fromEvent } from 'rxjs';
import { map, startWith } from 'rxjs/operators';

@Component({
  selector: 'alo-configsecret-data-viewer',
  templateUrl: './data-view.component.html',
  styleUrls: ['./data-view.component.scss'],
})
export class ConfigSecretDataViwerComponent implements OnInit, OnChanges {
  @Input()
  data: { [key: string]: string };

  @Input()
  type: string;

  pageScroll$: Observable<number>;

  configs: Array<[string, string]> = [];
  dockerConfigData: {
    dockerServiceAddress: string;
    username: string;
    password: string;
    email: string;
  };

  constructor(private readonly translate: TranslateService) {}

  ngOnInit(): void {
    const layoutPageEl = document.querySelector('.aui-layout__page');
    this.pageScroll$ = fromEvent(layoutPageEl, 'scroll').pipe(
      startWith({}),
      map(() => layoutPageEl.scrollTop),
    );
  }

  ngOnChanges({ data }: SimpleChanges) {
    if (data) {
      this.configs = Object.entries(this.data || {});
      if (this.type === 'kubernetes.io/dockerconfigjson') {
        const auths = JSON.parse(this.decode(this.data['.dockerconfigjson']))
          .auths;
        const dockerServiceAddress = Object.keys(auths)[0];
        const authData = auths[dockerServiceAddress];
        this.dockerConfigData = {
          dockerServiceAddress,
          username: authData.username,
          password: authData.password,
          email: authData.email,
        };
      }
    }
  }

  getDisplayKey(key: string) {
    switch (key) {
      case 'tls.crt':
        return this.translate.get('configsecret.ca');
      case 'tls.key':
        return this.translate.get('configsecret.private_key');
      case 'ssh-privatekey':
        return this.translate.get('configsecret.ssh-privatekey');
      default:
        return key;
    }
  }

  handleTocLink(tocLink: string) {
    return tocLink.replace(/\./g, '_');
  }

  decode(s: string): string {
    return atob(s || '');
  }
}
