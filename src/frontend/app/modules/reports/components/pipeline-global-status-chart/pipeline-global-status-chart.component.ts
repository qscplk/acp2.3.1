import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { PipelineGlobalStatusParams, ReportsApiService } from '@app/api';
import { color } from 'd3-color';
import { interpolatePath } from 'd3-interpolate-path';
import { ScaleLinear, scaleLinear } from 'd3-scale';
import { area, curveMonotoneX } from 'd3-shape';
import { isEqual } from 'lodash-es';
import { concat, of } from 'rxjs';
import { animationFrame } from 'rxjs/internal/scheduler/animationFrame';
import { concatMap, delay, map, repeat, takeWhile, tap } from 'rxjs/operators';

const succArea = (
  x: ScaleLinear<number, number>,
  y: ScaleLinear<number, number>,
) =>
  area<{ succ: number; failed: number }>()
    .curve(curveMonotoneX)
    .x((_, i) => x(i))
    .y1(d => y(d.succ))
    .y0(() => 0);

const failedArea = (
  x: ScaleLinear<number, number>,
  y: ScaleLinear<number, number>,
) =>
  area<{ succ: number; failed: number }>()
    .curve(curveMonotoneX)
    .x((_, i) => x(i))
    .y1(d => y(d.succ + d.failed))
    .y0(() => 0);

const MARGIN_X = 40;
const MARGIN_Y = 32;
const MARGIN_Y_TOP = 6;
const COLORS = ['#e54545', '#0abf5b'];

type ChartParams = PipelineGlobalStatusParams & {
  width: number;
  height: number;
};

@Component({
  selector: 'alo-pipeline-global-status-chart',
  templateUrl: 'pipeline-global-status-chart.component.html',
  styleUrls: [
    '../../../../shared/dashboard.scss',
    'pipeline-global-status-chart.component.scss',
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PipelineGlobalStatusChartComponent {
  @Input()
  get project() {
    return this.params.project;
  }
  set project(project: string) {
    this.params = {
      ...this.params,
      project,
    };
  }

  params: ChartParams = {
    range: '-25h',
    project: '',
    width: 0,
    height: 0,
  };

  get colors() {
    return COLORS;
  }

  get colorsLighterOpacity() {
    const failedColor = color(COLORS[0]);
    const succColor = color(COLORS[1]);
    failedColor.opacity = 0.5;
    succColor.opacity = 0.5;
    return [failedColor, succColor];
  }

  showPointer = false;
  xIndex = 0;
  pointerY = 0;
  pointerLabelHeight = 20;
  total = 0;

  get transform() {
    return `translate(${MARGIN_X}, ${this.params.height - MARGIN_Y})`;
  }

  get axisX() {
    const ticks = !this.snapshot.data
      ? []
      : this.snapshot.params.range === '-169h'
      ? this.snapshot.data
          .map((d, i) => ({
            ...d,
            x: this.x(i),
            time: this.formatDate(d.time),
          }))
          .filter((_, i) => i % 24 === 0)
      : this.snapshot.params.range === '-337h'
      ? this.snapshot.data
          .map((d, i) => ({
            ...d,
            x: this.x(i),
            time: this.formatDate(d.time),
          }))
          .filter((_, i) => i % 48 === 0)
      : this.snapshot.data
          .map((d, i) => ({
            ...d,
            x: this.x(i),
            time: this.formatDate(d.time, true),
          }))
          .filter((_, i) => i % 6 === 0);

    return {
      ticks,
      path: `M-4 0 L${this.params.width - MARGIN_X} 0`,
    };
  }

  get axisY() {
    const ticks = this.y ? this.y.ticks(5) : [];

    return {
      ticks: ticks.map(value => ({ value, y: this.y(value) })),
      path: `M0 4 L0 -${this.params.height - MARGIN_Y - MARGIN_Y_TOP}`,
    };
  }

  get rightFix() {
    return `M${this.params.width - MARGIN_X} 0 L${this.params.width -
      MARGIN_X} -${this.params.height - MARGIN_Y - MARGIN_Y_TOP}`;
  }

  get contentTop() {
    return -this.params.height + MARGIN_Y + MARGIN_Y_TOP;
  }

  get contentWidth() {
    return this.params.width - MARGIN_X;
  }

  get contentHeight() {
    return this.params.height - MARGIN_Y - MARGIN_Y_TOP;
  }

  get pointerX() {
    return this.x(this.xIndex);
  }

  get pointSucc() {
    if (!this.x || !this.y) {
      return { cx: 0, cy: 0 };
    }

    const index = Math.min(this.snapshot.data.length - 1, this.xIndex);

    return {
      cx: this.x(this.xIndex),
      cy: this.y(this.snapshot.data[index].succ),
    };
  }

  get pointFail() {
    if (!this.x || !this.y) {
      return { cx: 0, cy: 0 };
    }

    const index = Math.min(this.snapshot.data.length - 1, this.xIndex);

    return {
      cx: this.x(this.xIndex),
      cy: this.y(
        this.snapshot.data[index].succ + this.snapshot.data[index].failed,
      ),
    };
  }

  get pointerLabelTransform() {
    return `translate(-${MARGIN_X - 2}, ${this.pointerY -
      this.pointerLabelHeight / 2})`;
  }

  get labelPath() {
    return `M0 0 L${MARGIN_X - 8} 0 L${MARGIN_X - 8} ${
      this.pointerLabelHeight
    } L0 ${this.pointerLabelHeight} Z`;
  }

  get pointerData() {
    if (!this.x || !this.y) {
      return {
        date: '',
        start: '',
        end: '',
        succ: 0,
        failed: 0,
      };
    }

    const index = Math.min(this.snapshot.data.length - 1, this.xIndex);

    const data = this.snapshot.data[index];

    if (!data) {
      return {
        date: '',
        start: '',
        end: '',
        succ: 0,
        failed: 0,
      };
    }

    const start = new Date(data.time);

    return {
      ...data,
      date: `${start.getFullYear()}-${start.getMonth() + 1}-${start.getDate()}`,
      start: `${start.getHours()}:00`,
      end: `${start.getHours() + 1}:00`,
    };
  }

  tooltipTransform = `translate(0, 0)`;

  get data() {
    return this.snapshot.data;
  }

  private x: ScaleLinear<number, number>;
  private y: ScaleLinear<number, number>;

  private snapshot: {
    data: {
      time: string;
      succ: number;
      failed: number;
    }[];
    paths: string[];
    params: PipelineGlobalStatusParams;
  } = {
    data: null,
    paths: null,
    params: null,
  };

  constructor(private reportsApi: ReportsApiService) {}

  pathTween(from: string[], to: string[]) {
    const duration = 500;
    const start = performance.now();
    const failed = interpolatePath(from[0], to[0]);
    const succ = interpolatePath(from[1], to[1]);

    const t$ = of(null, animationFrame).pipe(
      repeat(),
      map(() => (performance.now() - start) / duration),
      takeWhile(t => t < 1),
    );

    return concat(t$, of(1)).pipe(map(t => [failed(t), succ(t)]));
  }

  toPaths(
    data: { time: string; succ: number; failed: number }[],
    width: number,
    height: number,
  ) {
    const max = data.reduce(
      (accum, item) =>
        item.succ + item.failed > accum ? item.succ + item.failed : accum,
      0,
    );

    const y = scaleLinear()
      .domain([0, Math.max(max, 8)])
      .range([0, -height + MARGIN_Y + MARGIN_Y_TOP])
      .nice();

    const x = scaleLinear()
      .domain([0, data.length - 1])
      .range([0, width - MARGIN_X]);
    const succ = succArea(x, y);
    const failed = failedArea(x, y);
    this.x = x;
    this.y = y;

    return [failed(data), succ(data)];
  }

  fetchPipelineGlobalStatus = ({ width, height, ...params }: ChartParams) => {
    const data$ = isEqual(params, this.snapshot.params)
      ? of(this.snapshot.data).pipe(delay(50))
      : this.reportsApi.getPipelineGlobalStatus(params).pipe(
          tap(res => (this.total = res.total)),
          map(res => res.data),
        );

    return data$.pipe(
      tap(data => {
        this.snapshot.params = params;
        this.snapshot.data = data;
      }),
      concatMap(data =>
        this.pathTween(
          this.snapshot.paths || [
            `M0 0 L${width - MARGIN_X} 0 L0 0 Z`,
            `M0 0 L${width - MARGIN_X} 0 L0 0 Z`,
          ],
          this.toPaths(data, width, height),
        ),
      ),
      tap(paths => (this.snapshot.paths = paths)),
    );
  };

  invertY(value: number) {
    if (!this.y) {
      return 0;
    }

    return Math.round(this.y.invert(value));
  }

  private formatDate(value: string, timeOfDay = false) {
    const date = new Date(value);
    return timeOfDay
      ? `${date.getMonth() + 1}-${date.getDate()} ${date.getHours()}:00`
      : `${date.getMonth() + 1}-${date.getDate()}`;
  }

  onRangeChange(range: string) {
    this.params = {
      ...this.params,
      range,
    };
  }

  onResized({ width, height }: any) {
    this.params = {
      ...this.params,
      width,
      height,
    };
  }

  onMouseMove(event: any) {
    if (!this.x) {
      return;
    }

    this.xIndex = Math.round(this.x.invert(event.offsetX - MARGIN_X));
    this.pointerY = event.offsetY - (this.params.height - MARGIN_Y);

    this.tooltipTransform = `translate(${this.x(this.xIndex) +
      MARGIN_X +
      16}px, ${event.offsetY - 12}px)`;
  }
}
