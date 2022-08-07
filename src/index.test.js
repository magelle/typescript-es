"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const framework_1 = require("./framework");
const todo_1 = require("./todo");
class InMemorySimpleEventStore {
    constructor() {
        this.events = [];
        this.loadEvents = (stream, version) => {
            return this.events;
        };
        this.appendEvents = (s, e) => {
            this.events.push(...e);
        };
    }
}
describe('Event sourced TODO', () => {
    let eventStore;
    let es;
    beforeEach(() => {
        eventStore = new InMemorySimpleEventStore();
        es = new framework_1.WithEventStore(todo_1.todoDecider, 'todos', {
            loadEvents: eventStore.loadEvents,
            appendEvents: eventStore.appendEvents
        });
    });
    it('should allow to add a todo', () => {
        const events = es.handle({ __type: 'AddTodo', name: 'my new Todo' });
        expect(events).toEqual([{ __type: 'TodoAdded', name: 'my new Todo' }]);
    });
    it('should allow to toggle a todo', () => {
        alreadyHappen([{
                __type: 'TodoAdded',
                name: 'my new Todo'
            }]);
        const events = es.handle({ __type: 'ToggleTodo', name: 'my new Todo' });
        expect(events).toEqual([{ __type: 'TodoToggled', name: 'my new Todo' }]);
    });
    it('should allow to remove a todo', () => {
        alreadyHappen([{
                __type: 'TodoAdded',
                name: 'my new Todo'
            }]);
        const events = es.handle({ __type: 'RemoveTodo', name: 'my new Todo' });
        expect(events).toEqual([{ __type: 'TodoRemoved', name: 'my new Todo' }]);
    });
    function alreadyHappen(events) {
        eventStore.appendEvents('todos', events);
    }
});
