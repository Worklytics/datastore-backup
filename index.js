#!/usr/bin/env node
/**
 * script to backup Cloud Datastore entities to a GCS bucket
 *
 * to backup production:
 *   node index.js backup daily
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
 *   node index.js test daily 2019-08-21T19:18:29_50232 Person
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



const {getProjectId, getBackupBucket, validateFrequency} = require('./lib/cmd');
const {backup, testRestoreFromBackup, datastoreRestoreCommand, datastoreStatusCommand} = require('./lib/datastore-backup');

//global options
program
  .option('--projectId <projectId>', 'GCP project - if omitted, will infer')
  .option('--bucketPrefix <bucketPrefix>', 'prefix of bucket in which backups stored; if omitted, will default to {{project}}//this will output diagnostic info about the backup job\n' +
    '      // see https://cloud.google.com/datastore/docs/export-import-entities#async-flag for more info\n' +
    '      let bucket = `${deployment.backupBucketPrefix}_${frequency}`;')
  .option('--debug', 'Debug', false)
  .option('--backupSchedule <backupSchedule>', 'Backup schedule', 'backup-schedule.json')

/**
 * create a backup
 */
program
  .command('backup <frequency>')
  .action( async (frequency) => {
    const BACKUP_SCHEDULE = await loadJsonFile(program.backupSchedule);

    validateFrequency(BACKUP_SCHEDULE, frequency);

    let options = {
      debug: program.debug,
    };

    let projectId = getProjectId(program);
    let bucket = getBackupBucket(program, projectId, frequency);

    //this will output diagnostic info about the backup job
    // see https://cloud.google.com/datastore/docs/export-import-entities#async-flag for more info


    backup(BACKUP_SCHEDULE[frequency], projectId, bucket, options).then(([operation, apiResponse]) => {
      console.log(`Backups started ${apiResponse.name}; use the following commands to monitor progress:`);
      console.log('\t' + datastoreStatusCommand(projectId, options));
    });
  });

/**
 * restore from backups (give example command; you must lookup the actual metadata file)
 */
program
  .command('restore <frequency>')
  .option('--timestamp [timestamp>', 'Timestamp')
  .action(async (frequency, cmdObj) => {
    console.log("*** Doesn't run anything; just generates example cmd for env ***".red);
    let options = {
      account: program.account
    };

    let timestamp = cmdObj.timestamp || '{{timestamp_of_backup}}'.cyan;

    const BACKUP_SCHEDULE = await loadJsonFile(program.backupSchedule);
    validateFrequency(BACKUP_SCHEDULE, frequency);

    let projectId = getProjectId(program);
    let bucket = getBackupBucket(program, projectId, frequency);

    if (!invocation.timestamp) {
      console.log('replace ' + '{{timestamp_of_backup}}'.cyan + ' with the file you want (specific to each deployment)');
    }
    console.log(datastoreRestoreCommand(BackupSchedule[frequency], projectId, bucket, timestamp, options));
    console.log('\t monitor status: '.blue + datastoreStatusCommand(projectId, options));
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
  .command('test <frequency> <timestamp> <entityName>')
  .action(async (frequency, timestamp, entityName) => {
    let options = {
      account: program.account,
    };

    const BACKUP_SCHEDULE = await loadJsonFile(program.backupSchedule);
    validateFrequency(BACKUP_SCHEDULE, frequency);

    let projectId = getProjectId(program);
    let bucket = getBackupBucket(program, projectId, frequency);

    console.log(testRestoreFromBackup(entityName, projectId, bucket, timestamp, options));
    console.log('\t monitor status: '.blue + datastoreStatusCommand(projectId, options));
  });

/**
 * list available backups in project
 */
program
  .command('list <frequency>')
  .action(async (frequency) => {
    const BACKUP_SCHEDULE = await loadJsonFile(program.backupSchedule);
    validateFrequency(BACKUP_SCHEDULE, frequency);

    let projectId = getProjectId(program);
    let bucket = getBackupBucket(program, projectId, frequency);

    let bucketPrefix = `gs://${bucket}/`;
    let files = child_process.execSync('gsutil ls ' + bucketPrefix).toString('utf8');
    files = files.replace(/\n/g, '\n\t');
    files = files.replace(new RegExp(bucketPrefix,  'g'), '');
    console.log(projectId + ': \r\n\t' + files);
  });

//q: is this redirection even needed?
async function main() {
    await program.parseAsync(process.argv);
};

main();


