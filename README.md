# datastore-backup
npm script to backup/restore Google Cloud Datastore, across multiple projects 


## Installation

```sh
npm install Worklytics/datastore-backup
```

## Usage

### Configure

You must define the following two configuration files in JSON, to configure GCP settings for your Cloud Datastore
 projects and where the files are.

 1. `config.json` : see examples/config.json for structure.
 2. `backup-schedule.json` : although we call this a "schedule", it's really a set of JSON lists of entity names
 , each of which defines a group of entities to be used as a unit for backup purposes (at the same time, to the
  same GCS bucket, restored collectively, etc).  The object keys  ("daily", "monthly", etc ) are arbitrary - you can
   change them to whatever you want. The frequency will really depend on when you run this script; usual case would
    be to put it on a cron

### Run
```sh
npm run datastore-backup -- backup staging daily --configFile ~/config.json --backupSchedule ~/backup-schedule.json
```
