import {fc} from '@fast-check/jest';
import {PostgreSQLAdapter} from "../postgresql/adapter/postgresql.adapter";
import {PostgresEventStoreWithVersion} from "../postgresql/eventstore/PostgresEventStoreWithVersion";
import {EventStore} from "./framework";
import {CounterCommand, counterDecider, CounterEvent, CounterState} from "../test/aggregates/counter";
import * as _ from "lodash";
import {Arbitrary} from "fast-check";
import {v4 as uuidv4} from 'uuid';
import {buildPostgresqlAdapter} from "../test/buildPostgresqlAdapter";
import {WithEventStoreInMemory} from "./withEventStoreInMemory";
import {WithEventStoreAndVersion} from "./withEventStoreAndVersion";
import {WithSnapshots} from "./WithSnapshots";
import {PostgresSnapshots} from "../postgresql/snapshots/PostgresSnapshots";
import {Snapshots} from "./snapshots";

if (!fc.readConfigureGlobal()) {
    // Global config of Jest has been ignored, we will have a timeout after 5000ms
    // (CodeSandbox falls in this category)
    fc.configureGlobal({interruptAfterTimeLimit: 4000});
}

describe('Counter event sourcing', () => {
    let postgreSQLAdapter: PostgreSQLAdapter;
    let eventStore: PostgresEventStoreWithVersion<CounterEvent>;
    let snapshots: Snapshots<CounterState>;
    let es: EventStore<CounterCommand, CounterEvent>

    beforeAll(async () => {
        const postgreSQLAdapter = await buildPostgresqlAdapter();
        eventStore = new PostgresEventStoreWithVersion(postgreSQLAdapter);
        snapshots = new PostgresSnapshots(postgreSQLAdapter);
    })

    afterAll(async () => {
        await postgreSQLAdapter.close();
    })

    it('counter value should be under 1000', async () => {
        // { seed: -742561100, path: "1:1:0", endOnFailure: true }
        await fc.assert(
            fc.asyncProperty(RandomCommands, fc.scheduler(), async (commands, s) => {
                const stream = uuidv4().toString()

                const loadEvents = s.scheduleFunction(eventStore.loadEvents)
                const tryAppendEvents = s.scheduleFunction(eventStore.tryAppendEvents)

                es = new WithEventStoreInMemory<CounterCommand, CounterState, CounterEvent>(counterDecider, stream, {
                    loadEvents,
                    tryAppendEvents
                })

                function tryHandle(c: CounterCommand): Promise<CounterEvent[]> {
                    console.log(`sending command ${c}`)
                    return es.handle(c).catch(e => {
                        console.log(e);
                        return [];
                    })
                }

                commands
                    .forEach((c: CounterCommand) => tryHandle(c))

                while (s.count() !== 0) {
                    await s.waitOne();
                    const counterState = await getCounterState(stream)
                    if (counterState.value > 1000) throw new Error(`counter value is ${counterState.value}`)
                    if (counterState.value < 0) throw new Error(`counter value is ${counterState.value}`)
                }
                console.log("Done")
            }).beforeEach(() => {
                jest.resetAllMocks();
            })
        )
    });

    it('should handle lots of commands per aggregate (with 1 000 000 events)', async () => {
        const stream = uuidv4().toString()
        es = new WithEventStoreAndVersion<CounterCommand, CounterState, CounterEvent>(counterDecider, stream, {
            loadEvents: eventStore.loadEvents,
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

    it('should should be faster with in memory state', async () => {
        const stream = uuidv4().toString()
        es = new WithEventStoreInMemory<CounterCommand, CounterState, CounterEvent>(counterDecider, stream, eventStore)

        const increments: CounterCommand[] = _.map(_.range(1000), (_) => ({__type: 'Increment'}));
        const decrements: CounterCommand[] = _.map(_.range(1000), (_) => ({__type: 'Decrement'}));
        const actions: CounterCommand[] = _.flatMap(_.range(1), (_) => [...increments, ...decrements])
        // we should go up to 1 000 000 events in less than 300 ms

        console.log('Start Adding events')
        await expectExecutionTime(4000, async () => {
            for (const action of actions) {
                await es.handle(action)
            }
        })
        console.log('End Adding events')
    });

    it('should be faster with snapshots (it\'s not)', async () => {
        const stream = uuidv4().toString()

        const increments: CounterCommand[] = _.map(_.range(1000), (_) => ({__type: 'Increment'}));
        const decrements: CounterCommand[] = _.map(_.range(1000), (_) => ({__type: 'Decrement'}));
        const actions: CounterCommand[] = _.flatMap(_.range(1), (_) => [...increments, ...decrements])
        // we should go up to 1 000 000 events in less than 300 ms

        console.log('Start Adding events')
        await expectExecutionTime(20000, async () => {
            for (const action of actions) {
                es = new WithSnapshots<CounterCommand, CounterState, CounterEvent>(counterDecider, stream, eventStore, snapshots)
                await es.handle(action)
            }
        })
        console.log('End Adding events')
    });

    async function getCounterState(stream: string) {
        const [_version, events] = await eventStore.loadEvents(stream);
        return _.reduce(events, counterDecider.evolve, counterDecider.initialState);
    }
});

async function expectExecutionTime(maxTime: number, fct: () => Promise<any>): Promise<void> {
    const start = Date.now();
    await fct()
    const end = Date.now();
    expect(end - start).toBeLessThan(maxTime);
}

const RandomCommands: Arbitrary<CounterCommand[]> = fc.array(fc.oneof(
    fc.constant({__type: 'Increment'} as CounterCommand),
    fc.constant({__type: 'Decrement'} as CounterCommand),
), {maxLength: 1000});