# datastore-backup
npm script to backup/restore Google Cloud Datastore, across multiple projects 


## Installation

Globally, so can run from cmd line:
```sh
npm install -g Worklytics/datastore-backup
```

## Usage

### Configure

You must define the following configuration in JSON:

  - `backup-schedule.json` : although we call this a "schedule", it's really a set of JSON lists of entity names
 , each of which defines a group of entities to be used as a unit for backup purposes (at the same time, to the
  same GCS bucket, restored collectively, etc).  The object keys  ("daily", "monthly", etc ) are arbitrary - you can
   change them to whatever you want. The frequency will really depend on when you run this script; usual case would
    be to put it on a cron

Implicitly, script will rely on your environments `gcloud` authorization. See [gcloud auth](http://cloud.google.com
/sdk/gcloud/reference/auth). Recommended approach is to use a service account authorized with only the IAM roles needed to
execute backups. 



### Run

Proper installation:

```sh
datastore-backup -- backup daily --backupSchedule ~/backup-schedule.json
```

From dev checkout:

```
npm run datastore-backup -- backup daily --backupSchedule ~/backup-schedule.json
```

### Audit
Lists actual backups that exist in target bucket, to verify backups being run as expected:
```
datastore-backup list quarterly --backupSchedule ./backup-schedule.json
```

### Test
Does an actual restore of just a single entity type
```
node index.js test daily 2019-08-21T19:18:29_50232 Person
```

### Restore
Prints commands to use to execute full restore
```
node index.js restore daily 2019-08-21T19:18:29_50232
```
