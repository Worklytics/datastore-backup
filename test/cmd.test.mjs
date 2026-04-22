import { describe, it, expect } from 'vitest';
import { getProjectId, getBackupBucket, validateFrequency } from '../lib/cmd.js';

describe('getProjectId', () => {
  it('parses from program', () => {
    expect(getProjectId({ projectId: 'some-project-id' })).toBe('some-project-id');
  });
});

describe('validateFrequency', () => {
  it('passes when frequency exists', () => {
    expect(() => {
      validateFrequency({ daily: ['Entity'] }, 'daily');
    }).not.toThrow();
  });

  it('throws when frequency is missing', () => {
    expect(() => {
      validateFrequency({ daily: ['Entity'] }, 'weekly');
    }).toThrow(/unknown/);
  });
});

describe('getBackupBucket', () => {
  it('parses from program', () => {
    expect(
      getBackupBucket({ bucketPrefix: 'project_backups' }, 'some-project-id', 'daily'),
    ).toBe('project_backups_daily');
  });

  it('generates bucket id from project-id, if program does not specificy prefix', () => {
    expect(getBackupBucket({}, 'some-project-id', 'daily')).toBe('some-project-id_backup_daily');
  });
});
