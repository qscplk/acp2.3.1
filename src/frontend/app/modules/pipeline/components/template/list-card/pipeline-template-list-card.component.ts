import { TranslateService } from '@alauda/common-snippet';
import { DialogService, DialogSize } from '@alauda/ui';
import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  OnInit,
  Output,
} from '@angular/core';
import { PipelineTemplate } from '@app/api';
import { templateStagesConvert } from '@app/api/pipeline/utils';
import { PipelineTemplateDetailComponent } from '@app/modules/pipeline/components/template/detail/pipeline-template-detail.component';
import { STYLE_ICONS } from '@app/modules/pipeline/constant';
import { map } from 'rxjs/operators';

@Component({
  selector: 'alo-pipeline-template-list-card',
  templateUrl: './pipeline-template-list-card.component.html',
  styleUrls: ['./pipeline-template-list-card.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PipelineTemplateListCardComponent implements OnInit {
  customLabelIndex = ['sonarqube'];
  styleIcons = STYLE_ICONS;
  translateKey$ = this.translate.locale$.pipe(
    map((lang: string) => {
      return lang === 'en' ? 'en' : 'zh-CN';
    }),
  );

  @Input()
  template: PipelineTemplate;

  @Input()
  showSelect = false;

  @Input()
  disableSelect = false;

  @Output()
  templateSelected = new EventEmitter<PipelineTemplate>();

  constructor(
    private readonly dialog: DialogService,
    private readonly translate: TranslateService,
  ) {}

  ngOnInit() {
    this.template.stages = templateStagesConvert(this.template.stages);
  }

  detail(showSelect: boolean, disableSelect: boolean) {
    const dialogRef = this.dialog.open(PipelineTemplateDetailComponent, {
      size: DialogSize.Large,
      data: {
        template: this.template,
        showSelect,
        disableSelect,
      },
    });

    dialogRef.afterClosed().subscribe((template?: PipelineTemplate) => {
      if (template) {
        this.templateSelected.emit(template);
      }
    });
  }

  onTemplateSelect(template: PipelineTemplate) {
    this.templateSelected.emit(template);
  }
}
