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

const { Command } = require('commander');
const program = new Command();
const child_process = require('child_process');
const fs = require('fs');
const colors = require('colors');

const { getProjectId, getBackupBucket, validateFrequency } = require('./lib/cmd');
const { backup, testRestoreFromBackup, datastoreRestoreCommand, datastoreStatusCommand } = require('./lib/datastore-backup');

// custom loadJsonFile function:
async function loadJsonFile(path) {
  const data = await fs.promises.readFile(path, 'utf8');
  return JSON.parse(data);
}

// global options
program
  .option('--projectId <projectId>', 'GCP project - if omitted, will infer')
  .option('--bucketPrefix <bucketPrefix>', 'Prefix of bucket in which backups stored; if omitted, will default to {{project}}')
  .option('--debug', 'Debug', false)
  .option('--backupSchedule <backupSchedule>', 'Backup schedule', 'backup-schedule.json');

// Backup command
program
  .command('backup <frequency>')
  .action(async (frequency) => {
    try {
      const opts = program.opts();
      const BACKUP_SCHEDULE = await loadJsonFile(opts.backupSchedule);
      validateFrequency(BACKUP_SCHEDULE, frequency);

      let options = { debug: opts.debug };
      let projectId = getProjectId(opts);
      let bucket = getBackupBucket(opts, projectId, frequency);

      backup(BACKUP_SCHEDULE[frequency], projectId, bucket, options).then(([operation, apiResponse]) => {
        console.log(`Backups started ${apiResponse.name}; use the following commands to monitor progress:`);
        console.log('\t' + datastoreStatusCommand(projectId, options));
      });
    } catch (err) {
      console.error(colors.red('Backup failed:'), err);
      process.exit(1);
    }
  });

// Restore command
program
  .command('restore <frequency>')
  .option('--timestamp <timestamp>', 'Timestamp')
  .action(async (frequency, cmdObj) => {
    try {
      const opts = program.opts();
      console.log(colors.red("*** Doesn't run anything; just generates example cmd for env ***"));
      let options = { account: opts.account };
      let timestamp = cmdObj.timestamp || colors.cyan('{{timestamp_of_backup}}');

      const BACKUP_SCHEDULE = await loadJsonFile(opts.backupSchedule);
      validateFrequency(BACKUP_SCHEDULE, frequency);

      let projectId = getProjectId(opts);
      let bucket = getBackupBucket(opts, projectId, frequency);

      if (!cmdObj.timestamp) {
        console.log('replace ' + colors.cyan('{{timestamp_of_backup}}') + ' with the file you want (specific to each deployment)');
      }
      console.log(datastoreRestoreCommand(BACKUP_SCHEDULE[frequency], projectId, bucket, timestamp, options));
      console.log('\t monitor status: '.blue + datastoreStatusCommand(projectId, options));
    } catch (err) {
      console.error(colors.red('Restore failed:'), err);
      process.exit(1);
    }
  });

// Test command
program
  .command('test <frequency> <timestamp> <entityName>')
  .action(async (frequency, timestamp, entityName) => {
    try {
      const opts = program.opts();
      let options = { account: opts.account };

      const BACKUP_SCHEDULE = await loadJsonFile(opts.backupSchedule);
      validateFrequency(BACKUP_SCHEDULE, frequency);

      let projectId = getProjectId(opts);
      let bucket = getBackupBucket(opts, projectId, frequency);

      console.log(testRestoreFromBackup(entityName, projectId, bucket, timestamp, options));
      console.log('\t monitor status: '.blue + datastoreStatusCommand(projectId, options));
    } catch (err) {
      console.error(colors.red('Test failed:'), err);
      process.exit(1);
    }
  });

// List command
program
  .command('list <frequency>')
  .action(async (frequency) => {
    try {
      const opts = program.opts();
      const BACKUP_SCHEDULE = await loadJsonFile(opts.backupSchedule);
      validateFrequency(BACKUP_SCHEDULE, frequency);

      let projectId = getProjectId(opts);
      let bucket = getBackupBucket(opts, projectId, frequency);

      let bucketPrefix = `gs://${bucket}/`;
      let files = child_process.execSync('gsutil ls ' + bucketPrefix).toString('utf8');
      files = files.replace(/\n/g, '\n\t');
      files = files.replace(new RegExp(bucketPrefix, 'g'), '');
      console.log(projectId + ': \r\n\t' + files);
    } catch (err) {
      console.error(colors.red('List failed:'), err);
      process.exit(1);
    }
  });

async function main() {
  await program.parseAsync(process.argv);
}

main();
