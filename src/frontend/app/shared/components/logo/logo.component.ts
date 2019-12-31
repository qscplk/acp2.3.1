import { Component, Inject, OnInit } from '@angular/core';
import { Environments } from '@app/app-global';
import { ENVIRONMENTS } from '@app/services';

@Component({
  selector: 'alo-logo',
  templateUrl: './logo.component.html',
  styleUrls: ['./logo.component.scss'],
})
export class LogoComponent implements OnInit {
  constructor(@Inject(ENVIRONMENTS) public envs: Environments) {}

  ngOnInit() {}
}
