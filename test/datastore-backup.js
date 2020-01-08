
require('should');

const {backup, testRestoreFromBackup, datastoreRestoreCommand, datastoreStatusCommand} = require('../lib/datastore-backup');


describe('datastoreRestoreCommand', () => {

  it ('produces expected command', () => {

    let cmd = datastoreRestoreCommand(['EntityA', 'EntityB'], 'gae-project', 'gae-project_backup', '2020-01-01T00:00:00Z', {});
    cmd.should.equal('gcloud datastore import  --project gae-project --kinds="EntityA,EntityB" --async gs://gae-project_backup/2020-01-01T00:00:00Z/2020-01-01T00:00:00Z.overall_export_metadata');
  })
});
