// TODO: only work for create now, update requirements change, refactor later
import { TranslateService } from '@alauda/common-snippet';
import { MessageService, NotificationService } from '@alauda/ui';
import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  EventEmitter,
  Input,
  OnInit,
  Output,
  ViewChild,
} from '@angular/core';
import { NgForm } from '@angular/forms';
import {
  Project,
  ProjectApiService,
  Secret,
  SecretApiService,
  SecretIdentity,
  SecretType,
} from '@app/api';
import { SECRETS_NAME_RULE } from '@app/utils/patterns';
import { getQuery, pageBy, sortBy } from '@app/utils/query-builder';
import { head } from 'lodash-es';
import { Observable, forkJoin, of, throwError } from 'rxjs';
import { catchError, concatMap, map, tap } from 'rxjs/operators';

import { ModuleEnv } from '../../module-env';

export type EditorStatus = 'normal' | 'loading' | 'saving';

const defaultModel = (isPrivate = false): Secret => ({
  name: '',
  namespace: '',
  displayName: '',
  type: null,
  private: isPrivate,
  ownerReferences: [],
});

@Component({
  selector: 'alo-secret-edit',
  templateUrl: 'edit.component.html',
  styleUrls: ['edit.component.scss'],
  exportAs: 'alo-secret-edit',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SecretEditComponent implements OnInit {
  @Input()
  name = '';

  @Input()
  namespace = '';

  @Input()
  mode: 'create' | 'update' = 'create';

  @Input()
  env: ModuleEnv = 'admin';

  @Input()
  types: SecretType[] = [
    SecretType.BasicAuth,
    SecretType.OAuth2,
    SecretType.SSH,
    SecretType.DockerConfig,
  ];

  @Input()
  tips: string;

  get tipLines() {
    return this.tips.split('\n');
  }

  @Output()
  saved = new EventEmitter<SecretIdentity>();

  secretTypes = SecretType;

  @Output()
  statusChange = new EventEmitter<EditorStatus>();

  model = defaultModel(this.env !== 'admin');

  @ViewChild('form', { static: true })
  form: NgForm;

  projects: Project[] = [];

  belongsProject: Project;

  showPassword: boolean;

  showClientSecret: boolean;

  showDockerPassword: boolean;

  nameRule = SECRETS_NAME_RULE;

  constructor(
    private readonly api: SecretApiService,
    private readonly projectApi: ProjectApiService,
    private readonly notification: NotificationService,
    private readonly message: MessageService,
    private readonly translate: TranslateService,
    private readonly cdr: ChangeDetectorRef,
  ) {}

  ngOnInit() {
    this.prepareForm();
  }

  prepareForm() {
    this.statusChange.emit('loading');

    this.getModel()
      .pipe(
        tap(model => {
          this.model = model;
          this.form.resetForm(this.model);
        }),
        concatMap(() => {
          return forkJoin(this.getAllProjects(), this.getBelongsProject());
        }),
      )
      .subscribe(
        ([projects, belongsProject]) => {
          if (projects) {
            this.projects = projects;
          }
          if (belongsProject) {
            this.belongsProject = belongsProject;
          }
          this.statusChange.emit('normal');
          this.cdr.markForCheck();
        },
        (error: NotificatableError) => {
          this.statusChange.emit('normal');
          this.cdr.markForCheck();

          this.notification.warning({
            title: this.translate.get(error.info.title),
            content: this.translate.get(error.info.content, error.info.data),
          });
        },
      );
  }

  save() {
    if (!this.form.valid) {
      return;
    }

    const handler =
      this.mode === 'create'
        ? this.api.post(this.model)
        : this.api.putData(this.model);
    const succMessage =
      this.mode === 'create' ? 'secret.create_succ' : 'secret.update_succ';
    const errorMessage =
      this.mode === 'create' ? 'secret.create_fail' : 'secret.update_fail';

    this.statusChange.emit('saving');
    handler.subscribe(
      (result: Secret) => {
        this.statusChange.emit('normal');
        this.cdr.markForCheck();
        this.message.success({
          content: this.translate.get(succMessage),
        });
        this.saved.emit(result);
      },
      (error: any) => {
        this.statusChange.emit('normal');
        this.cdr.markForCheck();
        this.notification.error({
          title: this.translate.get(errorMessage),
          content: error.error.error || error.error.message || undefined,
        });
      },
    );
  }

  submit() {
    (this.form as any).submitted = true;
    this.form.ngSubmit.emit();
  }

  private getModel(): Observable<Secret> {
    if (this.mode === 'update' && (!this.name || !this.namespace)) {
      return throwError({
        title: 'secret.edit_input_invalid',
        content: 'scret.edit_input_invalid_content',
        data: {},
      });
    }

    if (!this.name || !this.namespace) {
      return of({
        ...defaultModel(this.env !== 'admin'),
        namespace: this.namespace || '',
        type: head(this.types),
      });
    }

    return this.api.get({ name: this.name, namespace: this.namespace }).pipe(
      catchError(
        (error: HttpErrorResponse): Observable<Secret> => {
          if (error.status === 404) {
            throw new NotificatableError({
              title: 'secret.edit_not_found',
              content: 'secret.edit_not_found_content',
              data: {
                name: this.name,
              },
            });
          }

          throw new NotificatableError({
            title: 'secret.edit_load_fail',
            content: 'secret.edit_load_fail_content',
            data: {
              name: this.name,
            },
          });
        },
      ),
    );
  }

  getDocumentLink() {
    const scope = this.env === 'admin' ? 'admin' : 'project';
    return `/devops-docs/10usermanual/${scope}/secret/secrettype/`;
  }

  private getBelongsProject() {
    if (!this.namespace || !this.model.private) {
      return of(null);
    }
    return this.projectApi.get(this.namespace).pipe(
      catchError(
        (error: HttpErrorResponse): Observable<Project> => {
          if (error.status === 404) {
            throw new NotificatableError({
              title: 'secret.edit_belongs_project_not_found',
              content: 'secret.edit_belongs_project_not_found_content',
              data: {
                name: this.namespace,
              },
            });
          }

          throw new NotificatableError({
            title: 'secret.edit_belongs_project_load_fail',
            content: 'secret.edit_belongs_project_load_fail_content',
            data: {
              name: this.namespace,
            },
          });
        },
      ),
    );
  }

  private getAllProjects(): Observable<Project[]> {
    if (this.namespace) {
      return of([]);
    }

    return this.projectApi
      .find(getQuery(pageBy(0, 0), sortBy('name', false)))
      .pipe(
        map(result => result.items),
        catchError(
          (): Observable<Project[]> => {
            throw new NotificatableError({
              title: 'secret.edit_projects_load_fail',
              content: 'secret.edit_projects_load_fail_content',
            });
          },
        ),
      );
  }
}

class NotificatableError extends Error {
  constructor(public info: { title: string; content: string; data?: any }) {
    super();
  }
}
