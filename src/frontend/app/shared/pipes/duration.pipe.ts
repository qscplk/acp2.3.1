import { TranslateService } from '@alauda/common-snippet';
import { Pipe, PipeTransform } from '@angular/core';
// TODO migrate to dayjs
import * as moment from 'moment';

@Pipe({ name: 'aloDuration', pure: false })
export class DurationPipe implements PipeTransform {
  constructor(private readonly translate: TranslateService) {}
  transform(ms: any): string {
    if (!ms) {
      return '-';
    }

    let message = '';
    if (ms >= 1000) {
      const duration = moment.duration(ms);

      const days = duration.days();
      const hours = duration.hours();
      const minutes = duration.minutes();
      const seconds = duration.seconds();

      message += days ? days + this.translate.get('day') : '';
      message += hours ? hours + this.translate.get('hour') : '';
      message += minutes ? minutes + this.translate.get('minute') : '';
      message += seconds ? seconds + this.translate.get('second') : '';
    } else if (ms > 0) {
      message = this.translate.get('less_then_a_second');
    } else {
      message = '-';
    }

    return message;
  }
}
