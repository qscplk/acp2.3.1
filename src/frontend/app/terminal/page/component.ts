import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnDestroy,
  OnInit,
  ViewChild,
} from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { TerminalPageParams } from '@app/api';
import { Subscription } from 'rxjs';
import { findNext, findPrevious } from 'xterm/lib/addons/search/search';

import { ShellComponent } from '../../shared/components/shell/shell.component';

@Component({
  selector: 'alo-terminal-page',
  templateUrl: './template.html',
  styleUrls: ['./style.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TerminalPageComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild(ShellComponent, { static: true })
  shell: ShellComponent;

  params: TerminalPageParams;
  isFindbarActive = false;
  searchQuery = '';

  private keySub: Subscription;

  constructor(
    private activatedRoute: ActivatedRoute,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.params = this.activatedRoute.snapshot.params as TerminalPageParams;
  }

  ngAfterViewInit(): void {
    // Capturing Ctrl keyboard events in Javascript
    window.addEventListener('keydown', event => {
      this.onKeyEvent(event);
    });

    this.keySub = this.shell.keyEvent$.subscribe(event => {
      this.onKeyEvent(event);
    });
  }

  ngOnDestroy() {
    this.keySub.unsubscribe();
  }

  get isDarkTheme() {
    return this.shell && this.shell.isDarkTheme;
  }

  onKeyEvent(event: KeyboardEvent) {
    if ((event.metaKey || event.ctrlKey) && event.code === 'KeyF') {
      event.preventDefault();
      event.stopPropagation();
      this.toggleFindPanel();
    }
  }

  toggleFindPanel() {
    this.isFindbarActive = !this.isFindbarActive;
    this.searchQuery = '';
    this.cdr.markForCheck();
  }

  findPrevious(query: string) {
    findPrevious(this.shell.term, query, null);
  }

  findNext(query: string) {
    findNext(this.shell.term, query);
  }
}
