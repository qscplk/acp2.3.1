import { CodeEditorActionsConfig } from '@alauda/code-editor';
import { TranslateService } from '@alauda/common-snippet';
import { MessageService } from '@alauda/ui';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  Injector,
  OnInit,
  ViewChild,
} from '@angular/core';
import { BaseStringMapFormComponent } from '@app/abstract';

@Component({
  selector: 'alo-key-value-form-list',
  templateUrl: './template.html',
  styleUrls: ['./styles.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KeyValueFormListComponent extends BaseStringMapFormComponent
  implements OnInit {
  @ViewChild('fileUploadInput', { static: true })
  fileUploadInputElementRef: ElementRef<HTMLInputElement>;

  editorActions: CodeEditorActionsConfig = {
    diffMode: false,
    clear: true,
    recover: false,
    copy: false,
    find: true,
    fullscreen: true,
    theme: false,
    export: false,
    import: false,
  };

  constructor(
    injector: Injector,
    private readonly message: MessageService,
    private readonly translate: TranslateService,
  ) {
    super(injector);
  }

  onImport(_event: Event) {
    const length = this.fileUploadInputElementRef.nativeElement.files.length;
    let counter = 0;

    function checkFileIsBinary(content: string) {
      return Array.from(content).some(char => char.charCodeAt(0) > 127);
    }

    Array.from(this.fileUploadInputElementRef.nativeElement.files).forEach(
      file => {
        const reader = new FileReader();
        reader.onloadend = () => {
          if (checkFileIsBinary(reader.result as string)) {
            this.message.error({
              content: this.translate.get('fileupload_binary_unsupported'),
            });
          } else {
            const newRow = this.createNewControl();

            newRow.setValue([file.name, reader.result]);

            this.form.push(newRow);
            this.cdr.markForCheck();
          }
          counter++;
          if (length === counter) {
            this.fileUploadInputElementRef.nativeElement.value = '';
          }
        };

        reader.readAsText(file);
      },
    );
  }

  ngOnInit() {
    super.ngOnInit();
  }

  getTextareaRows(content: string) {
    content = content || '';
    const lineCount = content.split(/\r\n|\r|\n/).length;
    return Math.min(50, Math.max(lineCount, 3));
  }
}
