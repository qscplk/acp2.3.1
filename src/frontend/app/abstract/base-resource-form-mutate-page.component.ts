import { TranslateService } from '@alauda/common-snippet';
import { MessageService, NotificationService } from '@alauda/ui';
import {
  AfterViewInit,
  ChangeDetectorRef,
  Injector,
  OnInit,
  ViewChild,
} from '@angular/core';
import { NgForm } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { HistoryService, YamlSampleService } from '@app/services';
import { KubernetesResource } from '@app/types';
import { createActions, updateActions } from '@app/utils/code-editor-config';
import { safeDump, safeLoadAll } from 'js-yaml';
import { get } from 'lodash-es';
import { BehaviorSubject, Observable, of } from 'rxjs';
import {
  first,
  map,
  publishReplay,
  refCount,
  startWith,
  switchMap,
} from 'rxjs/operators';

export abstract class BaseResourceMutatePageComponent<
  R extends KubernetesResource = KubernetesResource
> implements OnInit, AfterViewInit {
  name$: Observable<string>;

  resource$: Observable<R>;

  // Model for form
  formModel: R = {} as R;

  // YAML content
  yaml = '';

  originalYaml$: Observable<string>;

  // create/update
  method$: Observable<string>;
  isUpdate$: Observable<boolean>;

  mode: 'form' | 'yaml' = 'form';

  mode$ = new BehaviorSubject<string>(this.mode);

  submitting = false;

  editorOptions = {
    language: 'yaml',
  };

  initialized = false;

  // TODO: there are some slight difference between to modes
  actionsConfig$: Observable<any>;

  @ViewChild(NgForm, { static: false })
  form: NgForm;

  // User need to provide this:
  abstract readonly kind: string;

  readonly activatedRoute: ActivatedRoute;
  readonly history: HistoryService;
  readonly cdr: ChangeDetectorRef;
  readonly yamlSample: YamlSampleService;
  readonly auiMessageService: MessageService;
  readonly auiNotificationService: NotificationService;
  readonly translate: TranslateService;
  readonly router: Router;

  constructor(injector: Injector) {
    this.activatedRoute = injector.get(ActivatedRoute);
    this.history = injector.get(HistoryService);
    this.cdr = injector.get(ChangeDetectorRef);
    this.yamlSample = injector.get(YamlSampleService);
    this.auiMessageService = injector.get(MessageService);
    this.auiNotificationService = injector.get(NotificationService);
    this.translate = injector.get(TranslateService);
    this.router = injector.get(Router);
  }

  ngOnInit() {
    const snapshot = this.activatedRoute.snapshot;
    this.method$ = this.activatedRoute.url.pipe(
      startWith(snapshot.url),
      map(url => url[0].path),
      publishReplay(1),
      refCount(),
    );

    this.isUpdate$ = this.method$.pipe(map(method => method === 'update'));

    this.resource$ = this.isUpdate$.pipe(
      switchMap(isUpdate => {
        if (!isUpdate) {
          const sample = this.yamlSample.feedDefaultNamespace(
            snapshot.data.sample,
            snapshot.params.namespace || snapshot.params.project,
          );
          return of(this.yamlToForm(sample));
        } else {
          return of(this.formModel);
        }
      }),
      publishReplay(1),
      refCount(),
    );

    this.resource$.pipe(first()).subscribe(resource => {
      if (!this.initialized && resource) {
        this.formModel = resource;
        this.yaml = this.formToYaml(resource);
        this.initialized = true;
        this.cdr.markForCheck();
      }
    });

    this.originalYaml$ = this.resource$.pipe(
      map(resource => this.formToYaml(resource)),
    );

    this.actionsConfig$ = this.isUpdate$.pipe(
      map(isUpdate => (isUpdate ? updateActions : createActions)),
    );

    this.name$ = this.resource$.pipe(
      map(resource => get(resource, 'metadata.name')),
    );
  }

  ngAfterViewInit() {
    this.form.statusChanges.subscribe(() => {
      this.cdr.markForCheck();
    });
  }

  modeChange(mode: 'form' | 'yaml') {
    if (mode === this.mode) {
      return;
    }

    if (mode === 'form') {
      try {
        this.formModel = this.yamlToForm(this.yaml);
      } catch (err) {
        this.auiNotificationService.error({
          title: this.translate.get('yaml_format_error_message'),
          content: err.error.message,
        });
        return;
      }
    } else {
      this.yaml = this.formToYaml(this.formModel);
    }

    this.mode = mode;

    this.mode$.next(mode);

    // Reset submitted status
    (this.form as any).submitted = false;
    this.cdr.markForCheck();
  }

  formModelChange(form: R) {
    this.formModel = form;
  }

  get submitDisabled() {
    return this.submitting;
  }

  back() {
    this.history.back(['..'], this.activatedRoute);
  }

  yamlToForm(yaml: string) {
    const formModels = safeLoadAll(yaml).map(item =>
      item === 'undefined' ? undefined : item,
    );
    let formModel = formModels[0];

    // For now we can only process a single deployment resource in the yaml.
    if (formModels.length > 1) {
      this.auiMessageService.warning(
        this.translate.get('multi_yaml_resource_warning'),
      );
    }

    if (!formModel || formModel instanceof String) {
      formModel = {};
    }

    return formModel;
  }

  formToYaml(json: any) {
    try {
      // Following line is to remove undefined values
      json = JSON.parse(JSON.stringify(json));
      return safeDump(json);
    } catch (err) {
      console.log(err);
    }
  }
}
