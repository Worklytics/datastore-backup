const child_process = require('child_process');
const _ = require('lodash');

/**
 * helpers to handle arguments
 */

/**
 * valid that frequency is defined in backupSchedule
 * @param backupSchedule
 * @param frequency
 */
const validateFrequency  = (backupSchedule, frequency) => {
  if (_.isUndefined(backupSchedule[frequency])) {
    console.log(('Frequency value (' + frequency + ') unknown!').red);
  }
}

/**
 * extract projectId from options in program, or determine it from gcloud context
 *
 * @param program
 * @returns {string}
 */
const getProjectId = (program) => {
  let projectId = program.projectId;
  if (!projectId) {
    projectId = child_process.execSync('gcloud config get-value project 2> /dev/null').toString('utf8');
  }
  return projectId;
}

/**
 * determine backupBucket based on program options, projectId, and frequency
 *
 * @param program
 * @param projectId
 * @param frequency
 * @returns {string}
 */
const getBackupBucket = (program, projectId, frequency) => {
  let prefix = program.bucketPrefix || `${projectId}_backup`;
  return `${prefix}_${frequency}`;
}

module.exports.getProjectId = getProjectId;
module.exports.getBackupBucket = getBackupBucket;
module.exports.validateFrequency = validateFrequency;
