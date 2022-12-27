import {PostgreSQLAdapter} from "../../framework/postgresql/adapter/postgresql.adapter";
import {PostgresEventStoreWithVersion} from "../../framework/postgresql/eventstore/PostgresEventStoreWithVersion";
import {TodoCommand, todoDecider, TodoEvent, TodoState} from "./todo";
import {Decider, EventStore} from "../../framework/framework";
import {buildPostgresqlAdapter} from "../buildPostgresqlAdapter";
import {v4 as uuidv4} from "uuid";
import {toMap} from "../../framework/toMap";
import {WithEventStoreInMemory} from "../../framework/03-with-event-store-in-memory/withEventStoreInMemory";
import {todoCounterDecider, TodoCounterState} from "./todoCounter";
import {product} from "../../framework/product";
import _ from "lodash";
import {JSONSerializer} from "../../framework/postgresql/serializer/JSONSerializer";

describe('Todo counter', () => {

    let stream: string
    let postgreSQLAdapter: PostgreSQLAdapter
    let eventStore: PostgresEventStoreWithVersion<[string, TodoEvent]>
    let es: EventStore<[string, TodoCommand], [string, TodoEvent]>

    beforeAll(async () => {
        const postgreSQLAdapter = await buildPostgresqlAdapter();
        eventStore = new PostgresEventStoreWithVersion(
            postgreSQLAdapter,
            new JSONSerializer()
        );
    })

    beforeEach(async () => {
        stream = uuidv4().toString()
        const todos: Decider<[string, TodoCommand], Map<string, TodoState>, [string, TodoEvent]> =
            toMap<string, TodoCommand, TodoState, TodoEvent>(todoDecider)
        const todoCounter: Decider<[string, TodoCommand], TodoCounterState, [string, TodoEvent]> = {
            decide: ([key, e]: [string, TodoCommand], s: TodoCounterState) => todoCounterDecider.decide(e, s).map(e => [key, e]),
            evolve: (s, [_, e]) => todoCounterDecider.evolve(s, e),
            initialState: todoCounterDecider.initialState,
            isTerminal: todoCounterDecider.isTerminal,
        }
        const decider = product(todos, todoCounter)
        es = new WithEventStoreInMemory(decider, stream, {
            loadEvents: eventStore.loadEvents,
            stream: eventStore.stream,
            tryAppendEvents: eventStore.tryAppendEvents,
        })
    })

    afterAll(async () => {
        await postgreSQLAdapter.close();
    })

    it('should allow to add todo up to 10', async () => {
        const i = _.range(0, 11)
        for (const _ of i) {
            await es.handle([newId(), {__type: 'AddTodo', name: 'my new Todo'}])
        }
    })

    it('should refuse to add more than 10 todos', async () => {
        try {
            const i = _.range(0, 12)
            for (const _ of i) {
                await es.handle([newId(), {__type: 'AddTodo', name: 'my new Todo'}])
            }
        } catch (e) {
            return;
        }
        throw new Error('should not be able to add more than 10 todos')
    })

    function newId(): string {
        return uuidv4();
    }
})
