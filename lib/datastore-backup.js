

const _ = require('lodash');
const child_process = require('child_process');
require('colors');

/**
 * create a backup of kinds from project into bucket
 *
 * @param kinds
 * @param project
 * @param bucket
 * @param options
 * @returns {string|*}
 */
const backup = (kinds, project, bucket, options) => {

  let authOptions = ' --project ' + project;
  if (!_.isUndefined(options.account)) {
    authOptions += '--account ' + options.account;
  }

  let command = 'gcloud datastore export ' + authOptions + ' --kinds="' + kinds.join(',') + '" --async gs://' + bucket;

  if (options.debug) {
    console.log(command.yellow);
    return '';
  } else {
    return child_process.execSync(command).toString('utf8');
  }
};

/**
 * test that we can restore a single kind from a backup
 *
 * @param kind
 * @param project
 * @param bucket
 * @param {string} timestamp eg  '2019-03-15T21:34:32_64802'
 * @param options
 * @returns {string} output from the commands
 */
const testRestoreFromBackup = (kind, project, bucket, timestamp, options) => {
  let restore = child_process.execSync(datastoreRestoreCommand([kind], project, bucket, timestamp, options)).toString('utf8');
  let status = child_process.execSync(datastoreStatusCommand(project, options));
  return restore + "\n" + status;
};

const datastoreRestoreCommand = (kinds, project, bucket, timestamp, options) => {
  let authOptions = ' --project ' + project;
  if (!_.isUndefined(options.account)) {
    authOptions += '--account ' + options.account;
  }
  let backupMetadataFile = 'gs://' + bucket + '/' + timestamp + '/' + timestamp + '.overall_export_metadata'
  return 'gcloud datastore import ' + authOptions + ' --kinds="' + kinds.join(',') + '" --async ' + backupMetadataFile ;
};

const datastoreStatusCommand = (project, options) => {
  let authOptions = '';
  if (options.account) {
    authOptions += ' --account \' + options.account';
  }
  authOptions += ' --project ' + project;
  return 'gcloud datastore operations ' + authOptions + ' list';
};

module.exports.backup = backup;
module.exports.testRestoreFromBackup = testRestoreFromBackup;
module.exports.datastoreRestoreCommand = datastoreRestoreCommand;
module.exports.datastoreStatusCommand = datastoreStatusCommand;
