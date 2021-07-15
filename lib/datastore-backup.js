

const _ = require('lodash');
const child_process = require('child_process');
require('colors');
// Imports the Google Cloud client library
// @see https://googleapis.dev/nodejs/datastore/latest/
const {Datastore} = require('@google-cloud/datastore');

/**
 * create a backup of kinds from project into bucket; depends only on Datastore API client, rather
 * than calling anything on cmd line - so could be run in NodeJS env that can't call out to OS
 * (eg, Cloud Functions or something)
 *
 * @param kinds
 * @param project
 * @param bucket
 * @param options
 * @returns {string|*}
 */
const backup = async (kinds, project, bucket, options) => {

  const datastore = new Datastore({projectId : project});

  try {
    return datastore.export({
      bucket: {
        name: bucket,
      },
      kinds: kinds
    });
  } catch (err) {
    console.error('ERROR:', err);
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
  return 'gcloud datastore operations' + authOptions + ' list';
};

module.exports.backup = backup;
module.exports.testRestoreFromBackup = testRestoreFromBackup;
module.exports.datastoreRestoreCommand = datastoreRestoreCommand;
module.exports.datastoreStatusCommand = datastoreStatusCommand;
