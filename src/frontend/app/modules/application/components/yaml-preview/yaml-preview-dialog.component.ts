import { DIALOG_DATA, DialogRef } from '@alauda/ui';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  Inject,
  OnInit,
} from '@angular/core';
import { safeDump } from 'js-yaml';

@Component({
  templateUrl: './yaml-preview-dialog.component.html',
  styleUrls: ['./yaml-preview-dialog.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ResourceYamlPreviewDialogComponent implements OnInit {
  editorOptions = { language: 'yaml', readOnly: true };
  currentYaml = '';
  originalYaml = '';

  constructor(
    private cdr: ChangeDetectorRef,
    private dialogRef: DialogRef,
    @Inject(DIALOG_DATA)
    public data: {
      originalYaml: string;
      currentYaml: any;
    },
  ) {}

  ngOnInit() {
    this.originalYaml = this.data.originalYaml;
    this.currentYaml = safeDump(this.data.currentYaml);
    this.cdr.detectChanges();
  }

  cancel() {
    this.dialogRef.close();
  }
}
