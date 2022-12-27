import {instantTodoView, TodoView} from "./todo.view";
import {TodoEvent} from "../../todos";

describe('Todo View', () => {
    let state: TodoView = instantTodoView.initialState;

    it('should handle todo added', () => {
        whenTheViewReceive({
            __type: "TodoAdded",
            name: "My todo",
            id: "1"
        })

        expect(state.todos).toContainEqual({name: "My todo", id: "1", done: false})
        expect(state.onGoing).toBe(1)
        expect(state.todo).toBe(1)
        expect(state.done).toBe(0)
        expect(state.deleted).toBe(0)
    })

    it('should handle todo toggled', () => {
        givenThesePastEvents([{
            __type: "TodoAdded",
            name: "My todo",
            id: "1"
        }])

        whenTheViewReceive({
            __type: "TodoToggled",
            id: "1"
        })

        expect(state.todos).toContainEqual({name: "My todo", id: "1", done: true})
        expect(state.onGoing).toBe(0)
        expect(state.todo).toBe(1)
        expect(state.done).toBe(1)
        expect(state.deleted).toBe(0)
    })

    it('should handle todo toggled back', () => {
        givenThesePastEvents([{
            __type: "TodoAdded",
            name: "My todo",
            id: "1"
        }, {
            __type: "TodoToggled",
            id: "1"
        }])
        whenTheViewReceive({
            __type: "TodoToggled",
            id: "1"
        })

        expect(state.todos).toContainEqual({name: "My todo", id: "1", done: false})
        expect(state.onGoing).toBe(1)
        expect(state.todo).toBe(1)
        expect(state.done).toBe(0)
        expect(state.deleted).toBe(0)
    })

    it('should handle todo removed', () => {
        givenThesePastEvents([{
            __type: "TodoAdded",
            name: "My todo",
            id: "1"
        }])

        whenTheViewReceive({
            __type: "TodoRemoved",
            id: "1"
        })

        expect(state.todos).toHaveLength(0)
        expect(state.onGoing).toBe(0)
        expect(state.todo).toBe(0)
        expect(state.done).toBe(0)
        expect(state.deleted).toBe(1)
    })

    it('should handle toggled todo removed', () => {
        givenThesePastEvents([{
            __type: "TodoAdded",
            name: "My todo",
            id: "1"
        }, {
            __type: "TodoToggled",
            id: "1"
        }])

        whenTheViewReceive({
            __type: "TodoRemoved",
            id: "1"
        })

        expect(state.todos).toHaveLength(0)
        expect(state.onGoing).toBe(0)
        expect(state.todo).toBe(0)
        expect(state.done).toBe(0)
        expect(state.deleted).toBe(1)
    })

    const givenThesePastEvents: (events: TodoEvent[]) => void = events =>
        state = events.reduce(instantTodoView.evolve, instantTodoView.initialState)

    const whenTheViewReceive: (event: TodoEvent) => void = event =>
        state = instantTodoView.evolve(state, event)
})
