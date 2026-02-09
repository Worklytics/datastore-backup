

const _ = require('lodash');
const child_process = require('child_process');
require('colors');
// Imports the Google Cloud client library
// @see https://googleapis.dev/nodejs/datastore/latest/
const {Datastore} = require('@google-cloud/datastore');

/**
 * Execute a gcloud command safely without invoking a shell.
 *
 * @param {string[]} args
 * @returns {string} stdout as UTF-8 string
 */
const execGcloud = (args) => {
  const result = child_process.spawnSync('gcloud', args, { encoding: 'utf8' });
  if (result.error) {
    throw result.error;
  }
  if (result.status !== 0) {
    const stderr = result.stderr || '';
    const stdout = result.stdout || '';
    throw new Error(`gcloud ${args.join(' ')} failed with code ${result.status}: ${stderr || stdout}`);
  }
  return result.stdout || '';
};

/**
 * Build argument list for gcloud datastore import.
 *
 * @param {string[]} kinds
 * @param {string} project
 * @param {string} bucket
 * @param {string} timestamp
 * @param {object} options
 * @returns {string[]}
 */
const buildDatastoreRestoreArgs = (kinds, project, bucket, timestamp, options) => {
  const args = ['datastore', 'import', '--project', project];
  if (options && !_.isUndefined(options.account)) {
    args.push('--account', options.account);
  }
  const kindsValue = kinds.join(',');
  args.push('--kinds', kindsValue);
  args.push('--async');
  const backupMetadataFile = 'gs://' + bucket + '/' + timestamp + '/' + timestamp + '.overall_export_metadata';
  args.push(backupMetadataFile);
  return args;
};

/**
 * Build argument list for gcloud datastore operations list.
 *
 * @param {string} project
 * @param {object} options
 * @returns {string[]}
 */
const buildDatastoreStatusArgs = (project, options) => {
  const args = ['datastore', 'operations', 'list', '--project', project];
  if (options && options.account) {
    args.push('--account', options.account);
  }
  return args;
};

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
  const restoreArgs = buildDatastoreRestoreArgs([kind], project, bucket, timestamp, options || {});
  const restore = execGcloud(restoreArgs);
  const statusArgs = buildDatastoreStatusArgs(project, options || {});
  const status = execGcloud(statusArgs);
  return restore + "\n" + status;
};

/**
 * Build a printable gcloud datastore import command string.
 *
 * This is intended for display to the user (for example, in index.js),
 * not for execution via a shell.
 *
 * @param {string[]} kinds
 * @param {string} project
 * @param {string} bucket
 * @param {string} timestamp
 * @param {object} options
 * @returns {string}
 */
const datastoreRestoreCommand = (kinds, project, bucket, timestamp, options) => {
  const args = buildDatastoreRestoreArgs(kinds, project, bucket, timestamp, options || {});
  return 'gcloud ' + args.map(String).join(' ');
};

/**
 * Build a printable gcloud datastore operations list command string.
 *
 * This is intended for display to the user (for example, in index.js),
 * not for execution via a shell.
 *
 * @param {string} project
 * @param {object} options
 * @returns {string}
 */
const datastoreStatusCommand = (project, options) => {
  const args = buildDatastoreStatusArgs(project, options || {});
  return 'gcloud ' + args.map(String).join(' ');
};

module.exports.backup = backup;
module.exports.testRestoreFromBackup = testRestoreFromBackup;
module.exports.datastoreRestoreCommand = datastoreRestoreCommand;
module.exports.datastoreStatusCommand = datastoreStatusCommand;
