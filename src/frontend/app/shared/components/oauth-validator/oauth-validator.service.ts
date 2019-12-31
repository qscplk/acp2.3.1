import { HttpClient } from '@angular/common/http';
import { Injectable, NgZone } from '@angular/core';
import { ToolKind } from '@app/api/tool-chain/utils';
import { Observable, Subject } from 'rxjs';
import { take, tap } from 'rxjs/operators';

@Injectable()
export class OAuthValidatorService {
  private secretValidateCode$ = new Subject<string>();

  constructor(private http: HttpClient, private ngZone: NgZone) {
    (window as any).acceptCode = (code: string) => {
      this.ngZone.run(() => {
        this.secretValidateCode$.next(code);
      });
    };
  }

  transportCode(code: string): void {
    if (window.opener && window.opener.acceptCode) {
      window.opener.acceptCode(code);
    }
  }

  validate(url: string): Observable<string> {
    const validateWindow = window.open(url, '_blank');
    return this.secretValidateCode$.pipe(
      take(1),
      tap(() => {
        validateWindow.close();
      }),
    );
  }

  callback(params: {
    namespace: string;
    secret: string;
    service: string;
    kind: ToolKind;
    code: string;
  }) {
    return this.http.get(
      `{{API_GATEWAY}}/devops/api/callback/oauth/${params.namespace}/secret/${
        params.secret
      }/${params.kind}/${params.service}?code=${params.code}`,
    );
  }
}
