import 'colors';

import _ from 'lodash';
import child_process from 'node:child_process';

/**
 * helpers to handle arguments
 */

/**
 * valid that frequency is defined in backupSchedule
 * @param backupSchedule
 * @param frequency
 */
export const validateFrequency = (backupSchedule, frequency) => {
  if (_.isUndefined(backupSchedule[frequency])) {
    const msg = 'Frequency value (' + frequency + ') unknown!';
    console.log(msg.red);
    throw new Error(msg);
  }
};

/**
 * extract projectId from options in program, or determine it from gcloud context
 *
 * @param program
 * @returns {string}
 */
export const getProjectId = (program) => {
  let projectId = program.projectId;
  if (!projectId) {
    projectId = child_process.execSync('gcloud config get-value project 2> /dev/null').toString('utf8').trim();
  }
  return projectId;
};

/**
 * determine backupBucket based on program options, projectId, and frequency
 *
 * @param program
 * @param projectId
 * @param frequency
 * @returns {string}
 */
export const getBackupBucket = (program, projectId, frequency) => {
  let prefix = program.bucketPrefix || `${projectId}_backup`;
  return `${prefix}_${frequency}`;
};
