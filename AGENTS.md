# AGENTS

This document explains the repository structure and context for AI agents working with the `datastore-backup` tool.

## Purpose

The primary purpose of this tool is to back up a **subset of entities** from Google Cloud Datastore (or Firestore in Datastore mode) rather than an entire database. It allows specifying specific entities and groups them into "backup schedules" or schedules representing logical groupings of data to export together.

If the goal is to back up an entire database en masse, this simple Node.js script is generally not the recommended approach. Instead, administrators should prefer [Firestore scheduled backups](https://cloud.google.com/firestore/docs/manage-data/scheduled-backups) or native Datastore export jobs.

## Repository Structure

- `index.js`: The main entry point and CLI wrapper. Uses `commander` to parse arguments and define commands for backing up, restoring, auditing (`list`), and testing restores.
- `lib/cmd.js`: Helper functions for parsing command line arguments and extracting things like Google Cloud project IDs and bucket names.
- `lib/datastore-backup.js`: Core programmatic logic that interfaces with `@google-cloud/datastore` to execute export operations and execute validation commands via `gcloud`.
- `test/`: Contains the test suite files (currently using Mocha + Should). Tests validate configuration parsing and command generation.
- `examples/`: Example configuration files like `backup-schedule.json`.

## Technical Details

- **Dependencies**: Uses `@google-cloud/datastore` for interacting with the Google Cloud Datastore API and executes some `gcloud` CLI commands via `child_process.execSync` for testing and restoration outputs.
- **Testing**: Test suite verifies the core configuration logic but does not automatically hit live GCP endpoints unless explicitly configured.
- **CI**: There is a GitHub Actions workflow that runs standard `npm test` checks.
