import { ChangeDetectionStrategy, Component } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

@Component({
  templateUrl: './create-page.component.html',
  styleUrls: ['create-page.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConfigSecretCreatePageComponent {
  displayModel = 'form';

  constructor(private router: Router, private activatedRoute: ActivatedRoute) {}

  onCreated(name: string) {
    this.router.navigate(['../detail', name], {
      relativeTo: this.activatedRoute,
    });
  }
}
