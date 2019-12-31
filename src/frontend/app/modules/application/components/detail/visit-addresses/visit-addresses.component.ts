import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { VisitAddresses } from '@app/api';

enum AddressType {
  External = 'external',
  Internal = 'internal',
}

@Component({
  selector: 'alo-visit-addresses',
  templateUrl: './visit-addresses.component.html',
  styleUrls: ['./visit-addresses.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VisitAddressesComponent {
  @Input() type: AddressType;
  @Input() visitAddresses: VisitAddresses;
}
