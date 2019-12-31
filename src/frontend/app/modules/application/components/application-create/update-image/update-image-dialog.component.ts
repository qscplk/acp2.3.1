import { DIALOG_DATA, DialogRef } from '@alauda/ui';
import {
  ChangeDetectionStrategy,
  Component,
  Inject,
  OnInit,
  ViewChild,
} from '@angular/core';
import { NgForm } from '@angular/forms';
import { RegistryApiService } from '@app/api/registry/registry-api.service';
import {
  ImageRepository,
  ImageTag,
} from '@app/api/registry/registry-api.types';
import { forkJoin, of } from 'rxjs';
import {
  map,
  mergeMap,
  publishReplay,
  refCount,
  switchMap,
  toArray,
} from 'rxjs/operators';

@Component({
  templateUrl: './update-image-dialog.component.html',
  styleUrls: ['./update-image-dialog.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UpdateImageDialogComponent implements OnInit {
  @ViewChild('form', { static: true })
  form: NgForm;
  tagOptions: ImageTag[];
  selectedType = 'select';
  imageParams = {
    repository_address: '',
    tag: '',
  };

  project$ = of(this.data.project);
  repositories$ = this.project$.pipe(
    switchMap(project =>
      this.registryApi.findRepositoriesByProject(project, null),
    ),
    map(list =>
      list.items.find(
        item =>
          `${item.host}/${item.image}` === this.imageParams.repository_address,
      ),
    ),
    mergeMap(item =>
      forkJoin(
        this.registryApi.findRepositoryTags(this.data.project, item.name, null),
      ).pipe(map(([data]) => ({ ...item, tags: data.items }))),
    ),
    toArray(),
    publishReplay(1),
    refCount(),
  );

  constructor(
    private dialogRef: DialogRef<UpdateImageDialogComponent>,
    private registryApi: RegistryApiService,
    @Inject(DIALOG_DATA)
    public data: {
      project: string;
      address: string;
      tag: string;
    },
  ) {}

  ngOnInit() {
    this.imageParams.repository_address = this.data.address;
    this.imageParams.tag = this.data.tag;
  }

  checkRepositories(repoList: ImageRepository[]) {
    if (repoList) {
      const index = repoList.findIndex(repo => {
        return (
          `${repo.host}/${repo.image}` === this.imageParams.repository_address
        );
      });
      if (index >= 0) {
        this.tagOptions = repoList[index].tags;
        return true;
      } else {
        return false;
      }
    }
  }

  save() {
    this.form.onSubmit(null);
    if (this.form.invalid) {
      return;
    }
    this.dialogRef.close(this.imageParams);
  }
}
