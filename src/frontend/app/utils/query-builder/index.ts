import { isArray, omitBy } from 'lodash-es';

export interface QueryMeta {
  filters: { [name: string]: any };
  sort: string;
  desc: boolean;
  itemsPerPage: number;
  page: number;
}

const initialQuery: QueryMeta = {
  filters: {},
  sort: '',
  desc: false,
  itemsPerPage: 0,
  page: 0,
};

export const filterBy = (
  filters: { [name: string]: any } | string,
  value: any = null,
) => (query: QueryMeta) => {
  if (typeof filters === 'string') {
    if (typeof value !== 'number' && !value) {
      return query;
    }

    return {
      ...query,
      filters: {
        ...query.filters,
        [filters]: value,
      },
    };
  }

  return {
    ...query,
    filters: {
      ...query.filters,
      ...omitBy(filters, val => typeof val !== 'number' && !val),
    },
  };
};

export const sortBy = (sort: string, desc = false) => (query: QueryMeta) => ({
  ...query,
  sort,
  desc,
});

export const pageBy = (pageIndex: number, itemsPerPage: number) => (
  query: QueryMeta,
) => ({
  ...query,
  page: pageIndex + 1,
  itemsPerPage,
});

export function getQuery(...querys: ((query: QueryMeta) => QueryMeta)[]) {
  return toParams(
    querys.reduceRight((accum, query) => query(accum), initialQuery),
  );
}

function toParams(
  query: QueryMeta,
): {
  filterBy?: string;
  sortBy?: string;
  page?: string;
  itemsPerPage?: string;
} {
  return Object.assign(
    {},
    hasFilters(query)
      ? {
          filterBy: filterToString(query.filters),
        }
      : {},
    hasSort(query) ? { sortBy: `${query.desc ? 'd' : 'a'},${query.sort}` } : {},
    isByPage(query)
      ? { itemsPerPage: `${query.itemsPerPage}`, page: `${query.page}` }
      : {},
  );
}

function filterToString(filters: { [name: string]: any }) {
  return Object.keys(filters)
    .map(key => {
      if (isArray(filters[key])) {
        return filters[key].map((filter: string) => `${key},${filter}`);
      } else {
        return `${key},${filters[key]}`;
      }
    })
    .join(',');
}

function hasFilters(query: QueryMeta): boolean {
  return !!Object.keys(query.filters).length;
}

function hasSort(query: QueryMeta): boolean {
  return !!query.sort;
}

function isByPage(query: QueryMeta): boolean {
  return query.itemsPerPage > 0;
}
