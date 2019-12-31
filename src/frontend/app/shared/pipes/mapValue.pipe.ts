import { Pipe, PipeTransform } from '@angular/core';

@Pipe({ name: 'aloMapValues', pure: false })
export class MapValuesPipe implements PipeTransform {
  transform(value: Map<string, any> = new Map()): any {
    return Array.from(value.values());
  }
}
