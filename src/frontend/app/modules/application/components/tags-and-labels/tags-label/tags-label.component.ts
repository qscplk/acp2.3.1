import {
  ChangeDetectionStrategy,
  Component,
  Input,
  OnChanges,
  SimpleChanges,
} from '@angular/core';

/**
 * User could provide two types of tags to use this component.
 * Tags requires a map of tags, while tagList requires a list of key/value pairs.
 */
@Component({
  selector: 'alo-tags-label',
  templateUrl: './tags-label.component.html',
  styleUrls: ['./tags-label.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TagsLabelComponent implements OnChanges {
  @Input() tags: { [key: string]: string };
  @Input() tagList: [string, string][] | string[];
  @Input() showAllCap = 2;

  ngOnChanges({ tags }: SimpleChanges) {
    if (tags) {
      this.tagList = this.tags ? Object.entries(this.tags) : [];
    }
  }

  renderTag(tag: string | string[]) {
    return Array.isArray(tag) ? tag.filter(t => !!t).join(': ') : tag;
  }
}
