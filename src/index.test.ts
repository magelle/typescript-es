import {Stream, WithEventStore} from "./framework";
import {TodoCommand, todoDecider, TodoEvent, TodoState} from "./todo";

class InMemorySimpleEventStore<Event> {
    private readonly events: Event[] = [];

    readonly loadEvents = (stream: Stream, version: number): Event[] => {
        return this.events
    }

    readonly appendEvents = (s: Stream, e: Event[]): void => {
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
        const events = es.handle({__type: 'AddTodo', name: 'my new Todo'})

        expect(events).toEqual([{__type: 'TodoAdded', name: 'my new Todo'}])
    })

    it('should allow to toggle a todo', () => {
        alreadyHappen([{
            __type: 'TodoAdded',
            name: 'my new Todo'
        }]);

        const events = es.handle({__type: 'ToggleTodo', name: 'my new Todo'})

        expect(events).toEqual([{__type: 'TodoToggled', name: 'my new Todo'}])
    })

    it('should allow to remove a todo', () => {
        alreadyHappen([{
            __type: 'TodoAdded',
            name: 'my new Todo'
        }]);

        const events = es.handle({__type: 'RemoveTodo', name: 'my new Todo'})

        expect(events).toEqual([{__type: 'TodoRemoved', name: 'my new Todo'}])
    })

    function alreadyHappen(events: TodoEvent[]) {
        eventStore.appendEvents('todos', events)
    }
})

