import { animate, style, transition, trigger } from '@angular/animations';
import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { PipelineGlobalStatusParams, ReportsApiService } from '@app/api';
import { scaleLinear } from 'd3-scale';
import { arc } from 'd3-shape';
import { map } from 'rxjs/operators';

const STAGE_WIDTH = 108;

const fg = scaleLinear<string, number>()
  .domain([0, 0.5, 1])
  .range(['#e54545', '#ff9d00', '#0abf5b']);
const bg = scaleLinear<string, number>()
  .domain([0, 0.5, 1])
  .range(['#fcecec', '#fff5e5', '#e6f8ee']);

@Component({
  selector: 'alo-pipeline-stage-status-chart',
  templateUrl: 'pipeline-stage-status-chart.component.html',
  styleUrls: [
    '../../../../shared/dashboard.scss',
    'pipeline-stage-status-chart.component.scss',
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [
    trigger('stage', [
      transition(':enter', [
        style({
          opacity: '0',
          transform: `translateX(-${STAGE_WIDTH * 1.5}px)`,
        }),
        animate(
          '.5s ease-in',
          style({
            opacity: '1',
            transform: `translateX(-${STAGE_WIDTH * 0.5}px)`,
          }),
        ),
      ]),
      transition(':leave', [
        animate(
          '.5s ease-in',
          style({
            opacity: '0',
            transform: `translateX(${STAGE_WIDTH * 0.5}px)`,
          }),
        ),
      ]),
    ]),
  ],
})
export class PipelineStageStatusChartComponent {
  @Input()
  get project() {
    return this.params.project;
  }

  set project(project: string) {
    this.params = {
      ...this.params,
      project,
      // app: '__all',
    };
  }

  // private fetchApplications$ = new Subject<void>();
  //
  // applications$ = this.fetchApplications$.pipe(
  //   startWith(null),
  //   switchMap(() =>
  //     this.applicationApi.find(this.project).pipe(
  //       map(res => res.items),
  //       catchError(() => of([])),
  //       startWith(null),
  //     ),
  //   ),
  //   publishReplay(1),
  //   refCount(),
  // );

  params: PipelineGlobalStatusParams = {
    range: '-25h',
    project: '',
    // app: '__all',
  };

  constructor(
    private readonly reportsApi: ReportsApiService, // private applicationApi: ApplicationApiService,
  ) {}

  fetchPipelineStageStatus = (params: PipelineGlobalStatusParams) => {
    return this.reportsApi
      .getPipelineStageStatus({
        ...params,
        // app: params.app === '__all' ? '' : params.app,
      })
      .pipe(
        map(res => {
          // prevent DOM reorder for smooth animation
          const data = res.data
            .map((item, index) => ({ ...item, index }))
            .sort((a, b) => (a.name === b.name ? 0 : a.name > b.name ? 1 : -1));

          return {
            ...res,
            data,
          };
        }),
      );
  };

  tracker(_: number, item: { name: string }) {
    return item.name;
  }

  stageBg(item: { total: number; succ: number }) {
    return bg(item.succ / item.total);
  }

  stageFg(item: { total: number; succ: number }) {
    return fg(item.succ / item.total);
  }

  arc(item: { total: number; succ: number }) {
    return arc().cornerRadius(3)({
      startAngle: 0,
      endAngle: (Math.PI * 2 * item.succ) / item.total,
      innerRadius: 19,
      outerRadius: 24,
    });
  }

  percent(item: { total: number; succ: number }) {
    return Math.round((100 * item.succ) / item.total);
  }

  onRangeChange(range: string) {
    this.params = {
      ...this.params,
      range,
    };
  }
}
