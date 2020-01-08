
require('should');

const {getProjectId, getBackupBucket, validateFrequency} = require('../lib/cmd');

describe('getProjectId', () => {
  it ('parses from program', () => {
    getProjectId({projectId : 'some-project-id'}).should.equal('some-project-id');
  });

});

describe('getBackupBucket', () => {
  it ('parses from program', () => {

    getBackupBucket({bucketPrefix: 'project_backups'}, 'some-project-id', 'daily')
      .should.equal('project_backups_daily');
  });

  it('generates bucket id from project-id, if program does not specificy prefix', () => {
    getBackupBucket({}, 'some-project-id', 'daily')
      .should.equal('some-project-id_backup_daily');
  });
});

