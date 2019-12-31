import {
  ChangeDetectionStrategy,
  Component,
  Input,
  OnDestroy,
  OnInit,
  ViewChild,
} from '@angular/core';
import { FormGroup, NgForm, Validators } from '@angular/forms';
import { PipelineApiService, PipelineKind } from '@app/api';
import { imageRequiredValidator } from '@app/modules/pipeline/constant';
import { get } from 'lodash-es';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'alo-pipeline-repository-form',
  templateUrl: './repository-form.component.html',
  styleUrls: ['./repository-form.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PipelineRepositoryFormComponent implements OnInit, OnDestroy {
  @Input()
  form: FormGroup;

  @Input()
  type: 'create' | 'update' = 'create';

  @Input()
  project: string;

  @Input()
  method: PipelineKind;

  @ViewChild('repoForm', { static: false })
  formControl: NgForm;

  branches: Array<{ name: string; commit?: string }> = [];

  private readonly unsubscribe$ = new Subject<void>();

  get values() {
    return this.form.value;
  }

  get isSvnRepo() {
    return this.method === 'script' && this.form.value.repo.kind === 'svn';
  }

  constructor(private readonly pipelineService: PipelineApiService) {}

  ngOnInit() {
    const bindingRepo = this.form.controls.repo.value.bindingRepository;
    if (this.project && bindingRepo) {
      this.getBranches(bindingRepo);
    }

    if (this.method !== 'multi-branch') {
      this.form.controls.repo.valueChanges
        .pipe(takeUntil(this.unsubscribe$))
        .subscribe(repo => {
          this.branches = [];
          if (repo && repo.kind === 'buildin') {
            this.form.controls.branch.setValue('');
            this.getBranches(repo.bindingRepository);
          } else {
            this.form.controls.branch.setValue('master');
          }
          this.setBranchValidator();
        });
    }

    if (this.form.controls.repo) {
      this.form.controls.repo.setValidators([imageRequiredValidator]);
    }
    this.setBranchValidator();
  }

  ngOnDestroy() {
    this.unsubscribe$.next();
    this.unsubscribe$.complete();
  }

  getBranches(repository: string) {
    this.pipelineService
      .getPipeineCodeRepositoryBranchs(repository, this.project)
      .subscribe((res: any) => {
        const branches = get(res, 'branches', []);
        this.branches = branches.map(
          (branch: { commit?: string; name: string }) => ({
            opt_key: branch.name,
            opt_value: branch.name,
          }),
        );
      });
  }

  setBranchValidator() {
    if (this.isSvnRepo) {
      this.form.controls.branch.clearValidators();
    } else {
      this.form.controls.branch.setValidators(Validators.required);
    }
  }
}
