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
import { BaseResourceFormGroupComponent } from 'ng-resource-form-util';

@Component({
  selector: 'alo-tls-editor',
  templateUrl: './template.html',
  styleUrls: ['./styles.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TLSEditorComponent extends BaseResourceFormGroupComponent
  implements OnInit {
  @ViewChild('fileUploadInput', { static: true })
  fileUploadInputElementRef: ElementRef<HTMLInputElement>;

  constructor(
    injector: Injector,
    private readonly message: MessageService,
    private readonly translate: TranslateService,
  ) {
    super(injector);
  }

  getDefaultFormModel() {
    return {};
  }

  createForm() {
    return this.fb.group({
      'tls.crt': this.fb.control(''),
      'tls.key': this.fb.control(''),
    });
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
            this.form.controls['tls.crt'].setValue(reader.result);
            this.form.controls['tls.key'].setValue('');
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
}
