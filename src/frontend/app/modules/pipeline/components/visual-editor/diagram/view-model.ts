import * as R from 'ramda';

import { State } from '../store';

export interface Link {
  x1: number;
  x2: number;
  y1: number;
  y2: number;
  color: string;
}

export interface EndPoint {
  x: number;
  y: number;
}

export interface Group {
  x: number;
  y: number;
  parallel: string;
  height: number;
  nodes: Node[];
}

export interface Node {
  x: number;
  y: number;
  height: number;
  stage: string;
}

export interface AddNodePlaceholder {
  x: number;
  y: number;
  parent: string;
}

export interface AddGroupPlaceholder {
  x: number;
  y: number;
  after: string;
}

export interface PipelineViewModel {
  groups: Group[];
  nodes: Node[];
  links: Link[];
  addGroupPlaceholders: AddGroupPlaceholder[];
  addNodePlaceholders: AddNodePlaceholder[];
  width: number;
  height: number;
}

const MARGIN_START = 50;
const ADD_PARALLEL_SIZE = 64;
const GROUP_WIDTH = 160;
const BASELINE_TOP = 112;
const NODE_MARGIN = 16;
const FIELD_HEIGHT = 20;
const NODE_HEADER_HEIGHT = 25;
const NODE_CONTENT_MARGIN = 4;

const start = (): EndPoint => ({
  x: MARGIN_START,
  y: BASELINE_TOP,
});

const firstAddGroupPlaceholder = (): AddGroupPlaceholder => ({
  x: MARGIN_START + ADD_PARALLEL_SIZE / 2,
  y: BASELINE_TOP,
  after: '',
});

// TODO: maybe slow, refactor later
export const toViewModel = ({
  parallels: { ids: mainFlow },
  forks,
  stages: { entities: stages },
  tasks: {
    all: { entities: tasks },
  },
  stageForms: { entities: stageForms },
}: Omit<State, 'navigator' | 'selected'>) => {
  const endpoints = [start()];

  const reduceNodes = (x: number) => (accum: Node[], stageId: string) => {
    const { y: prevY, height: prevHeight } = R.last(accum) || {
      y: 0,
      height: 0,
    };

    const stage = stages[stageId];
    const task = tasks[stage.task];
    const form = stageForms[stageId];

    const fields =
      task.basic && task.basic.length
        ? R.filter(fieldName => {
            const field = task.fields[fieldName];
            return !field.hidden(form.values);
          }, task.basic)
        : [];

    const node = prevY
      ? {
          x,
          y: prevY + prevHeight + NODE_MARGIN,
          height:
            (fields.length || 1) * FIELD_HEIGHT +
            NODE_HEADER_HEIGHT +
            NODE_CONTENT_MARGIN * 2,
          stage: stageId,
        }
      : {
          x,
          y: BASELINE_TOP,
          height:
            (fields.length || 1) * FIELD_HEIGHT +
            NODE_HEADER_HEIGHT +
            NODE_CONTENT_MARGIN * 2,
          stage: stageId,
        };

    return [...accum, node];
  };

  const reduceGroups = (accum: Group[], parallelId: string) => {
    const { x: prevX } = R.last(accum) || { x: 0 };
    const x = prevX
      ? prevX + GROUP_WIDTH + ADD_PARALLEL_SIZE
      : MARGIN_START + ADD_PARALLEL_SIZE + GROUP_WIDTH / 2;

    const parallelForks = forks[parallelId];

    const nodes = R.reduce(reduceNodes(x), [], parallelForks);

    const lastNode = R.last(nodes);

    return [
      ...accum,
      {
        x,
        y: BASELINE_TOP,
        parallel: parallelId,
        nodes,
        height: lastNode.y + lastNode.height - BASELINE_TOP,
      },
    ];
  };

  const reduceAddGroupPlaceholders = (
    accum: AddGroupPlaceholder[],
    group: Group,
  ) => {
    const { x: prevX } = R.last(accum);
    return [
      ...accum,
      {
        x: prevX + GROUP_WIDTH + ADD_PARALLEL_SIZE,
        y: BASELINE_TOP,
        after: group.parallel,
      },
    ];
  };

  const reducer = (
    accum: {
      groups: Group[];
      addGroupPlaceholders: AddGroupPlaceholder[];
      addNodePlaceholders: AddNodePlaceholder[];
      nodeLinks: Link[];
      placeholderLinks: Link[];
      height: number;
    },
    parallelId: string,
  ) => {
    const groups = reduceGroups(R.propOr([], 'groups', accum), parallelId);

    const lastGroup = R.last(groups);

    const addGroupPlaceholders = reduceAddGroupPlaceholders(
      R.prop('addGroupPlaceholders', accum),
      lastGroup,
    );

    const addNodePlaceholders = R.append(
      {
        x: lastGroup.x,
        y: lastGroup.y + lastGroup.height + NODE_MARGIN,
        parent: lastGroup.parallel,
      },
      R.prop('addNodePlaceholders', accum),
    );

    const nodeLinks = R.concat(
      R.prop('nodeLinks', accum),
      R.map(
        node => ({
          x1: node.x - GROUP_WIDTH / 2 - ADD_PARALLEL_SIZE / 2,
          x2: node.x + GROUP_WIDTH / 2 + ADD_PARALLEL_SIZE / 2,
          y1: BASELINE_TOP,
          y2: node.y,
          color: '#999',
        }),
        lastGroup.nodes,
      ),
    );

    const placeholderLinks = R.append(
      {
        x1: lastGroup.x - GROUP_WIDTH / 2 - ADD_PARALLEL_SIZE / 2,
        x2: lastGroup.x + GROUP_WIDTH / 2 + ADD_PARALLEL_SIZE / 2,
        y1: BASELINE_TOP,
        y2: lastGroup.y + lastGroup.height + NODE_MARGIN,
        color: '#ebebeb',
      },
      R.prop('placeholderLinks', accum),
    );

    return {
      groups,
      addGroupPlaceholders,
      addNodePlaceholders,
      nodeLinks,
      placeholderLinks,
      height: R.max(
        R.prop('height', accum),
        lastGroup.y + lastGroup.height + NODE_MARGIN,
      ),
    };
  };

  const {
    nodeLinks,
    placeholderLinks,
    addGroupPlaceholders,
    ...rest
  } = R.reduce(
    reducer,
    {
      groups: [],
      addGroupPlaceholders: [firstAddGroupPlaceholder()],
      addNodePlaceholders: [],
      nodeLinks: [],
      placeholderLinks: [],
      height: BASELINE_TOP * 2,
    },
    mainFlow,
  );

  const baseline = {
    x1: MARGIN_START,
    x2: R.last(addGroupPlaceholders).x,
    y1: BASELINE_TOP,
    y2: BASELINE_TOP,
    color: '#999',
  };

  return {
    ...rest,
    endpoints,
    addGroupPlaceholders,
    links: [baseline, ...placeholderLinks, ...nodeLinks],
    width: baseline.x2 + MARGIN_START,
  };
};

export type DiagramViewModel = ReturnType<typeof toViewModel>;
