import {
  AuthorizationStateService,
  CommonLayoutStoreService,
} from '@alauda/common-snippet';
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { map, publishReplay, refCount, startWith } from 'rxjs/operators';

@Component({
  selector: 'alo-no-namespace-page',
  templateUrl: 'no-namespace-page.component.html',
  styleUrls: ['no-namespace-page.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NoNamespacePageComponent {
  // TODO: auth change, fix later
  isAdmin$ = this.auth.getTokenPayload<{ ext: { is_admin: boolean } }>().pipe(
    map(payload => payload && payload.ext.is_admin),
    startWith(false),
    publishReplay(1),
    refCount(),
  );

  constructor(
    private readonly auth: AuthorizationStateService,
    private readonly layoutStore: CommonLayoutStoreService,
  ) {}

  navigateToProject() {
    this.layoutStore
      .selectProductByName('console-platform')
      .subscribe((product: any) => {
        if (product) {
          window.open(`${product.url}#/home`, '_blank');
        }
      });
  }
}
