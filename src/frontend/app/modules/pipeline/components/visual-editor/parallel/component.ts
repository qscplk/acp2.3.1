import {
  ChangeDetectionStrategy,
  Component,
  HostBinding,
  Input,
  OnDestroy,
} from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { Subscription } from 'rxjs';
import {
  debounceTime,
  distinctUntilChanged,
  filter,
  map,
  tap,
} from 'rxjs/operators';

import {
  ParallelEntity,
  PipelineVisualEditorStoreService,
  changeParallelName,
  createParallelNameSelector,
  createParallelSelector,
  removeParallel,
} from '../store';

@Component({
  selector: 'alo-pipeline-visual-editor-parallel',
  templateUrl: 'component.html',
  styleUrls: ['../side-form.scss', 'component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PipelineVisualEditorParallelComponent implements OnDestroy {
  constructor(
    private readonly store: PipelineVisualEditorStoreService,
    private readonly fb: FormBuilder,
  ) {}

  @Input()
  id: string;

  @HostBinding('class')
  class = 'side-form';

  private nameFormSubscription: Subscription = null;

  ngOnDestroy() {
    this.nameFormSubscription && this.nameFormSubscription.unsubscribe();
  }

  toNameForm = (id: string) =>
    this.store.select(createParallelNameSelector(id)).pipe(
      distinctUntilChanged(),
      map(name => this.fb.group({ name })),
      tap(fg => {
        if (this.nameFormSubscription) {
          this.nameFormSubscription.unsubscribe();
        }
        this.nameFormSubscription = fg.valueChanges
          .pipe(debounceTime(200))
          .subscribe(({ name }) =>
            this.store.dispatch(changeParallelName(id, name)),
          );
      }),
    );

  getParallel = (id: string) =>
    this.store
      .select(createParallelSelector(id))
      .pipe(filter(parallel => !!parallel));

  remove(parallel: ParallelEntity) {
    this.store.dispatch(removeParallel(parallel.id));
  }
}
