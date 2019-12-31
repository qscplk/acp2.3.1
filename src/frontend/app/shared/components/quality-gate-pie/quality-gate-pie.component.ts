import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { status, statusColor } from '@app/modules/code-quality/utils/mappers';
import { arc, pie } from 'd3-shape';
import { Subject } from 'rxjs';
import { debounceTime, map, publishReplay, refCount } from 'rxjs/operators';

export interface DataSegment {
  status: string;
  count: number;
  expand?: any;
}

const THICKNESS = 10;

const createPie = pie<DataSegment>().value(d => d.count);

@Component({
  selector: 'alo-quality-gate-pie',
  templateUrl: 'quality-gate-pie.component.html',
  styleUrls: ['quality-gate-pie.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class QualityGatePieComponent {
  get transform() {
    return `translate(${this.width / 2}, ${this.height / 2})`;
  }

  get arc() {
    const r = Math.min(this.width / 2, this.height / 2);

    return arc()
      .innerRadius(r - THICKNESS)
      .outerRadius(r)
      .padAngle(Math.PI / 180);
  }
  @Input()
  width = 72;
  @Input()
  height = 72;

  @Input()
  data: DataSegment[] = [];

  mouseMove$ = new Subject<MouseEvent>();

  tooltipTransform$ = this.mouseMove$.pipe(
    debounceTime(0),
    map(event => [event.offsetX, event.offsetY]),
    map(([x, y]) => `translate(${x}px, ${y}px)`),
    publishReplay(1),
    refCount(),
  );

  hited: DataSegment = null;

  status = status;

  statusColor = statusColor(true);

  pie = (data: DataSegment[]) =>
    this.total(data) > 0
      ? createPie(data)
      : createPie([{ status: 'SKETCH', count: 1 }]);

  total = (data: DataSegment[]) => {
    return (
      data && data.length && data.reduce((accum, item) => accum + item.count, 0)
    );
  };

  identity(_: number, item: DataSegment) {
    return item.status;
  }

  onMouseMove(event: MouseEvent) {
    this.mouseMove$.next(event);
  }

  hoverData(data: DataSegment) {
    this.hited = data;
  }

  unhoverData(data: DataSegment) {
    if (data.status === this.hited.status) {
      this.hited = null;
    }
  }
}
