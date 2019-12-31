import { TemplatePortal } from '@angular/cdk/portal';
import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import {
  debounceTime,
  publishReplay,
  refCount,
  shareReplay,
} from 'rxjs/operators';

/**
 * Provides a holder for UI templates to be used globally.
 */
export class TemplateHolder {
  private templatePortalSubject = new BehaviorSubject<TemplatePortal<any>>(
    undefined,
  );
  templatePortal$ = this.templatePortalSubject.pipe(
    debounceTime(0),
    shareReplay(1),
  );

  setTemplatePortal(templatePortal: TemplatePortal<any>) {
    this.templatePortalSubject.next(templatePortal);
  }
}

export enum TemplateHolderType {
  PageHeaderContent = 'PageHeaderContent',
}

/**
 * Acts as a general ui state store
 */
@Injectable()
export class UiStateService {
  private _showLoadingBar$ = new BehaviorSubject<boolean>(false);

  private _templateHolders = new Map<TemplateHolderType, TemplateHolder>();

  showLoadingBar$ = this._showLoadingBar$.pipe(
    debounceTime(0),
    publishReplay(1),
    refCount(),
  );

  private regiserTemplateHolder(id: TemplateHolderType) {
    if (this._templateHolders.has(id)) {
      throw new Error(`Template holder for ${id} has already registered!`);
    }
    this._templateHolders.set(id, new TemplateHolder());
  }

  // Will init template holder if not initialzed yet
  getTemplateHolder(id: TemplateHolderType) {
    if (!this._templateHolders.has(id)) {
      this.regiserTemplateHolder(id);
    }

    return this._templateHolders.get(id);
  }

  setLoading(flag: boolean) {
    this._showLoadingBar$.next(flag);
  }
}
