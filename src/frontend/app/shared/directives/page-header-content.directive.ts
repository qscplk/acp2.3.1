import { TemplatePortal } from '@angular/cdk/portal';
import {
  Directive,
  OnDestroy,
  OnInit,
  TemplateRef,
  ViewContainerRef,
} from '@angular/core';

import {
  TemplateHolder,
  TemplateHolderType,
  UiStateService,
} from '../../services';

/**
 * Dynamically change page header content based on active template.
 *
 * Usage:
 * If you want to customize a page header, wrap a template with *rcPageHeaderContent.
 *
 * eg:
 * <ng-container *alkPageHeaderContent>
 *   ... YOUR TEMPLATE CONTENT
 * </ng-container>
 */
@Directive({
  selector: '[aloPageHeaderContent]',
})
export class PageHeaderContentDirective implements OnInit, OnDestroy {
  templateHolder: TemplateHolder;

  constructor(
    private templateRef: TemplateRef<any>,
    private viewContainerRef: ViewContainerRef,
    private uiState: UiStateService,
  ) {
    this.templateHolder = this.uiState.getTemplateHolder(
      TemplateHolderType.PageHeaderContent,
    );
  }

  ngOnInit() {
    const portal = new TemplatePortal(this.templateRef, this.viewContainerRef);
    this.templateHolder.setTemplatePortal(portal);
  }

  ngOnDestroy(): void {}
}
