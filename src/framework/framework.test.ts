import {EventStore} from "./framework";
import {TodoCommand, todoDecider, TodoEvent, TodoState} from "../test/aggregates/todo";
import {PostgresEventStoreWithVersion} from "../postgresql/eventstore/PostgresEventStoreWithVersion";
import {PostgreSQLAdapter} from "../postgresql/adapter/postgresql.adapter";
import {v4 as uuidv4} from 'uuid';
import {buildPostgresqlAdapter} from "../test/buildPostgresqlAdapter";
import {WithEventStoreInMemory} from "./withEventStoreInMemory";


describe('Event sourced TODO', () => {
    let stream: string
    let postgreSQLAdapter: PostgreSQLAdapter
    let eventStore: PostgresEventStoreWithVersion<TodoEvent>
    let es: EventStore<TodoCommand, TodoEvent>

    beforeAll(async () => {
        const postgreSQLAdapter = await buildPostgresqlAdapter();
        eventStore = new PostgresEventStoreWithVersion(postgreSQLAdapter);
    })

    beforeEach(async () => {
        stream = uuidv4().toString()
        es = new WithEventStoreInMemory<TodoCommand, TodoState, TodoEvent>(todoDecider, stream, {
            loadEvents: eventStore.loadEvents,
            tryAppendEvents: eventStore.tryAppendEvents,
        })
    })

    afterAll(async () => {
        await postgreSQLAdapter.close();
    })

    it('should allow to add a todo', async () => {
        const todoId = newId()
        const events = await es.handle({__type: 'AddTodo', id: todoId, name: 'my new Todo'})
        expect(events).toEqual([{__type: 'TodoAdded', id: todoId, name: 'my new Todo'}])
    })

    it('should allow to toggle a todo', async () => {
        const todoId = newId()
        aTodoAlreadyExists({id: todoId, name: 'my new Todo'});

        const events = await es.handle({__type: 'ToggleTodo', id: todoId})

        expect(events).toEqual([{__type: 'TodoToggled', id: todoId}])
    })

    it('should forbid to toggle an unknown todo', async () => {
        await expectUnknownTodoError(async () => await es.handle({
            __type: 'ToggleTodo',
            id: newId(),
        }));
    })

    it('should allow to remove a todo', async () => {
        const todoId = newId()
        await aTodoAlreadyExists({id: todoId, name: 'my new Todo'});

        const events = await es.handle({__type: 'RemoveTodo', id: todoId})

        expect(events).toEqual([{__type: 'TodoRemoved', id: todoId}])
    })

    it('should forbid to remove an unknown todo', () => {
        expectUnknownTodoError(async () => await es.handle({
            __type: 'RemoveTodo',
            id: newId()
        }));
    })

    it('should handle several commands', async () => {
        const todoId = newId()

        await es.handle({__type: 'AddTodo', id: todoId, name: 'my new Todo'})
        await es.handle({__type: 'ToggleTodo', id: todoId})
        await es.handle({__type: 'RemoveTodo', id: todoId})
    })

    async function aTodoAlreadyExists(todo: { id: string, name: string } = {id: newId(), name: 'my new Todo'}) {
        await alreadyHappen([{
            __type: 'TodoAdded',
            ...todo
        }]);
    }


    async function alreadyHappen(events: TodoEvent[]) {
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

