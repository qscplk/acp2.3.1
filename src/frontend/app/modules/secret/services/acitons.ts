import { TranslateService } from '@alauda/common-snippet';
import {
  ConfirmType,
  DialogService,
  DialogSize,
  MessageService,
  NotificationService,
} from '@alauda/ui';
import { Injectable } from '@angular/core';
import { Secret, SecretApiService, SecretIdentity, SecretType } from '@app/api';
import { ToolChainApiService } from '@app/api/tool-chain/tool-chain-api.service';
import { flatMap } from 'lodash-es';
import { Observable, Subject, of } from 'rxjs';
import { catchError, map, switchMap, take } from 'rxjs/operators';

import { SecretCreateDialogComponent } from '../components/create-dialog/create-dialog.component';
import { SecretUpdateDataDialogComponent } from '../components/update-dialog/update-data-dialog.component';
import { SecretUpdateDisplayNameDialogComponent } from '../components/update-dialog/update-display-name-dialog.component';

@Injectable()
export class SecretActions {
  constructor(
    private readonly dialog: DialogService,
    private readonly notification: NotificationService,
    private readonly message: MessageService,
    private readonly translate: TranslateService,
    private readonly secretApi: SecretApiService,
    private readonly toolChainApi: ToolChainApiService,
  ) {}

  create(types: string[], tips: string, namespace = ''): Observable<Secret> {
    return this.dialog
      .open(SecretCreateDialogComponent, {
        size: DialogSize.Medium,
        data: { types, tips, namespace },
      })
      .afterClosed()
      .pipe(
        map((result: any) => {
          if (!result) {
            return null;
          }

          return result;
        }),
        take(1),
      );
  }

  // TODO: for toolchain separated in multi modules now, place this method in secret module
  createForToolChain(
    toolKind: string,
    toolType: string,
    secretType: SecretType,
    namespace = '',
  ) {
    return this.getToolChainSecretTips(toolKind, toolType, secretType).pipe(
      catchError(() => {
        return of(null);
      }),
      switchMap(tips => this.create([secretType], tips, namespace)),
    );
  }

  updateDisplayName(secret: SecretIdentity): Observable<boolean> {
    return this.dialog
      .open(SecretUpdateDisplayNameDialogComponent, {
        size: DialogSize.Medium,
        data: secret,
      })
      .afterClosed()
      .pipe(
        map((result: any) => {
          if (!result) {
            return false;
          }

          return true;
        }),
        take(1),
      );
  }

  updateData(secret: SecretIdentity): Observable<boolean> {
    return this.dialog
      .open(SecretUpdateDataDialogComponent, {
        size: DialogSize.Medium,
        data: secret,
      })
      .afterClosed()
      .pipe(
        map((result: any) => {
          if (!result) {
            return false;
          }

          return true;
        }),
        take(1),
      );
  }

  delete(secret: SecretIdentity): Observable<boolean> {
    const result$ = new Subject<boolean>();

    this.dialog
      .confirm({
        title: this.translate.get('secret.delete_confirm', {
          name: secret.name,
        }),
        confirmType: ConfirmType.Danger,
        confirmText: this.translate.get('delete'),
        cancelText: this.translate.get('cancel'),
        beforeConfirm: (resolve, reject) =>
          this.secretApi.delete(secret.namespace, secret.name).subscribe(
            () => {
              this.message.success(this.translate.get('secret.delete_succ'));
              result$.next(true);
              resolve();
            },
            (error: any) => {
              this.notification.error({
                title: this.translate.get('secret.delete_fail'),
                content: error.error.error || error.error.message,
              });
              reject();
            },
          ),
      })
      .catch(() => {
        result$.next(false);
      });

    return result$.pipe(take(1));
  }

  private getToolChainSecretTips(
    toolKind: string,
    toolType: string,
    secretType: SecretType,
  ): Observable<string> {
    return this.toolChainApi.getToolChains().pipe(
      map(toolKinds => {
        const tool = flatMap(toolKinds, kind => kind.items).find(
          item =>
            item.kind.toLowerCase() === toolKind.toLowerCase() &&
            item.type.toLowerCase() === toolType.toLowerCase(),
        );

        const secretConfig = (tool.supportedSecretTypes || []).find(
          item => item.secretType === secretType,
        );

        return this.translate.locale === 'en'
          ? secretConfig.description.en
          : secretConfig.description.zh;
      }),
    );
  }
}
