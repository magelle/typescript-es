import {InstantView} from "../../../../framework/framework";
import {TodoEvent} from "../../todos";

export type todoItem = {
    id: string
    name: string
    done: boolean
}
export type TodoView = {
    todos: todoItem[]
    todo: number
    onGoing: number
    done: number
    deleted: number
}

export const instantTodoView: InstantView<TodoView, TodoEvent> = {
    evolve(state: TodoView, event: TodoEvent): TodoView {
        switch (event.__type) {
            case "TodoToggled":
                if (state.todos.find((t) => t.id === event.id)?.done) {
                    return {
                        ...state,
                        todos: state.todos.map(t => t.id === event.id ? {...t, done: false} : t),
                        done: state.done - 1,
                        onGoing: state.onGoing + 1,
                    }
                } else {
                    return {
                        ...state,
                        todos: state.todos.map(t => t.id === event.id ? {...t, done: true} : t),
                        done: state.done + 1,
                        onGoing: state.onGoing - 1,
                    }
                }
            case "TodoAdded":
                return {
                    ...state,
                    todo: state.todo + 1,
                    onGoing: state.onGoing + 1,
                    todos: [...state.todos, {name: event.name, id: event.id, done: false}]
                }
            case "TodoRemoved":
                if (state.todos.find((t) => t.id === event.id)?.done) {
                    return {
                        ...state,
                        todos: state.todos.filter(t => t.id !== event.id),
                        todo: state.todo - 1,
                        done: state.done - 1,
                        deleted: state.deleted + 1,
                    }
                } else {
                    return {
                        ...state,
                        todos: state.todos.filter(t => t.id !== event.id),
                        todo: state.todo - 1,
                        onGoing: state.onGoing - 1,
                        deleted: state.deleted + 1,
                    }
                }
        }
    },
    initialState: {
        todos: [],
        todo: 0,
        onGoing: 0,
        done: 0,
        deleted: 0,
    }
}
