import {fc} from '@fast-check/jest';
import {PostgreSQLAdapter} from "../../framework/postgresql/adapter/postgresql.adapter";
import {PostgresEventStoreWithVersion} from "../../framework/postgresql/eventstore/PostgresEventStoreWithVersion";
import {EventStore} from "../../framework/framework";
import {CounterCommand, counterDecider, CounterEvent, CounterState} from "./counter";
import * as _ from "lodash";
import {Arbitrary} from "fast-check";
import {v4 as uuidv4} from 'uuid';
import {buildPostgresqlAdapter} from "../buildPostgresqlAdapter";
import {WithEventStoreInMemory} from "../../framework/03-with-event-store-in-memory/withEventStoreInMemory";
import {WithEventStoreAndVersion} from "../../framework/02-with-event-store-and-version/withEventStoreAndVersion";
import {WithSnapshots} from "../../framework/04-with-snapshots/WithSnapshots";
import {PostgresSnapshots} from "../../framework/postgresql/snapshots/PostgresSnapshots";
import {Snapshots} from "../../framework/04-with-snapshots/snapshots";
import {WithSnapshotsInContainers} from "../../framework/05-with-snapshots-in-containers/WithSnapshotsInContainers";
import {SnapshotsWithContainer} from "../../framework/05-with-snapshots-in-containers/snapshotsWithContainer";
import {PostgresSnapshotsWithContainer} from "../../framework/postgresql/snapshots/PostgresSnapshotsWithContainer";
import {JSONSerializer} from "../../framework/postgresql/serializer/JSONSerializer";

if (!fc.readConfigureGlobal()) {
    // Global config of Jest has been ignored, we will have a timeout after 5000ms
    // (CodeSandbox falls in this category)
    fc.configureGlobal({interruptAfterTimeLimit: 4000});
}

describe('Counter event sourcing', () => {
    let postgreSQLAdapter: PostgreSQLAdapter;
    let eventStore: PostgresEventStoreWithVersion<CounterEvent>;
    let snapshots: Snapshots<CounterState>;
    let snapshotsWithContainer: SnapshotsWithContainer<CounterState>;
    let es: EventStore<CounterCommand, CounterEvent>

    beforeAll(async () => {
        postgreSQLAdapter = await buildPostgresqlAdapter();
        eventStore = new PostgresEventStoreWithVersion(
            postgreSQLAdapter,
            new JSONSerializer()
        );
        snapshots = new PostgresSnapshots(
            postgreSQLAdapter,
            new JSONSerializer()
        );
        snapshotsWithContainer = new PostgresSnapshotsWithContainer(
            postgreSQLAdapter,
            new JSONSerializer()
        );
    })

    afterAll(async () => {
        await postgreSQLAdapter.close();
    })

    it('counter value should be under 1000', async () => {
        await fc.assert(
            fc.asyncProperty(RandomCommands, fc.scheduler(), async (commands, s) => {
                const streamName = uuidv4().toString()

                const loadEvents = s.scheduleFunction(eventStore.loadEvents)
                const stream = s.scheduleFunction(eventStore.stream)
                const tryAppendEvents = s.scheduleFunction(eventStore.tryAppendEvents)

                es = new WithEventStoreInMemory<CounterCommand, CounterState, CounterEvent>(counterDecider, streamName, {
                    loadEvents,
                    stream,
                    tryAppendEvents
                })

                function tryHandle(c: CounterCommand): Promise<CounterEvent[]> {
                    return es.handle(c).catch(e => {
                        console.log(e);
                        return [];
                    })
                }

                commands
                    .forEach((c: CounterCommand) => tryHandle(c))

                while (s.count() !== 0) {
                    await s.waitOne();
                    const counterState = await getCounterState(streamName)
                    if (counterState.value > 1000) throw new Error(`counter value is ${counterState.value}`)
                    if (counterState.value < 0) throw new Error(`counter value is ${counterState.value}`)
                }
            }).beforeEach(() => {
                jest.resetAllMocks();
            })
        )
    });

    it('should handle lots of commands per aggregate (with 1 000 000 events)', async () => {
        const streamName = uuidv4().toString()
        es = new WithEventStoreAndVersion<CounterCommand, CounterState, CounterEvent>(counterDecider, streamName, {
            loadEvents: eventStore.loadEvents,
            stream: eventStore.stream,
            tryAppendEvents: eventStore.tryAppendEvents,
        })

        const increments: CounterCommand[] = _.map(_.range(1000), (_) => ({__type: 'Increment'}));
        const decrements: CounterCommand[] = _.map(_.range(1000), (_) => ({__type: 'Decrement'}));
        const actions: CounterCommand[] = _.flatMap(_.range(1), (_) => [...increments, ...decrements])
        // we should go up to 1 000 000 events in less than 300 ms

        console.log('Start Adding events')
        await expectExecutionTime(14000, async () => {
            for (const action of actions) {
                await es.handle(action)
            }
        })
        console.log('End Adding events')
    });

    it('should handle lots of events (with 1 000 000 events)', async () => {
        const streamName = uuidv4().toString()
        es = new WithEventStoreAndVersion<CounterCommand, CounterState, CounterEvent>(counterDecider, streamName, {
            loadEvents: eventStore.loadEvents,
            stream: eventStore.stream,
            tryAppendEvents: eventStore.tryAppendEvents,
        })

        const increments: CounterEvent[] = _.map(_.range(500), (_) => ({__type: 'Incremented'}));
        const decrements: CounterEvent[] = _.map(_.range(500), (_) => ({__type: 'Decremented'}));

        let version = 0;
        const events = [...increments, ...decrements];
        while (true) {
            await eventStore.tryAppendEvents(streamName, version, events)
            version += events.length
            if (version >= 900000) break;
        }

        console.log('Start exec command with ' + (900000) + 'events')
        // was 2886 ms
        await expectExecutionTime(1000, async () => {
            await es.handle({__type: 'Increment'})
        })
        console.log('End exec command')
    });

    it('should should be faster with in memory state', async () => {
        const streamName = uuidv4().toString()
        es = new WithEventStoreInMemory<CounterCommand, CounterState, CounterEvent>(counterDecider, streamName, {
            loadEvents: eventStore.loadEvents,
            stream: eventStore.stream,
            tryAppendEvents: eventStore.tryAppendEvents
        })

        const increments: CounterCommand[] = _.map(_.range(1, 1000), (_) => ({__type: 'Increment'}));
        const decrements: CounterCommand[] = _.map(_.range(1, 1000), (_) => ({__type: 'Decrement'}));
        const actions: CounterCommand[] = _.flatMap(_.range(1), (_) => [...increments, ...decrements])

        console.log('Start Adding events')
        await expectExecutionTime(2300, async () => {
            for (const action of actions) {
                await es.handle(action)
            }
        })
        console.log('End Adding events')
    });

    it('should be faster with snapshots (it\'s not :( )', async () => {
        const streamName = uuidv4().toString()

        const increments: CounterCommand[] = _.map(_.range(1, 1000), (_) => ({__type: 'Increment'}));
        const decrements: CounterCommand[] = _.map(_.range(1, 1000), (_) => ({__type: 'Decrement'}));
        const actions: CounterCommand[] = _.flatMap(_.range(1), (_) => [...increments, ...decrements])
        // we should go up to 1 000 000 events in less than 300 ms

        console.log('Start Adding events')
        await expectExecutionTime(20000, async () => {
            for (const action of actions) {
                es = new WithSnapshots<CounterCommand, CounterState, CounterEvent>(counterDecider, streamName, eventStore, snapshots)
                await es.handle(action)
            }
        })
        console.log('End Adding events')
    });

    it('should be faster with snapshots in containers (it\'s not :( )', async () => {
        const streamName = uuidv4().toString()

        const increments: CounterCommand[] = _.map(_.range(1, 1000), (_) => ({__type: 'Increment'}));
        const decrements: CounterCommand[] = _.map(_.range(1, 1000), (_) => ({__type: 'Decrement'}));
        const actions: CounterCommand[] = _.flatMap(_.range(1, 1), (_) => [...increments, ...decrements])
        // we should go up to 1 000 000 events in less than 300 ms

        console.log('Start Adding events')
        await expectExecutionTime(20000, async () => {
            for (const action of actions) {
                es = new WithSnapshotsInContainers<CounterCommand, CounterState, CounterEvent>(counterDecider, streamName, eventStore, snapshotsWithContainer)
                await es.handle(action)
            }
        })
        console.log('End Adding events')
    });

    async function getCounterState(streamName: string) {
        const [_version, events] = await eventStore.loadEvents(streamName);
        return _.reduce(events, counterDecider.evolve, counterDecider.initialState);
    }
});

async function expectExecutionTime(maxTime: number, fct: () => Promise<any>): Promise<void> {
    const start = Date.now();
    await fct()
    const end = Date.now();
    console.log(`took ${end - start}ms which is less than ${maxTime}ms`)
    expect(end - start).toBeLessThan(maxTime);
}

const RandomCommands: Arbitrary<CounterCommand[]> = fc.array(fc.oneof(
    fc.constant({__type: 'Increment'} as CounterCommand),
    fc.constant({__type: 'Decrement'} as CounterCommand),
), {maxLength: 1000});
