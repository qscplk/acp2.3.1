/// <reference path="../../node_modules/monaco-editor/monaco.d.ts"/>

declare module '*.svg' {
  const content: string;
  export = content;
}

declare let SockJS: any;
declare module 'css-element-queries';
declare class ResizeSensor {
  constructor(element: Element | Element[], callback: (...args: any[]) => any);
  detach(callback: (...args: any[]) => any): void;
}

declare module 'd3-interpolate-path' {
  export const interpolatePath: <T>(from: T, to: T) => (t: number) => T;
}

declare interface Dictionary<T> {
  [index: string]: T;
}
