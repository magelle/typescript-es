import {EventStore} from "../../framework/framework";
import {TodoCommand, todoDecider, TodoEvent, TodoState} from "./todo";
import {PostgresEventStoreWithVersion} from "../../framework/postgresql/eventstore/PostgresEventStoreWithVersion";
import {PostgreSQLAdapter} from "../../framework/postgresql/adapter/postgresql.adapter";
import {v4 as uuidv4} from 'uuid';
import {buildPostgresqlAdapter} from "../buildPostgresqlAdapter";
import {WithEventStoreInMemory} from "../../framework/03-with-event-store-in-memory/withEventStoreInMemory";
import {toMap} from "../../framework/toMap";
import {JSONSerializer} from "../../framework/postgresql/serializer/JSONSerializer";


describe('Event sourced TODO', () => {
    let stream: string
    let postgreSQLAdapter: PostgreSQLAdapter
    let eventStore: PostgresEventStoreWithVersion<[string, TodoEvent]>
    let es: EventStore<[string, TodoCommand], [string, TodoEvent]>

    beforeAll(async () => {
        const postgreSQLAdapter = await buildPostgresqlAdapter();
        eventStore = new PostgresEventStoreWithVersion(
            postgreSQLAdapter,
            new JSONSerializer());
    })

    beforeEach(async () => {
        stream = uuidv4().toString()
        const todosInMap = toMap<string, TodoCommand, TodoState, TodoEvent>(todoDecider)
        es = new WithEventStoreInMemory(todosInMap, stream, {
            loadEvents: eventStore.loadEvents,
            stream: eventStore.stream,
            tryAppendEvents: eventStore.tryAppendEvents,
        })
    })

    afterAll(async () => {
        await postgreSQLAdapter.close();
    })

    it('should allow to add a todo', async () => {
        const todoId = newId()
        const events = await es.handle([todoId, {__type: 'AddTodo', name: 'my new Todo'}])
        expect(events).toEqual([[todoId, {__type: 'TodoAdded', name: 'my new Todo'}]])
    })

    it('should allow to toggle a todo', async () => {
        const todoId = newId()
        aTodoAlreadyExists([todoId, {name: 'my new Todo'}]);

        const events = await es.handle([todoId, {__type: 'ToggleTodo'}])

        expect(events).toEqual([[todoId, {__type: 'TodoToggled'}]])
    })

    it('should forbid to toggle an unknown todo', async () => {
        await expectUnknownTodoError(async () => await es.handle([newId(), {
            __type: 'ToggleTodo',
        }]));
    })

    it('should allow to remove a todo', async () => {
        const todoId = newId()
        await aTodoAlreadyExists([todoId, {name: 'my new Todo'}]);

        const events = await es.handle([todoId, {__type: 'RemoveTodo'}])

        expect(events).toEqual([[todoId, {__type: 'TodoRemoved'}]])
    })

    it('should forbid to remove an unknown todo', () => {
        expectUnknownTodoError(async () => await es.handle([newId(), {
            __type: 'RemoveTodo',
        }]));
    })

    it('should handle several commands', async () => {
        const todoId = newId()

        await es.handle([todoId, {__type: 'AddTodo', name: 'my new Todo'}])
        await es.handle([todoId, {__type: 'ToggleTodo'}])
        await es.handle([todoId, {__type: 'RemoveTodo'}])
    })

    async function aTodoAlreadyExists([id, todo]: [string, { name: string }] = [newId(), {name: 'my new Todo'}]) {
        await alreadyHappen([[id, {
            __type: 'TodoAdded',
            ...todo
        }]]);
    }


    async function alreadyHappen(events: [string, TodoEvent][]) {
        await eventStore.tryAppendEvents(stream, 0, events)
    }

    function newId(): string {
        return uuidv4();
    }

    async function expectUnknownTodoError<R>(fct: () => Promise<R>) {
        try {
            await fct()
        } catch (e) {
            expect(e).toEqual(new Error('unknown todo'))
            return;
        }
        fail('no error thrown')
    }
})

