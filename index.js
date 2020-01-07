/**
 * script to backup Cloud Datastore entities to a GCS bucket
 *
 * to backup production:
 *   node index.js backup prod daily --configFile config.json
 *
 * to automate backups, we can put deploy this as a GAE application (even a nodejs GAE app), with a monthly cron
 * to run the backups
 *
 * to restore backups:
 *   1. Prior to attempting restoration, make another backup of the entities you intend to restore.
 *   2. Put up a “Temporarily Unavailable” message on the website
 *   3. Restore using this tool
 *      node tools/backups/index.js restore prod
 *   4. Flush memcache
 *
 * to test backups:
 *   node index.js test staging daily {{project-id}} 2019-08-21T19:18:29_50232
 *
 * to list available backups:
 *   node tools/backups/index.js list staging daily
 *
 * @see Information Security - Framework of Controls "https://docs.google.com/document/d/1QKvURL6rhhpYaonaQ9_xU6QwCdqgecz0jB5Cz44Skds/edit#bookmark=id.4z7k66o8z0uz"
 *   - this implements the requirements of that policy for the Worklytics application/platform
 *
 *
 * @type {commander.CommanderStatic | commander}
 */
const program = require('commander');
const child_process = require('child_process');
const loadJsonFile = require('load-json-file');
const _ = require('lodash');
const colors = require('colors');  // @see "https://www.npmjs.com/package/colors"

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

/**
 * create a backup
 *
 * idea to install this node script somewhere (data-work-1)?, and put it on a cron to backup monthly/weekly)
 */
program
  .command('backup <env> <frequency>')
  .option('--account [account]', 'GCP account')
  .option('--debug', 'Debug', false)
  .option('--configFile [configFile]', 'Config file', '../config.json')
  .option('--backupSchedule [backupSchedule]', 'Backup schedule', '../backup-schedule.json')
  .action(async (env, frequency, invocation) => {
    const ENV_CONFIG = await loadJsonFile(invocation.configFile);
    const BACKUP_SCHEDULE = await loadJsonFile(invocation.backupSchedule);

    validateFrequency(frequency);

    let options = {
      account: invocation.account,
      debug: invocation.debug,
    };

    let config = ENV_CONFIG[env];

    _.each(config.deployments, (deployment) => {
      //this will output diagnostic info about the backup job
      // see https://cloud.google.com/datastore/docs/export-import-entities#async-flag for more info
      let bucket = `${deployment.backupBucketPrefix}_${frequency}`;
      console.log(backup(BACKUP_SCHEDULE[frequency], deployment.projectId, bucket, options));
    });

    console.log('Backups started; use the following commands to monitor progress:')
    _.each(config.deployments, (deployment) => {
      console.log('\t' + datastoreStatusCommand(deployment.projectId, options));
    })
  });

/**
 * restore from backups (give example command; you must lookup the actual metadata file)
 */
program
  .command('restore <env> <frequency>')
  .option('--account [account]', 'GCP account')
  .option('--timestamp [timestamp>', 'Timestamp')
  .option('--configFile [configFile]', 'Config file', '../config.json')
  .action(async (env, frequency, invocation) => {
    console.log("*** Doesn't run anything; just generates example cmd for env ***".red);
    let options = {
      account: invocation.account
    };

    let timestamp = invocation.timestamp || '{{timestamp_of_backup}}'.cyan;

    validateFrequency(frequency);

    let config = await loadJsonFile(invocation.configFile);
    _.each(config[env].deployments, (deployment) => {
      if (!invocation.timestamp) {
        console.log('replace ' + '{{timestamp_of_backup}}'.cyan + ' with the file you want (specific to each deployment)');
      }
      let bucket = `${deployment.backupBucketPrefix}_${frequency}`;
      console.log(datastoreRestoreCommand(BackupSchedule[frequency], deployment.project, bucket, timestamp, options));
      console.log('\t monitor status: '.blue + datastoreStatusCommand(deployment.project, options));
    });
  });



/**
 * test that can recover an entity kind from a backup.
 *
 * take the timestamp from inspecting the GCS bucket, or it's in the output of the backup command
 *
 * to verify, use the monitoring status command and inspect for a "state: SUCCESSFUL" of your test
 *
 */
program
  .command('test <env> <frequency> <projectId> <timestamp> <entityName>')
  .option('--account [account]', 'GCP account')
  .option('--configFile [configFile]', 'Config file', '../config.json')
  .action(async (env, frequency, projectId, timestamp, entityName, invocation) => {
    let options = {
      account: invocation.account,
    };

    validateFrequency(frequency);

    let config = await loadJsonFile(invocation.configFile);
    _.each(config[env].deployments, (deployment) => {
      if (deployment.project == projectId) {
        let bucket = `${deployment.backupBucketPrefix}_${frequency}`;
        console.log(testRestoreFromBackup(entityName, deployment.project, bucket, timestamp, options));
        console.log('\t monitor status: '.blue + datastoreStatusCommand(deployment.project, options));
      }
    });
  });

/**
 * list available backups in an env
 */
program
  .command('list <env> <frequency>')
  .option('--account [account]', 'GCP account')
  .option('--configFile [configFile]', 'Config file', '../config.json')
  .action(async (env, frequency, invocation) => {
    validateFrequency(frequency);

    let config = await loadJsonFile(invocation.configFile);
    _.each(config[env].deployments, (deployment) => {
      let bucketPrefix = `gs://${deployment.backupBucketPrefix}-${frequency}/`;
      let files = child_process.execSync('gsutil ls ' + bucketPrefix).toString('utf8');
      files = files.replace(/\n/g, '\n\t');
      files = files.replace(new RegExp(bucketPrefix,  'g'), '');
      console.log(deployment.projectId + ': \r\n\t' + files);
    });
  });

program.parse(process.argv);

let validateFrequency = (frequency) => {
  if (_.isUndefined(BackupSchedule[frequency])) {
    console.log(('Frequency value (' + frequency + ') unknown!').red);
  }
}
