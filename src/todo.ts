import {Decide, Decider, Evolve} from "./framework";

type Typed<K, T> = K & { __type: T }

export type AddTodo = Typed<{ name: string }, 'AddTodo'>
export type ToggleTodo = Typed<{ name: string }, 'ToggleTodo'>
export type RemoveTodo = Typed<{ name: string }, 'RemoveTodo'>
export type TodoCommand = AddTodo | ToggleTodo | RemoveTodo

export type Todo = { name: string, done: boolean }
export type TodoState = { todos: Todo[] }

export type TodoAdded = Typed<{ name: string }, 'TodoAdded'>
export type TodoToggled = Typed<{ name: string }, 'TodoToggled'>
export type TodoRemoved = Typed<{ name: string }, 'TodoRemoved'>
export type TodoEvent = TodoAdded | TodoToggled | TodoRemoved

const todoInitialState: TodoState = {
    todos: []
};

const decide: Decide<TodoCommand, TodoState, TodoEvent> = (command: TodoCommand, state: TodoState) => {
    switch (command.__type) {
        case "AddTodo":
            return [{name: command.name, __type: 'TodoAdded'}]
        case "ToggleTodo":
            return [{name: command.name, __type: 'TodoToggled'}]
        case "RemoveTodo":
            return [{name: command.name, __type: 'TodoRemoved'}]
    }
    return []
}

const evolve: Evolve<TodoState, TodoEvent> = (state: TodoState, event: TodoEvent) => {
    switch (event.__type) {
        case "TodoAdded":
            return {...state, todos: [...state.todos, {name: event.name, done: false}]}
        case "TodoToggled":
            return {...state, todos: state.todos.map((t: Todo) => t.name === event.name ? {...t, done: true} : t)}
        case "TodoRemoved":
            return {...state, todos: state.todos.filter(t => t.name !== event.name)}
    }
}

export const todoDecider: Decider<TodoCommand, TodoState, TodoEvent> = {
    decide,
    evolve,
    initialState: todoInitialState,
    isTerminal: () => false
}
