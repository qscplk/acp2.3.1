import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  templateUrl: './update-page.component.html',
  styleUrls: ['update-page.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConfigSecretUpdatePageComponent {
  displayModel = 'form';
}
