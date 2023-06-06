# Event sourcing project in ES

## Tools
- [fp-ts](https://gcanti.github.io/fp-ts/)
- [ts-pattern](https://github.com/gvergnaud/ts-pattern)
- [Jest](https://jestjs.io/)
- [Jest Testcontainers](https://github.com/Trendyol/jest-testcontainers/)
- [node-postgres](https://node-postgres.com/)
- [Node-Pg-Migrate](https://salsita.github.io/node-pg-migrate/)

Project example with this tools : [nodejs-postgresql-testcontainers](https://github.com/Yengas/nodejs-postgresql-testcontainers))

## To do profiling

- add ```--prof``` as node option
- run a test
- run ```node --prof-process --preprocess -j isolate*.log > profile.v8log.json``` to extract info
- open it with https://www.speedscope.app/ or chrome de tools

## Next steps

- [x] Append several events at a time (bulk insert)
- [ ] Better typings
  - [ ] with zod
- [ ] Review of the event types 
- [x]️ show that we need to check the version before we append the events in the event store
  - [x]️ With property based testing
- [ ] show that we need snapshots (hard to do on local)
  - [x]️ With big event stream (generated)
- [x]️ handle snapshot invalidation (through versioning by apply function hash ?)
- [x]️ Find faster serialization protocol (faster than JSON) : 
  - [x] BSON
  - [x] MessagePack
- [ ] Handle upcasters (without deserialization)
- [ ] handle Views (Instant and stored) and make an exemple
  - [ ] Stored views with states updates
  - [ ] Stored views with partial updates
- [ ] handle (Processes) and make an exemple
- [x]️ Try to compose the list of todos with several deciders
- [ ] How to handle information computed from the current time ?

