import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  Output,
} from '@angular/core';
import {
  ImageRepository,
  ImageTag,
} from '@app/api/registry/registry-api.types';
import {
  getFullImagePath,
  getImagePathPrefix,
  getImagePathSuffix,
} from '@app/modules/registry/utils';

@Component({
  selector: 'alo-tag-list-section',
  templateUrl: 'tag-list-section.component.html',
  styleUrls: ['tag-list-section.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TagListSectionComponent {
  @Input()
  repository: ImageRepository;
  @Input()
  tags: ImageTag[];
  @Input()
  loading = false;
  @Input()
  error: any;
  @Output()
  refetch = new EventEmitter<void>();
  @Output()
  filterChange = new EventEmitter<string>();
  @Output()
  scanTrigger = new EventEmitter<ImageTag>();

  getImagePathPrefix = getImagePathPrefix;

  getImagePathSuffix = getImagePathSuffix;

  getFullImagePath = getFullImagePath;
}
