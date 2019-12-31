export interface TerminalResponse {
  id: string;
}

export interface SockJSSimpleEvent {
  type: string;
  toString(): string;
}

export interface SJSCloseEvent extends SockJSSimpleEvent {
  code: number;
  reason: string;
  wasClean: boolean;
}

export interface SJSMessageEvent extends SockJSSimpleEvent {
  data: string;
}

export interface ShellFrame {
  Op: string;
  Data?: any;
  SessionID?: string;
  Rows?: number;
  Cols?: number;
}

export interface TerminalPageParams {
  namespace: string;
  resourceKind: string;
  resourceName: string;
  cluster: string;

  // Optional
  pod?: string;
  container?: string;
}
