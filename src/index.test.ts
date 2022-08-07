import {Stream, WithEventStore} from "./framework";
import {TodoCommand, todoDecider, TodoEvent, TodoState} from "./todo";

class InMemorySimpleEventStore<Event> {
    private readonly events: Event[] = [];

    readonly loadEvents = (_stream: Stream, _version: number): Event[] => {
        return this.events
    }

    readonly appendEvents = (_s: Stream, e: Event[]): void => {
        this.events.push(...e)
    }
}

describe('Event sourced TODO', () => {
    let eventStore: InMemorySimpleEventStore<TodoEvent>;
    let es: WithEventStore<TodoCommand, TodoState, TodoEvent>

    beforeEach(() => {
        eventStore = new InMemorySimpleEventStore<TodoEvent>()
        es = new WithEventStore<TodoCommand, TodoState, TodoEvent>(todoDecider, 'todos', {
            loadEvents: eventStore.loadEvents,
            appendEvents: eventStore.appendEvents
        })
    })

    it('should allow to add a todo', () => {
        const todoId = newId()
        const events = es.handle({__type: 'AddTodo', id: todoId, name: 'my new Todo'})

        expect(events).toEqual([{__type: 'TodoAdded', id: todoId, name: 'my new Todo'}])
    })

    it('should allow to toggle a todo', () => {
        const todoId = newId()
        alreadyHappen([{
            __type: 'TodoAdded',
            id: todoId,
            name: 'my new Todo'
        }]);

        const events = es.handle({__type: 'ToggleTodo', id: todoId, name: 'my new Todo'})

        expect(events).toEqual([{__type: 'TodoToggled', id: todoId, name: 'my new Todo'}])
    })

    it('should allow to remove a todo', () => {
        const todoId = newId()
        alreadyHappen([{
            __type: 'TodoAdded',
            id: todoId,
            name: 'my new Todo'
        }]);

        const events = es.handle({__type: 'RemoveTodo', id: todoId, name: 'my new Todo'})

        expect(events).toEqual([{__type: 'TodoRemoved', id: todoId, name: 'my new Todo'}])
    })

    function alreadyHappen(events: TodoEvent[]) {
        eventStore.appendEvents('todos', events)
    }

    function newId(): string {
        return new Date().toISOString();
    }
})

