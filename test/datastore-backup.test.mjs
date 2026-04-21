import { describe, it, expect } from 'vitest';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { datastoreRestoreCommand } = require('../lib/datastore-backup.js');

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
});
