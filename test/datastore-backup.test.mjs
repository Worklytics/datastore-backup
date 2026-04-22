import { describe, it, expect } from 'vitest';
import { datastoreRestoreCommand, datastoreStatusCommand } from '../lib/datastore-backup.js';

describe('datastoreRestoreCommand', () => {
  it('produces expected command', () => {
    const cmd = datastoreRestoreCommand(
      ['EntityA', 'EntityB'],
      'gae-project',
      'gae-project_backup',
      '2020-01-01T00:00:00Z',
      {},
    );
    expect(cmd).toBe(
      'gcloud datastore import  --project gae-project --kinds="EntityA,EntityB" --async gs://gae-project_backup/2020-01-01T00:00:00Z/2020-01-01T00:00:00Z.overall_export_metadata',
    );
  });

  it('includes spaced --account when account option is set', () => {
    const cmd = datastoreRestoreCommand(
      ['EntityA'],
      'gae-project',
      'gae-project_backup',
      '2020-01-01T00:00:00Z',
      { account: 'svc@gae-project.iam.gserviceaccount.com' },
    );
    expect(cmd).toBe(
      'gcloud datastore import  --project gae-project --account svc@gae-project.iam.gserviceaccount.com --kinds="EntityA" --async gs://gae-project_backup/2020-01-01T00:00:00Z/2020-01-01T00:00:00Z.overall_export_metadata',
    );
    expect(cmd).toMatch(/ --account /);
    expect(cmd).not.toMatch(/project--account/);
  });
});

describe('datastoreStatusCommand', () => {
  it('includes spaced --account when account option is set', () => {
    const cmd = datastoreStatusCommand('gae-project', {
      account: 'svc@gae-project.iam.gserviceaccount.com',
    });
    expect(cmd).toBe(
      'gcloud datastore operations --account svc@gae-project.iam.gserviceaccount.com --project gae-project list',
    );
    expect(cmd).toMatch(/ --account /);
    expect(cmd).toMatch(/ --project /);
  });

  it('produces expected command without account', () => {
    expect(datastoreStatusCommand('gae-project', {})).toBe(
      'gcloud datastore operations --project gae-project list',
    );
  });
});
