import { ApiGatewayService, TranslateService } from '@alauda/common-snippet';
import { MessageService } from '@alauda/ui';
import { HttpClient } from '@angular/common/http';
import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  Input,
  OnDestroy,
  ViewChild,
} from '@angular/core';
import {
  SJSCloseEvent,
  SJSMessageEvent,
  ShellFrame,
  TerminalResponse,
} from '@app/api';
import { debounce, isEqual } from 'lodash-es';
import { ReplaySubject, Subject, Subscription, interval } from 'rxjs';
import {
  concatMap,
  filter,
  first,
  map,
  publishReplay,
  refCount,
  timeout,
} from 'rxjs/operators';
// TODO upgrade xterm to 4.x
import { ITheme, Terminal } from 'xterm';
import { fit } from 'xterm/lib/addons/fit/fit';

const SHELL_THEME_KEY = 'alk-shell-theme';

export enum ConnectionStatus {
  Connecting = 'connecting',
  GoodConnection = 'goodConnection',
  BadConnection = 'badConnection',
  Disconnected = 'disconnected',
}

const DARK_THEME: ITheme = {
  background: '#283238',
  foreground: '#d4d4d4',
};
const LIGHT_THEME: ITheme = {
  background: '#fff',
  foreground: '#000',
  cursor: '#00a',
  selection: '#00000033',
};
const SHELL_THEMES = {
  dark: DARK_THEME,
  light: LIGHT_THEME,
};
type Theme = keyof typeof SHELL_THEMES;
const PING_INTERVAL = 5000;
const HIGH_PING_WARNING_THRESHOLD = 500;

@Component({
  selector: 'alo-shell',
  templateUrl: './shell.component.html',
  styleUrls: ['./shell.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ShellComponent implements AfterViewInit, OnDestroy {
  @Input()
  podName: string;

  @Input()
  cluster: string;

  @Input()
  containerName: string;

  @Input()
  namespace: string;

  @Input()
  theme: 'light' | 'dark';

  @ViewChild('anchor', { static: true })
  anchorRef: ElementRef;

  connecting = false;
  connectionClosed = false;

  isDarkTheme = false;

  term: Terminal;
  pingAvg = 0;

  keyEvent$ = new ReplaySubject<KeyboardEvent>(2);

  private previousConfig: {
    podName?: string;
    containerName?: string;
    namespace?: string;
  } = {};

  private conn: WebSocket;
  private readonly connSubject = new ReplaySubject<ShellFrame>(100);
  private connected = false;
  private debouncedFit: Function;
  private readonly incommingMessage$ = new Subject<ShellFrame>();
  private pingSub: Subscription;
  private readonly subscriptions: Subscription[] = [];

  constructor(
    private readonly http: HttpClient,
    private readonly message: MessageService,
    private readonly cdr: ChangeDetectorRef,
    private readonly translate: TranslateService,
    private readonly apiGateway: ApiGatewayService,
  ) {}

  ngAfterViewInit(): void {
    this.term = new Terminal({
      fontSize: 14,
      fontFamily: 'Consolas, "Courier New", monospace',
      bellStyle: 'sound',
      cursorBlink: true,
    });

    this.setTheme(
      (localStorage.getItem(SHELL_THEME_KEY) as 'dark' | 'light') || 'dark',
    );

    this.term.open(this.anchorRef.nativeElement);
    this.debouncedFit = debounce(() => {
      fit(this.term);
      this.cdr.markForCheck();
    }, 100);
    this.debouncedFit();
    window.addEventListener('resize', () => this.debouncedFit());

    this.term.on('data', this.onTerminalSendString.bind(this));
    this.term.on('selection', this.onTerminalSelection.bind(this));
    this.term.on('resize', this.onTerminalResize.bind(this));
    this.term.on('key', (_, event) => {
      this.keyEvent$.next(event);
    });

    this.subscriptions.push(
      this.connSubject.subscribe(frame => this.handleConnectionMessage(frame)),
      this.apiGateway.getApiAddress().subscribe(apiGatewayAddress => {
        this.setupConnection(apiGatewayAddress);
      }),
    );

    this.cdr.markForCheck();
  }

  ngOnDestroy() {
    if (this.conn && this.connected) {
      this.conn.close();
    }

    if (this.connSubject) {
      this.connSubject.complete();
    }

    if (this.term) {
      this.term.destroy();
    }

    this.incommingMessage$.complete();
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  setTheme(theme: Theme = this.theme) {
    this.isDarkTheme = theme === 'dark';
    localStorage.setItem(SHELL_THEME_KEY, theme);
    if (this.term) {
      this.term.setOption('theme', SHELL_THEMES[theme]);
    }
    this.cdr.markForCheck();
  }

  toogleTheme() {
    this.setTheme(this.isDarkTheme ? 'light' : 'dark');
  }

  get connectionStatus(): ConnectionStatus {
    if (this.connecting) {
      return ConnectionStatus.Connecting;
    } else if (!this.connecting && this.connectionClosed) {
      return ConnectionStatus.Disconnected;
    }
    if (this.pingAvg > HIGH_PING_WARNING_THRESHOLD) {
      return ConnectionStatus.BadConnection;
    } else {
      return ConnectionStatus.GoodConnection;
    }
  }

  get shouldShowProgressBar(): boolean {
    return this.connecting || this.statusColor !== 'primary';
  }

  get statusColor() {
    if (!this.connecting && this.connectionClosed) {
      return 'warn';
    } else if (this.pingAvg > HIGH_PING_WARNING_THRESHOLD) {
      return 'accent';
    } else {
      return 'primary';
    }
  }

  private async setupConnection(apiGatewayAddress: string) {
    this.connecting = true;
    this.connectionClosed = false;
    const newConfig = {
      podName: this.podName,
      containerName: this.containerName,
      namespace: this.namespace,
    };

    if (this.conn && isEqual(this.previousConfig, newConfig)) {
      // Do nothing
      return;
    }

    // Should only have one connection per component:
    if (this.conn) {
      this.conn.close();
    }

    this.previousConfig = newConfig;

    const { id } = await this.http
      .get<TerminalResponse>(
        `{{API_GATEWAY}}/devops/api/v1/pod/${this.namespace}/${this.podName}/shell/${this.containerName}`,
        { params: { cluster: this.cluster } },
      )
      .toPromise();

    this.conn = new SockJS(`${apiGatewayAddress}/devops/api/sockjs?${id}`);
    this.conn.onopen = this.onConnectionOpen.bind(this, id);
    this.conn.onmessage = this.onConnectionMessage.bind(this);
    this.conn.onclose = this.onConnectionClose.bind(this);

    this.cdr.markForCheck();
  }

  private onConnectionOpen(sessionId: string) {
    const startData = { Op: 'bind', SessionID: sessionId };
    this.conn.send(JSON.stringify(startData));
    this.connSubject.next(startData);
    this.connected = true;
    this.connecting = false;
    this.connectionClosed = false;

    // Make sure the terminal is with correct display size.
    this.onTerminalResize();

    // Focus on connection
    this.term.focus();

    this.pingSub = this.getPing$().subscribe(
      ping => {
        this.pingAvg = ping;
      },
      () => {
        // If ping timeouts, we believe the connect is lost:
        this.onConnectionClose();
      },
    );

    this.cdr.markForCheck();
  }

  private handleConnectionMessage(frame: ShellFrame) {
    if (frame.Op === 'stdout') {
      this.term.write(frame.Data);
    }

    if (frame.Op === 'toast') {
      this.message.info({ content: frame.Data });
    }

    // Echo will be handled in echoPingFrame
    if (frame.Op === 'echo') {
      // no-op here
    }

    this.incommingMessage$.next(frame);
    this.cdr.markForCheck();
  }

  private onConnectionMessage(evt: SJSMessageEvent) {
    const msg = JSON.parse(evt.data);
    this.connSubject.next(msg);
  }

  private onConnectionClose(_evt?: SJSCloseEvent) {
    if (!this.connected) {
      return;
    }
    this.pingSub.unsubscribe();
    this.conn.close();
    this.message.error({
      content: this.translate.get('exec_disconnected'),
    });
    this.connected = false;
    this.connecting = false;
    this.connectionClosed = true;

    this.cdr.markForCheck();
  }

  private onTerminalSendString(str: string) {
    if (this.connected) {
      this.conn.send(
        JSON.stringify({
          Op: 'stdin',
          Data: str,
          Cols: this.term.cols,
          Rows: this.term.rows,
        }),
      );
    }
  }

  private onTerminalSelection() {
    // TODO: do we still need this?
    // const selection = this.term.getSelection();
    // clipboard.writeText(selection);
    // this.message.info({ content: '已复制Shell选择内容到剪切板' });
  }

  private onTerminalResize() {
    if (this.connected) {
      this.conn.send(
        JSON.stringify({
          Op: 'resize',
          Cols: this.term.cols,
          Rows: this.term.rows,
        }),
      );
    }
  }

  private getPing$() {
    if (!this.connected) {
      return;
    }

    const ping = (id: number) => {
      const payload = {
        id,
        timestamp: new Date().valueOf(),
      };

      this.conn.send(
        JSON.stringify({
          Op: 'echo',
          Data: JSON.stringify(payload),
        }),
      );

      return this.incommingMessage$.pipe(
        filter(
          frame => frame.Op === 'echo' && JSON.parse(frame.Data).id === id,
        ),
        first(),
        timeout(2 * PING_INTERVAL),
        map(frame => new Date().valueOf() - JSON.parse(frame.Data).timestamp),
      );
    };

    return interval(PING_INTERVAL).pipe(
      concatMap(ping),
      publishReplay(1),
      refCount(),
    );
  }
}
