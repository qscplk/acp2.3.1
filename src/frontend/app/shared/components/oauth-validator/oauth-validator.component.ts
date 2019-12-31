import { TranslateService } from '@alauda/common-snippet';
import { DIALOG_DATA, DialogRef, NotificationService } from '@alauda/ui';
import { ChangeDetectionStrategy, Component, Inject } from '@angular/core';
import { SecretApiService } from '@app/api';
import { ToolKind } from '@app/api/tool-chain/utils';
import { Subject, of } from 'rxjs';
import {
  catchError,
  concatMap,
  delay,
  skipWhile,
  startWith,
  switchMap,
  take,
  tap,
  timeout,
} from 'rxjs/operators';

import { OAuthValidatorService } from './oauth-validator.service';

const WATCH_SECRET_DELAY = 2 * 1000;
const OAUTH_INTERACTIVE_TIMEOUT = 60 * 1000;

@Component({
  selector: 'alo-oauth-validator',
  templateUrl: './oauth-validator.component.html',
  styleUrls: ['./oauth-validator.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OAuthValidatorComponent {
  validating = false;

  constructor(
    private readonly validatorService: OAuthValidatorService,
    private readonly secretApi: SecretApiService,
    private readonly notifacation: NotificationService,
    private readonly translate: TranslateService,
    private readonly dialogRef: DialogRef<OAuthValidatorComponent>,
    @Inject(DIALOG_DATA)
    private readonly data: {
      url: string;
      namespace: string;
      secret: string;
      service: string;
      kind: ToolKind;
    },
  ) {}

  private watchSecret() {
    const { secret } = this.data;
    const fetchSecret$ = new Subject<void>();
    const [namespace, name] = (secret || '').split('/');

    return fetchSecret$.pipe(
      startWith(null),
      switchMap(() =>
        this.secretApi
          .get({
            namespace,
            name,
          })
          .pipe(catchError(() => of(null))),
      ),
      delay(WATCH_SECRET_DELAY),
      tap(res => {
        if (!res || !res.hasAccessToken) {
          fetchSecret$.next();
        }
      }),
      skipWhile(res => !res.hasAccessToken),
      take(1),
    );
  }

  validate() {
    this.validating = true;
    const { url, ...rest } = this.data;
    const sub = this.validatorService
      .validate(url)
      .pipe(
        concatMap(code => this.validatorService.callback({ ...rest, code })),
        concatMap(() => this.watchSecret()),
        take(1),
        timeout(OAUTH_INTERACTIVE_TIMEOUT),
      )
      .subscribe(
        () => {
          this.dialogRef.close(true);
          sub.unsubscribe();
        },
        (error: any) => {
          if (error.name === 'TimeoutError') {
            this.notifacation.error({
              title: this.translate.get('code.oauth_authorization_timeout'),
            });
          } else {
            this.notifacation.error({
              title: this.translate.get('code.oauth_validate_error'),
              content: error.error.error || error.error.message,
            });
          }

          this.dialogRef.close();
          sub.unsubscribe();
        },
      );
  }
}
