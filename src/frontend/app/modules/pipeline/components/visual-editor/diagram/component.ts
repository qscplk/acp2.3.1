import { TranslateService } from '@alauda/common-snippet';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  Input,
} from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { UndoableState, activeState, redo, undo } from '@app/utils/redux';
import { shallowEqual } from '@app/utils/shallow-equal';
import * as R from 'ramda';
import { Subject, combineLatest } from 'rxjs';
import { distinctUntilChanged, filter, map } from 'rxjs/operators';

import {
  LocalizedString,
  NavigatorState,
  PipelineVisualEditorStoreService,
  SCALE_MAX,
  SCALE_MIN,
  State,
  createParallelNameDuplicateSelector,
  createParallelNameSelector,
  createStageFormAndTask,
  createStageFormSelector,
  createStageNameDuplicateSelector,
  createStageSelector,
  resetAndScale,
  scale,
  select,
  selectNavigator,
  selectPipelineForm,
  selectSelected,
} from '../store';
import { mouseEventsToActions } from '../store/utils/mouse-events-to-actions';

import { Link, toViewModel } from './view-model';

const ZOOM_STEP = 0.4;

@Component({
  selector: 'alo-pipeline-visual-editor-diagram',
  templateUrl: 'component.html',
  styleUrls: ['component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PipelineVisualEditorDiagramComponent {
  constructor(
    private readonly elem: ElementRef,
    private readonly store: PipelineVisualEditorStoreService,
    private readonly sanitizer: DomSanitizer,
    private readonly translate: TranslateService,
  ) {
    mouseEventsToActions(this.mouseEvents$).subscribe(this.store.dispatch);
  }

  @Input()
  submitted = false;

  state$ = combineLatest(
    this.store.select(selectSelected),
    this.store.select(selectNavigator),
    // prevent toViewModel computed when navigator or selected change
    this.store
      .select(
        R.pipe(activeState, R.omit(['navigator', 'selected'])),
        shallowEqual,
      )
      .pipe(map(toViewModel)),
  ).pipe(
    map(([selected, navigator, viewModel]) => ({
      selected,
      navigator,
      viewModel,
    })),
  );

  pipelineSettingsHasErrors$ = this.store.select(selectPipelineForm).pipe(
    map(form => !!form.errors),
    distinctUntilChanged(),
  );

  mouseEvents$ = new Subject<MouseEvent | WheelEvent>();

  onMouseEvents(event: MouseEvent | WheelEvent) {
    if (event.type === 'mousedown' && this.needPreventDrageFrom(event.target)) {
      return;
    }

    this.mouseEvents$.next(event);
  }

  toTransform = ({ offsetX, offsetY, scale: ratio }: NavigatorState) => {
    return this.sanitizer.bypassSecurityTrustStyle(
      `translate(${offsetX}px, ${offsetY}px) scale(${ratio})`,
    );
  };

  withTransition({ scaling, moving }: NavigatorState) {
    return !scaling && !moving;
  }

  toPix(val: number) {
    return `${val}px`;
  }

  addPrefix = (prefix: string) => (id: string) => `${prefix}/${id}`;

  toPath({ x1, y1, x2, y2 }: Link) {
    const r = 10;
    return `M${x1},${y1}
    L${x1} ${y2 - r} Q${x1} ${y2} ${x1 + r} ${y2}
    L${x2 - r} ${y2} Q${x2} ${y2} ${x2} ${y2 - r}
    L${x2} ${y1}`;
  }

  getStageName = (id: string) =>
    this.store.select(
      R.pipe(createStageSelector(id), stage => stage && stage.name),
    );

  getStageFields = (id: string) =>
    this.store.select(createStageFormAndTask(id), shallowEqual).pipe(
      filter(({ task, form }) => !!task && !!form),
      map(({ task, form }) => {
        return R.reduce(
          (accum, fieldName) => {
            const fieldDefine = task.fields[fieldName];

            if (fieldDefine.hidden(form.values)) {
              return accum;
            }

            const field = {
              displayName: fieldDefine.displayName,
              value: form.values[fieldName],
              hasError: R.pathOr(false, ['errors', fieldName], form),
            };

            return [...accum, field];
          },
          [],
          task.basic || [],
        );
      }),
    );

  getParallelName = (id: string) =>
    this.store.select(createParallelNameSelector(id, true));

  stageHasError = (id: string) =>
    this.store.select(createStageFormSelector(id)).pipe(
      filter(form => !!form),
      map(form => !!form.errors),
    );

  parallelNameHasError = (id: string) =>
    this.store.select(state => {
      const parallelName = createParallelNameSelector(id, true)(state);
      const isParallelNameDuplicate = createParallelNameDuplicateSelector(
        parallelName,
      );

      return isParallelNameDuplicate(state);
    });

  stageNameHasError = (id: string) =>
    this.store.select((state: UndoableState<State>) => {
      const selectStage = createStageSelector(id);
      const stage = selectStage(state);

      if (!stage || !stage.name) {
        return true;
      }

      const selectNameDuplicate = createStageNameDuplicateSelector(stage.name);

      return selectNameDuplicate(state);
    });

  toCurrentLang = (text: LocalizedString) =>
    this.translate.locale$.pipe(
      map(lang => (lang === 'en' ? text.en : text['zh-CN'])),
    );

  select(prefix = '', id = '') {
    this.store.dispatch(select(prefix ? `${prefix}/${id}` : ''));
  }

  zoomReset() {
    this.store.dispatch(resetAndScale(1, 0, 0));
  }

  zoomOut() {
    const { width, height } = this.getContainerSize();

    this.store.dispatch(scale(ZOOM_STEP, width / 2, height / 2));
  }

  zoomIn() {
    const { width, height } = this.getContainerSize();

    this.store.dispatch(scale(-ZOOM_STEP, width / 2, height / 2));
  }

  zoomFitSize(width: number, height: number) {
    const {
      width: containerWidth,
      height: containerHeight,
    } = this.getContainerSize();

    const ratio = Math.min(containerWidth / width, containerHeight / height);

    const limitedRatio = Math.min(SCALE_MAX, Math.max(SCALE_MIN, ratio));

    const offsetX = (containerWidth - width * limitedRatio) / 2;
    const offsetY = (containerHeight - height * limitedRatio) / 2;

    this.store.dispatch(resetAndScale(limitedRatio, offsetX, offsetY));
  }

  undo() {
    this.store.dispatch(undo());
  }

  redo() {
    this.store.dispatch(redo());
  }

  private getContainerSize() {
    const container = this.elem && <Element>this.elem.nativeElement;

    if (!container) {
      return { x: 0, y: 0 };
    }

    return {
      width: container.clientWidth,
      height: container.clientHeight,
    };
  }

  private needPreventDrageFrom(target: EventTarget) {
    if (!target) {
      return true;
    }

    const { classList } = <Element>target;

    if (classList && classList.contains('diagram-container')) {
      return false;
    }

    return true;
  }
}
