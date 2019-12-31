import { TreeNode } from '@alauda/ui';

export function mapRepositoriesToTreeNodes(repositories: string[] | null) {
  if (!repositories) {
    return [];
  }
  return [
    {
      label: '/',
      value: ['/'],
      expanded: true,
      icon: 'basic:file_catalog_fold',
      expandedIcon: 'basic:file_catalog_open',
      children: Array.from(new Set(repositories))
        .sort((a, b) => a.localeCompare(b))
        .map(items =>
          items
            .split('/')
            .map((item, index, arr) => ({
              label: item,
              value: arr.slice(0, index + 1),
              icon:
                index < arr.length - 1 || arr.length === 1
                  ? 'basic:file_catalog_fold'
                  : 'basic:file',
              expandedIcon: 'basic:file_catalog_open',
            }))
            .reduceRight((prev, current) => {
              return { ...current, children: [prev] };
            }),
        )
        .reduce(mergeTreeBranch, [])
        .map(items => {
          if (!items.hasOwnProperty('children')) {
            return { ...items, children: [] };
          } else {
            return items;
          }
        }),
    },
  ];
}

export function mergeTreeBranch(
  prev: TreeNode[],
  current: TreeNode,
): TreeNode[] {
  const exitIndex = prev.findIndex(item => item.label === current.label);
  if (exitIndex >= 0) {
    return prev.map((item, index) => {
      if (index === exitIndex) {
        return {
          ...current,
          children: mergeTreeBranch(item.children || [], current.children[0]),
        };
      } else {
        return item;
      }
    });
  } else {
    return prev.concat(current);
  }
}
