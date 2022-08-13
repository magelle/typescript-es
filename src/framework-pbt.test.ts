import {fc} from '@fast-check/jest';
import {PostgreSQLAdapter} from "./postgresql/postgresql.adapter";
import {PostgresEventStore} from "./PostgresEventStore";
import {WithEventStore} from "./framework";
import {CounterCommand, counterDecider, CounterEvent, CounterState} from "./test/counter";
import * as _ from "lodash";
import {Arbitrary} from "fast-check";
import {buildPostgresqlAdapter} from "./test/buildPostgresqlAdapter";

if (!fc.readConfigureGlobal()) {
    // Global config of Jest has been ignored, we will have a timeout after 5000ms
    // (CodeSandbox falls in this category)
    fc.configureGlobal({interruptAfterTimeLimit: 4000});
}

describe('Counter event sourcing', () => {
    let postgreSQLAdapter: PostgreSQLAdapter;
    let eventStore: PostgresEventStore<CounterEvent>;
    let es: WithEventStore<CounterCommand, CounterState, CounterEvent>

    beforeAll(async () => {
        const postgreSQLAdapter = await buildPostgresqlAdapter();
        eventStore = new PostgresEventStore(postgreSQLAdapter);
    })

    afterAll(async () => {
        await postgreSQLAdapter.close();
    })

    it('counter value should be under 1000', async () => {
        // { seed: -742561100, path: "1:1:0", endOnFailure: true }
        await fc.assert(
            fc.asyncProperty(RandomCommands, fc.scheduler(), async (commands, s) => {

                const loadEvents = s.scheduleFunction(eventStore.loadEvents)
                const tryAppendEvents = s.scheduleFunction(eventStore.tryAppendEvents)

                es = new WithEventStore<CounterCommand, CounterState, CounterEvent>(counterDecider, 'counter', {
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
                    const counterState = await getCounterState()
                    if (counterState.value > 1000) throw new Error(`counter value is ${counterState.value}`)
                    if (counterState.value < 0) throw new Error(`counter value is ${counterState.value}`)
                }
                console.log("Done")
            }).beforeEach(() => {
                jest.resetAllMocks();
            })
        )
    });

    async function getCounterState() {
        const [_version, events] = await eventStore.loadEvents('counter');
        return _.reduce(events, counterDecider.evolve, counterDecider.initialState);
    }
});

const RandomCommands: Arbitrary<CounterCommand[]> = fc.array(fc.oneof(
    fc.constant({__type: 'Increment'} as CounterCommand),
    fc.constant({__type: 'Decrement'} as CounterCommand),
), {maxLength: 1000});
