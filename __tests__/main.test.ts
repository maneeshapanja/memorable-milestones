import * as core from '@actions/core';
import * as github from '@actions/github';
import {Octokit} from '@octokit/rest';
import moment from 'moment';

import {
  MilestoneProcessor,
  MilestoneProcessorOptions
} from '../src/MilestoneProcessor';
import {
  Milestone,
  GlobalMilestone,
  GLOBAL_MILESTONES_MAP
} from '../src/constants';

function generateMilestone(
  id: number,
  number: number,
  title: string,
  description: string,
  updatedAt: string,
  openIssues: number,
  closedIssues: number,
  isClosed: boolean = false,
  dueOn: string
): Milestone {
  return {
    id: id,
    number: number,
    description: description,
    title: title,
    updated_at: updatedAt,
    open_issues: openIssues,
    closed_issues: closedIssues,
    state: isClosed ? 'closed' : 'open',
    due_on: dueOn
  };
}

const DefaultProcessorOptions: MilestoneProcessorOptions = {
  repoToken: 'none',
  debugOnly: true
};

const DUCK = GLOBAL_MILESTONES_MAP.get('DUCK');
const LOBSTER = GLOBAL_MILESTONES_MAP.get('LOBSTER');
const MAP = GLOBAL_MILESTONES_MAP.get('MAP');
const ORANGE = GLOBAL_MILESTONES_MAP.get('ORANGE');
const PORCUPINE = GLOBAL_MILESTONES_MAP.get('PORCUPINE');
const SUN = GLOBAL_MILESTONES_MAP.get('SUN');
const TENNIS = GLOBAL_MILESTONES_MAP.get('TENNIS');
const UMBRELLA = GLOBAL_MILESTONES_MAP.get('UMBRELLA');

test('empty milestone list results in 8 created', async () => {
  // June 1 2020
  const now = DUCK && DUCK.firstDueDate.clone().subtract(3, 'days');

  const processor = new MilestoneProcessor(
    DefaultProcessorOptions,
    async () => [],
    now
  );

  // process our fake milestone list
  const {operationsLeft, milestonesToAdd} = await processor.processMilestones(
    1
  );

  // processing an empty milestone list should result in 1 operation
  expect(operationsLeft).toEqual(99);
  expect(milestonesToAdd.length).toEqual(8);
  expect(milestonesToAdd[0].title).toEqual('🦆  Duck');
  expect(milestonesToAdd[1].title).toEqual('🥚  Egg');
  expect(milestonesToAdd[2].title).toEqual('🥏  Frisbee');
  expect(milestonesToAdd[3].title).toEqual('🍇  Grape');
  expect(milestonesToAdd[4].title).toEqual('🐴  Horse');
  expect(milestonesToAdd[5].title).toEqual('🦞  Lobster');
  expect(milestonesToAdd[6].title).toEqual('🗺  Map');
  expect(milestonesToAdd[7].title).toEqual('🍊  Orange');
});

test('should not create a <2 day sprint', async () => {
  // June 3 2020
  const now = DUCK && DUCK.firstDueDate.clone().subtract(1, 'day');

  const processor = new MilestoneProcessor(
    DefaultProcessorOptions,
    async () => [],
    now
  );

  // process our fake milestone list
  const {operationsLeft, milestonesToAdd} = await processor.processMilestones(
    1
  );

  // processing an empty milestone list should result in 1 operation
  expect(operationsLeft).toEqual(99);
  expect(milestonesToAdd.length).toEqual(7);
  expect(milestonesToAdd[0].title).toEqual('🥚  Egg');
  expect(milestonesToAdd[1].title).toEqual('🥏  Frisbee');
  expect(milestonesToAdd[2].title).toEqual('🍇  Grape');
  expect(milestonesToAdd[3].title).toEqual('🐴  Horse');
  expect(milestonesToAdd[4].title).toEqual('🦞  Lobster');
  expect(milestonesToAdd[5].title).toEqual('🗺  Map');
  expect(milestonesToAdd[6].title).toEqual('🍊  Orange');
});

test('single milestone list results in 7 created', async () => {
  // June 1 2020
  const now = DUCK && DUCK.firstDueDate.clone().subtract(3, 'days');

  const TestMilestoneList: Milestone[] = [
    generateMilestone(
      1234,
      1,
      '🦆  Duck',
      'First sprint',
      '2020-01-01T17:00:00Z',
      0,
      3,
      false,
      '2020-06-04T12:00:00Z'
    )
  ];

  const processor = new MilestoneProcessor(
    DefaultProcessorOptions,
    async p => (p == 1 ? TestMilestoneList : []),
    now
  );

  // Process the list
  const {milestonesToAdd} = await processor.processMilestones(1);

  expect(processor.closedMilestones.length).toEqual(1);
  expect(milestonesToAdd.length).toEqual(7);
  expect(milestonesToAdd[0].title).toEqual('🥚  Egg');
  expect(milestonesToAdd[1].title).toEqual('🥏  Frisbee');
  expect(milestonesToAdd[2].title).toEqual('🍇  Grape');
  expect(milestonesToAdd[3].title).toEqual('🐴  Horse');
  expect(milestonesToAdd[4].title).toEqual('🦞  Lobster');
  expect(milestonesToAdd[5].title).toEqual('🗺  Map');
  expect(milestonesToAdd[6].title).toEqual('🍊  Orange');
});

test('single milestone list in future cycle results in 6 created', async () => {
  // June 1 2021, a few cycles ahead and 1 week + 2 days behind the targeted
  // first milestone to be created, lobster.
  const now =
    LOBSTER &&
    LOBSTER.firstDueDate
      .clone()
      .add(16 * 3, 'weeks')
      .subtract(9, 'days');
  console.log('\n\n\n\nnow', now && now.toDate());
  const ORANGE = GLOBAL_MILESTONES_MAP.get('ORANGE');

  const dueDate =
    ORANGE &&
    ORANGE.firstDueDate
      .clone()
      .add(4 * 16, 'weeks')
      .toISOString();
  const TestMilestoneList: Milestone[] = [
    _quickGenerateMilestone(_getTitle(ORANGE), false, dueDate)
  ];

  const processor = new MilestoneProcessor(
    DefaultProcessorOptions,
    async p => (p == 1 ? TestMilestoneList : []),
    now
  );

  // Process the list
  const {operationsLeft, milestonesToAdd} = await processor.processMilestones(
    1
  );

  expect(processor.closedMilestones.length).toEqual(0);
  expect(milestonesToAdd.length).toEqual(6);
  expect(milestonesToAdd[0].title).toEqual('🦞  Lobster');
  expect(milestonesToAdd[1].title).toEqual('🗺  Map');
  expect(milestonesToAdd[2].title).toEqual('🦔  Porcupine');
  expect(milestonesToAdd[3].title).toEqual('☀️  Sun');
  expect(milestonesToAdd[4].title).toEqual('🎾  Tennis');
  expect(milestonesToAdd[5].title).toEqual('☂️  Umbrella');
});

test('dont recreate closed milestones', async () => {
  // July 2 2020
  const now = LOBSTER && LOBSTER.firstDueDate.clone().subtract(1, 'week');

  const TestMilestoneList: Milestone[] = [
    _quickGenerateMilestone(
      _getTitle(LOBSTER),
      true,
      _getFirstDueDate(LOBSTER)
    ),
    _quickGenerateMilestone(_getTitle(MAP), true, _getFirstDueDate(MAP)),
    _quickGenerateMilestone(_getTitle(ORANGE), true, _getFirstDueDate(ORANGE)),
    _quickGenerateMilestone(
      _getTitle(PORCUPINE),
      true,
      _getFirstDueDate(PORCUPINE)
    ),
    _quickGenerateMilestone(_getTitle(SUN), true, _getFirstDueDate(SUN)),
    _quickGenerateMilestone(_getTitle(TENNIS), true, _getFirstDueDate(TENNIS)),
    _quickGenerateMilestone(
      _getTitle(UMBRELLA),
      true,
      _getFirstDueDate(UMBRELLA)
    )
  ];

  const processor = new MilestoneProcessor(
    DefaultProcessorOptions,
    async p => (p == 1 ? TestMilestoneList : []),
    now
  );

  // Process the list
  const {milestonesToAdd} = await processor.processMilestones(1);

  expect(milestonesToAdd.length).toEqual(0);
});

test('create milestones if old milestones exists', async () => {
  // Nov 5 2020
  const now =
    ORANGE &&
    ORANGE.firstDueDate
      .clone()
      .add(16, 'weeks')
      .subtract(1, 'week');

  const TestMilestoneList: Milestone[] = [
    _quickGenerateMilestone(_getTitle(ORANGE), false, _getFirstDueDate(ORANGE)),
    _quickGenerateMilestone(
      _getTitle(LOBSTER),
      false,
      _getFirstDueDate(LOBSTER)
    ),
    _quickGenerateMilestone(_getTitle(MAP), false, _getFirstDueDate(MAP)),
    _quickGenerateMilestone(
      _getTitle(PORCUPINE),
      false,
      _getFirstDueDate(PORCUPINE)
    ),
    _quickGenerateMilestone(_getTitle(SUN), false, _getFirstDueDate(SUN)),
    _quickGenerateMilestone(_getTitle(TENNIS), false, _getFirstDueDate(TENNIS)),
    _quickGenerateMilestone(
      _getTitle(UMBRELLA),
      false,
      _getFirstDueDate(UMBRELLA)
    )
  ];

  const processor = new MilestoneProcessor(
    DefaultProcessorOptions,
    async p => (p == 1 ? TestMilestoneList : []),
    now
  );

  // Process the list
  const {milestonesToAdd} = await processor.processMilestones(1);

  expect(milestonesToAdd.length).toEqual(7);
});

function _getTitle(globalMilestone?: GlobalMilestone) {
  return globalMilestone && `${globalMilestone.emoji}  ${globalMilestone.name}`;
}

function _getFirstDueDate(globalMilestone?: GlobalMilestone) {
  const dueDate = globalMilestone && globalMilestone.firstDueDate;
  return dueDate && dueDate.clone().toISOString();
}

function _quickGenerateMilestone(
  title: string = 'title',
  isClosed: boolean = false,
  dueOn: string = '2020-06-04T12:00:00Z'
) {
  return generateMilestone(
    1234,
    1,
    title,
    'First sprint',
    '2020-01-01T17:00:00Z',
    0,
    1,
    isClosed,
    dueOn
  );
}
