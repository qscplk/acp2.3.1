import { ChangeDetectionStrategy, Component } from '@angular/core';

import { CodeQualityIconType } from '../icon/icon.component';

const columns = [
  {
    text: 'reliability',
    type: CodeQualityIconType.Level,
    levels: [
      { value: 'a', text: 'code_quality.bug_a' },
      { value: 'b', text: 'code_quality.bug_b' },
      { value: 'c', text: 'code_quality.bug_c' },
      { value: 'd', text: 'code_quality.bug_d' },
      { value: 'e', text: 'code_quality.bug_e' },
    ],
  },
  {
    text: 'security',
    type: CodeQualityIconType.Level,
    levels: [
      { value: 'a', text: 'code_quality.vulnerability_a' },
      { value: 'b', text: 'code_quality.vulnerability_b' },
      { value: 'c', text: 'code_quality.vulnerability_c' },
      { value: 'd', text: 'code_quality.vulnerability_d' },
      { value: 'e', text: 'code_quality.vulnerability_e' },
    ],
  },
  {
    text: 'maintainability',
    type: CodeQualityIconType.Level,
    levels: [
      { value: 'a', text: 'code_quality.smell_a' },
      { value: 'b', text: 'code_quality.smell_b' },
      { value: 'c', text: 'code_quality.smell_c' },
      { value: 'd', text: 'code_quality.smell_d' },
      { value: 'e', text: 'code_quality.smell_e' },
    ],
  },
  {
    text: 'code_quality.coverage',
    type: CodeQualityIconType.Coverage,
    levels: [
      { value: 'a', text: 'code_quality.coverage_a' },
      { value: 'b', text: 'code_quality.coverage_b' },
      { value: 'c', text: 'code_quality.coverage_c' },
      { value: 'd', text: 'code_quality.coverage_d' },
      { value: 'e', text: 'code_quality.coverage_e' },
    ],
  },
  {
    text: 'code_quality.duplicate',
    type: CodeQualityIconType.Duplicate,
    levels: [
      { value: 'a', text: 'code_quality.duplicate_a' },
      { value: 'b', text: 'code_quality.duplicate_b' },
      { value: 'c', text: 'code_quality.duplicate_c' },
      { value: 'd', text: 'code_quality.duplicate_d' },
      { value: 'e', text: 'code_quality.duplicate_e' },
    ],
  },
  {
    text: 'code_quality.size',
    type: CodeQualityIconType.Size,
    levels: [
      { value: 'a', text: 'code_quality.size_a' },
      { value: 'b', text: 'code_quality.size_b' },
      { value: 'c', text: 'code_quality.size_c' },
      { value: 'd', text: 'code_quality.size_d' },
      { value: 'e', text: 'code_quality.size_e' },
    ],
  },
];

@Component({
  selector: 'alo-code-quality-legends',
  templateUrl: 'legends.component.html',
  styleUrls: ['legends.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CodeQualityLegendsComponent {
  columns = columns;
}
