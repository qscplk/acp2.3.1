import { TranslateService } from '@alauda/common-snippet';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  Input,
  OnChanges,
} from '@angular/core';
import { ApplicationInfo } from '@app/api';

@Component({
  selector: 'alo-application-list-card',
  templateUrl: 'application-list-card.component.html',
  styleUrls: ['application-list-card.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ApplicationListCardComponent implements OnChanges {
  @Input()
  appInfo: ApplicationInfo;

  displayResource = false;
  selectedImages: string[] = [];

  constructor(
    private readonly cdr: ChangeDetectorRef,
    private readonly translate: TranslateService,
  ) {}

  ngOnChanges() {
    this.setItems();
  }

  get addressesNum() {
    return (
      this.appInfo.visitAddresses.external.length +
      this.appInfo.visitAddresses.internal.length
    );
  }

  setItems() {
    this.cdr.detectChanges();
  }

  viewResource() {
    return false;
  }

  statusMap(status: string) {
    switch (status) {
      case 'Succeeded':
        return 'success';
      case 'Failed':
        return 'error';
      case 'Pending':
        return 'pending';
      case 'Unknown':
        return 'unknown';
    }
  }

  getResoureStatus(current: number, desired: number) {
    return `${current} / ${desired}`;
  }

  displayImageAddr(addr: string) {
    if (addr.length <= 45) {
      return addr;
    } else {
      return `${addr.slice(0, 20)}...${addr.slice(-20)}`;
    }
  }

  displayImges(images: string[]) {
    this.selectedImages = images;
  }

  toggleResourceList() {
    if (this.appInfo.resourceList.length > 0) {
      this.displayResource = !this.displayResource;
    }
  }

  getImagesTotal(length: number) {
    return this.translate.get('paginator.total_records', {
      length: length,
    });
  }

  trackByFn(index: number) {
    return index;
  }
}
