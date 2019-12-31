/*
  https://github.com/d3/d3-format#format
  https://en.wikipedia.org/wiki/Metric_prefix#List_of_SI_prefixes
*/
import { Pipe, PipeTransform } from '@angular/core';
import { format } from 'd3-format';
import { isNumber } from 'lodash-es';

const f = format('~s');

@Pipe({
  name: 'aloSIPrefix',
})
export class SIPrefixPipe implements PipeTransform {
  transform(value: string | number) {
    return f(isNumber(value) ? value : parseFloat(value));
  }
}
