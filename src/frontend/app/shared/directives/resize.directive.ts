import {
  Directive,
  ElementRef,
  EventEmitter,
  OnDestroy,
  OnInit,
  Output,
} from '@angular/core';
import { ResizeSensor } from 'css-element-queries';

export interface ResizeEvent {
  width: number;
  height: number;
  prevWidth: number;
  prevHeight: number;
}

@Directive({
  selector: '[aloResize]',
})
export class ResizeDirective implements OnInit, OnDestroy {
  @Output('resized') readonly resized = new EventEmitter<ResizeEvent>();

  private resizeSensor: any = null;

  private prevWidth: number;
  private prevHeight: number;

  constructor(private readonly element: ElementRef) {}

  ngOnInit() {
    this.resizeSensor = new ResizeSensor(this.element.nativeElement, () =>
      this.onResized(),
    );
    this.onResized();
  }

  private onResized() {
    const { clientWidth, clientHeight } = this.element.nativeElement;

    if (clientWidth === this.prevWidth && clientHeight === this.prevHeight) {
      return;
    }

    this.resized.next({
      width: clientWidth,
      height: clientHeight,
      prevWidth: this.prevWidth,
      prevHeight: this.prevHeight,
    });
  }

  ngOnDestroy() {
    this.resizeSensor.detach();
  }
}
