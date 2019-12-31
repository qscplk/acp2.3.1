import { DialogService, DialogSize } from '@alauda/ui';
import { Injectable } from '@angular/core';
import { Secret, SecretType } from '@app/api';
import { get } from 'lodash-es';
import { Observable } from 'rxjs';
import { map, take } from 'rxjs/operators';

import { ConfigSecretCreateDialogComponent } from '../components/secret-create-dialog/secret-create-dialog.component';

@Injectable()
export class ConfigSecretActions {
  constructor(private dialog: DialogService) {}

  create(
    cluster: string,
    namespace: string,
    types: SecretType[],
  ): Observable<Secret> {
    return this.dialog
      .open(ConfigSecretCreateDialogComponent, {
        size: DialogSize.Large,
        data: {
          cluster,
          namespace,
          types,
        },
      })
      .afterClosed()
      .pipe(
        map((result: any) => {
          if (!result) {
            return null;
          }
          return {
            ...result,
            namespace: get(result, 'objectMeta.namespace'),
            name: get(result, 'objectMeta.name'),
          };
        }),
        take(1),
      );
  }
}
