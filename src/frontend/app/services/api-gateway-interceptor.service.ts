import { ApiGatewayService } from '@alauda/common-snippet';
import {
  HttpErrorResponse,
  HttpEvent,
  HttpHandler,
  HttpInterceptor,
  HttpRequest,
} from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { catchError, concatMap, take } from 'rxjs/operators';

@Injectable()
export class ApiGatewayInterceptor implements HttpInterceptor {
  constructor(private apiGateway: ApiGatewayService) {}

  intercept(
    req: HttpRequest<any>,
    next: HttpHandler,
  ): Observable<HttpEvent<any>> {
    if (!req.url.startsWith('{{API_GATEWAY}}')) {
      return next.handle(req);
    }

    return this.apiGateway
      .getApiAddress()
      .pipe(
        take(1),
        concatMap(apiAddress => {
          return next.handle(
            req.clone({
              url: req.url.replace('{{API_GATEWAY}}', apiAddress),
            }),
          );
        }),
      )
      .pipe(
        catchError((error: HttpErrorResponse) => {
          return throwError(error);
        }),
      );
  }
}
