import { Injectable } from '@angular/core';
import { safeDump, safeLoadAll } from 'js-yaml';
import { get, set } from 'lodash-es';

@Injectable({
  providedIn: 'root',
})
export class YamlSampleService {
  constructor() {}

  feedDefaultNamespace(sampleYaml: string, currentNamespace = ''): string {
    if (!sampleYaml) {
      return;
    }
    try {
      let jsons = safeLoadAll(sampleYaml);
      jsons = jsons.map(json => {
        if (get(json, 'metadata.namespace')) {
          set(json, 'metadata.namespace', currentNamespace);
        }
        return json;
      });

      sampleYaml = jsons.map(json => safeDump(json)).join('---\n');
    } catch (err) {
      console.error('Failed to convert sample, please check the format');
    }

    return sampleYaml;
  }
}
