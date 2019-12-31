import { CodeEditorIntl } from '@alauda/code-editor';
import { DIALOG_DATA, DialogRef, DialogService, DialogSize } from '@alauda/ui';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  EventEmitter,
  Inject,
  Input,
  NgZone,
  OnChanges,
  OnInit,
  Optional,
  Output,
} from '@angular/core';
import { MonacoProviderService } from 'ng-monaco-editor';

@Component({
  selector: 'alo-log-view',
  templateUrl: 'log-view.component.html',
  styleUrls: ['log-view.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LogViewComponent implements OnInit, OnChanges {
  @Input()
  logs: string;
  @Input()
  range: string;
  @Input()
  loading = false;
  @Input()
  paginated = false;
  @Input()
  pullEnabled = false;
  @Input()
  pullToggleEnabled = false;
  @Input()
  downloadEnabled = false;
  @Input()
  dialogEmbedded = false;
  @Output()
  pageChange = new EventEmitter<'oldest' | 'older' | 'newer' | 'newest'>();
  @Output()
  pullEnabledChange = new EventEmitter<boolean>();
  @Output()
  downloadAction = new EventEmitter<void>();

  editor: monaco.editor.IStandaloneCodeEditor;

  monacoOptions: monaco.editor.IEditorConstructionOptions = {
    wordWrap: 'on',
    readOnly: true,
    renderLineHighlight: 'none',
  };

  fullscreenDialog: DialogRef<LogViewComponent> = null;

  constructor(
    private zone: NgZone,
    private dialog: DialogService,
    public cdr: ChangeDetectorRef,
    public monacoProvider: MonacoProviderService,
    public intl: CodeEditorIntl,
    @Optional() private dialogRef: DialogRef<LogViewComponent>,
    @Optional()
    @Inject(DIALOG_DATA)
    public source: LogViewComponent,
  ) {}

  ngOnInit() {
    if (this.source && this.source instanceof LogViewComponent) {
      this.logs = this.source.logs;
      this.range = this.source.range;
      this.loading = this.source.loading;
      this.paginated = this.source.paginated;
      this.pullEnabled = this.source.pullEnabled;
      this.pullToggleEnabled = this.source.pullToggleEnabled;
      this.downloadEnabled = this.source.downloadEnabled;
      this.pageChange = this.source.pageChange;
      this.pullEnabledChange = this.source.pullEnabledChange;
      this.downloadAction = this.source.downloadAction;
    }
  }

  ngOnChanges() {
    if (this.fullscreenDialog) {
      this.fullscreenDialog.componentInstance.logs = this.logs;
      this.fullscreenDialog.componentInstance.range = this.range;
      this.fullscreenDialog.componentInstance.loading = this.loading;
      this.fullscreenDialog.componentInstance.paginated = this.paginated;
      this.fullscreenDialog.componentInstance.pullEnabled = this.pullEnabled;
      this.fullscreenDialog.componentInstance.pullToggleEnabled = this.pullToggleEnabled;
      this.fullscreenDialog.componentInstance.downloadEnabled = this.downloadEnabled;
      this.fullscreenDialog.componentInstance.cdr.detectChanges();
    }
  }

  search() {
    this.checkActionAndRun('actions.find');
  }

  toggleFullscreen() {
    if (this.dialogRef && !this.dialogEmbedded) {
      this.dialogRef.close();
    } else {
      this.fullscreenDialog = this.dialog.open(LogViewComponent, {
        size: DialogSize.Fullscreen,
        data: this,
      });
      this.fullscreenDialog.afterClosed().subscribe(() => {
        this.fullscreenDialog = null;
        this.cdr.detectChanges();
      });
    }
  }

  loadOldest() {
    this.emitPageChange('oldest');
  }

  loadNewest() {
    this.emitPageChange('newest');
  }

  loadOlder() {
    this.emitPageChange('older');
  }

  loadNewer() {
    this.emitPageChange('newer');
  }

  togglePullEnabled(enabled: boolean) {
    if (!this.pullToggleEnabled) {
      return;
    }
    this.pullEnabledChange.emit(enabled);
  }

  download() {
    this.downloadAction.emit();
  }

  onMonacoEditorChanged(editor: monaco.editor.IStandaloneCodeEditor) {
    this.editor = editor;
    this.scrollToBottom();
  }

  private checkActionAndRun(actionName: string) {
    const action = this.getEditorAction(actionName);
    return action && action.run();
  }

  private getEditorAction(actionName: string) {
    return this.editor && this.editor.getAction(actionName);
  }

  private scrollToBottom() {
    this.zone.runOutsideAngular(() => {
      setTimeout(() => {
        if (this.editor && this.logs) {
          const length = this.logs.split('\n').length;
          this.editor.revealLine(length);
        }
      });
    });
  }

  private emitPageChange(direction: 'oldest' | 'newest' | 'older' | 'newer') {
    if (!this.paginated) {
      return;
    }

    this.pageChange.emit(direction);
  }
}
