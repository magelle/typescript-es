# Event souring project in ES

## Tools
- [Jest](https://jestjs.io/)
- [Jest Testcontainers](https://github.com/Trendyol/jest-testcontainers/)
- [node-postgres](https://node-postgres.com/)
- [Node-Pg-Migrate](https://salsita.github.io/node-pg-migrate/)

Project example with this tools : [nodejs-postgresql-testcontainers](https://github.com/Yengas/nodejs-postgresql-testcontainers))

## Next steps

- ▢ Append several events at a time (bulk insert)
- ▢ Better typings
- ▢ Review of the event types
- ▢ show that we need to check the version before we append the events in the event store
  - ▢ With property based testing
- ▢ show that we need snapshots
  - ▢ With big event stream (generated?, tools?)
- ▢ handle snapshot invalidation (through versioning by apply function hash ?)
- ▢ Handle upcasters (without deserialization)
- ▢ handle projections

- ▢ How to handle informations computed from the current time ?
- 
