import { Location } from '@angular/common';
import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { TerminalPageParams } from '@app/api';

@Injectable()
export class TerminalService {
  constructor(private router: Router, private location: Location) {}

  openTerminal({
    pod,
    container,
    resourceKind,
    resourceName,
    namespace,
    cluster,
  }: TerminalPageParams) {
    const urlTree = this.router.createUrlTree([
      '/terminal',
      {
        pod,
        container,
        resourceKind,
        resourceName,
        namespace,
        cluster,
      },
    ]);
    const url = this.router.serializeUrl(urlTree);
    const terminalUrl = this.location.prepareExternalUrl(url);

    // Following is to center the new window.
    const w = 800;
    const h = 600;

    const dualScreenLeft =
      window.screenLeft !== undefined ? window.screenLeft : window.screenX;
    const dualScreenTop =
      window.screenTop !== undefined ? window.screenTop : window.screenY;

    const width = window.innerWidth
      ? window.innerWidth
      : document.documentElement.clientWidth
        ? document.documentElement.clientWidth
        : screen.width;
    const height = window.innerHeight
      ? window.innerHeight
      : document.documentElement.clientHeight
        ? document.documentElement.clientHeight
        : screen.height;

    const left = width / 2 - w / 2 + dualScreenLeft;
    const top = height / 2 - h / 2 + dualScreenTop;

    window.open(
      terminalUrl,
      '_blank',
      `width=${w},height=${h},resizable=yes,left=${left},top=${top}`,
    );
  }
}
