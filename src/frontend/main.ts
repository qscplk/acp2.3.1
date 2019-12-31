import { recordInitUrl } from '@alauda/common-snippet';
import { enableProdMode } from '@angular/core';
import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';
import { setEnvironments } from '@app/app-global';
import { ajax } from 'rxjs/ajax';
import { retry } from 'rxjs/operators';

import { AppModule } from './app/app.module';
import { environment } from './environments/environment';

if (environment.production) {
  enableProdMode();
}

ajax
  .getJSON<Dictionary<unknown>>('api/v1/envs')
  .pipe(retry(3))
  .subscribe(envs => {
    setEnvironments(envs);

    recordInitUrl();
    platformBrowserDynamic()
      .bootstrapModule(AppModule)
      .catch(err => console.log(err));
  });
