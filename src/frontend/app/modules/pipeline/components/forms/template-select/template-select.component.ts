import { TranslateService } from '@alauda/common-snippet';
import {
  AfterViewInit,
  ChangeDetectorRef,
  Component,
  EventEmitter,
  Input,
  OnInit,
  Output,
} from '@angular/core';
import { FormGroup } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import {
  PipelineApiService,
  PipelineTemplate,
  TemplateCategory,
} from '@app/api';
import { ListResult } from '@app/api/api.types';
import { filterBy, getQuery, sortBy } from '@app/utils/query-builder';
import { NEVER, ReplaySubject, Subject, forkJoin } from 'rxjs';
import {
  catchError,
  map,
  publishReplay,
  refCount,
  switchMap,
  tap,
} from 'rxjs/operators';

@Component({
  selector: 'alo-pipeline-template-select-from',
  templateUrl: './template-select.component.html',
  styleUrls: ['./template-select.component.scss'],
})
export class PipelineTemplateSelectFormComponent
  implements OnInit, AfterViewInit {
  categories: Array<TemplateCategory & { selected: boolean }> = [];
  fetchData$ = new Subject<any>();
  searchKey: string;
  selectedTemplateName: string;
  loading = true;
  error$ = new ReplaySubject<void>(1);
  navCategory = this.route.snapshot.paramMap.get('category');

  @Input()
  form: FormGroup;

  @Input()
  project: string;

  @Input()
  type: string;

  @Output()
  templateSelected = new EventEmitter<PipelineTemplate>();

  templates$ = this.fetchData$.pipe(
    switchMap((query: any) =>
      forkJoin(
        this.pipelineApi.clusterTemplateList(query),
        this.pipelineApi.templateList(this.project, query),
      ).pipe(
        map(([clusterTemplates, templates]) => {
          return templates.items.concat(clusterTemplates.items);
        }),
        tap(() => {
          this.loading = false;
        }),
      ),
    ),
    publishReplay(1),
    refCount(),
    catchError((err: any) => {
      this.loading = false;
      this.error$.next(err);
      return NEVER;
    }),
  );

  constructor(
    private readonly pipelineApi: PipelineApiService,
    private readonly cdr: ChangeDetectorRef,
    private readonly translate: TranslateService,
    private readonly route: ActivatedRoute,
  ) {}

  ngOnInit() {
    this.fetchData$.next(
      getQuery(filterBy('labels', 'latest:true'), sortBy('name', false)),
    );
    if (this.navCategory === 'all') {
      this.pipelineApi
        .categories(this.project)
        .subscribe((categories: ListResult<TemplateCategory>) => {
          this.categories = categories.items.map(
            (category: TemplateCategory & { selected: boolean }) => {
              category.selected = false;
              return category;
            },
          );
          this.cdr.detectChanges();
        });
    }
  }

  ngAfterViewInit() {
    this.search('');
  }

  search(event?: string) {
    this.loading = true;
    this.searchKey = event;
    let filterCategories;
    if (this.navCategory !== 'all') {
      filterCategories = [this.navCategory];
    } else {
      filterCategories = this.categories
        .filter((item: { name: string; selected: boolean }) => {
          return item.selected;
        })
        .map(item => item.name);
    }
    this.fetchData$.next(
      getQuery(
        filterBy(
          this.translate.locale === 'en' ? 'displayEnName' : 'displayZhName',
          this.searchKey || '',
        ),
        filterBy('category', filterCategories.join(':')),
        filterBy('labels', 'latest:true'),
        sortBy('name', false),
      ),
    );
  }

  isSelectedTemplate(
    template: PipelineTemplate,
    formTemplate: PipelineTemplate,
  ) {
    if (!template || !formTemplate) {
      return false;
    }
    return (
      template.name === formTemplate.name ||
      (template.name === formTemplate.templateName &&
        template.kind === formTemplate.kind)
    );
  }

  selectTemplate(template: PipelineTemplate) {
    if (this.type !== 'copy') {
      this.form.patchValue({ template });
    }
    this.templateSelected.emit();
  }

  fetchDataWithCategory(
    categories: Array<{ name: string; selected: boolean }>,
  ) {
    let filterCategories;
    if (this.navCategory !== 'all') {
      filterCategories = [this.navCategory];
    } else {
      filterCategories = categories
        .filter((item: { name: string; selected: boolean }) => {
          return item.selected;
        })
        .map(item => item.name);
    }
    const query = getQuery(
      filterBy(
        `${this.translate.locale === 'en' ? 'displayEnName' : 'displayZhName'}`,
        this.searchKey,
      ),
      filterBy('category', filterCategories.join(':')),
      filterBy('labels', 'latest:true'),
      sortBy('name', false),
    );
    this.fetchData$.next(query);
  }
}
