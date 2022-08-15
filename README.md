# Event souring project in ES

## Tools
- [fp-ts](https://gcanti.github.io/fp-ts/)
- [ts-pattern](https://github.com/gvergnaud/ts-pattern)
- [Jest](https://jestjs.io/)
- [Jest Testcontainers](https://github.com/Trendyol/jest-testcontainers/)
- [node-postgres](https://node-postgres.com/)
- [Node-Pg-Migrate](https://salsita.github.io/node-pg-migrate/)

Project example with this tools : [nodejs-postgresql-testcontainers](https://github.com/Yengas/nodejs-postgresql-testcontainers))

## Next steps

- ☑️ Append several events at a time (bulk insert)
- ▢ Better typings
- ▢ Review of the event types
- ☑️ show that we need to check the version before we append the events in the event store
  - ☑️ With property based testing
- ▢ show that we need snapshots
  - ☑️ With big event stream (generated?, tools?)
- ☑️ handle snapshot invalidation (through versioning by apply function hash ?)
- ▢ Find faster serialization protocol (faster than JSON)
- ▢ Handle upcasters (without deserialization)
- ▢ handle projections
- ▢ Try to compose the list of todos with several deciders
- ▢ How to handle information computed from the current time ?
