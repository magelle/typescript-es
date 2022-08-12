import {WithEventStore} from "./framework";
import {TodoCommand, todoDecider, TodoEvent, TodoState} from "./test/todo";
import {PostgresEventStore} from "./PostgresEventStore";
import {PostgreSQLConfig} from "./postgresql/postgresql.config";
import {PostgreSQLAdapter} from "./postgresql/postgresql.adapter";
import migration from "node-pg-migrate";
import {join} from "path";
import { v4 as uuidv4 } from 'uuid';


describe('Event sourced TODO', () => {
    let postgreSQLAdapter: PostgreSQLAdapter;
    let eventStore: PostgresEventStore<TodoEvent>;
    let es: WithEventStore<TodoCommand, TodoState, TodoEvent>

    const MIGRATION_DIR = join(__dirname, '../migrations');
    const MIGRATION_TABLE = 'pgmirations';
    const POSTGRESQL_DB = 'postgres';
    const POSTGRESQL_AUTH = 'postgres:integration-pass';

    beforeAll(async () => {
        // @ts-ignore
        global.__TESTCONTAINERS_POSTGRE_IP__ = global.__TESTCONTAINERS__[0].host;
        // @ts-ignore
        global.__TESTCONTAINERS_POSTGRE_PORT_5432__ = global.__TESTCONTAINERS__[0].getMappedPort(5432);
        // @ts-ignore
        const uri = `postgresql://${POSTGRESQL_AUTH}@${global.__TESTCONTAINERS_POSTGRE_IP__}:${global.__TESTCONTAINERS_POSTGRE_PORT_5432__}/${POSTGRESQL_DB}`;
        const postgreSQLConfig: PostgreSQLConfig = {uri};
        const postgreSQLAdapter = new PostgreSQLAdapter(postgreSQLConfig);

        await postgreSQLAdapter.connect();
        await migration({
            logger: console,
            databaseUrl: uri,
            dir: MIGRATION_DIR,
            migrationsTable: MIGRATION_TABLE,
            direction: 'up',
            count: 999,
            noLock: true,
        });

        eventStore = new PostgresEventStore(postgreSQLAdapter);
        es = new WithEventStore<TodoCommand, TodoState, TodoEvent>(todoDecider, 'todos', {
            loadEvents: eventStore.loadEvents,
            appendEvents: eventStore.appendEvents
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

    async function aTodoAlreadyExists(todo: { id: string, name: string } = {id: newId(), name: 'my new Todo'}) {
        await alreadyHappen([{
            __type: 'TodoAdded',
            ...todo
        }]);
    }


    async function alreadyHappen(events: TodoEvent[]) {
        await eventStore.appendEvents('todos', events)
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

