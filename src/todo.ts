import {Decide, Decider, Evolve} from "./framework";

type Typed<K, T> = K & { __type: T }

export type AddTodo = Typed<{ id: string, name: string }, 'AddTodo'>
export type ToggleTodo = Typed<{ id: string }, 'ToggleTodo'>
export type RemoveTodo = Typed<{ id: string }, 'RemoveTodo'>
export type TodoCommand = AddTodo | ToggleTodo | RemoveTodo

export type Todo = { id: string, name: string, done: boolean }
export type TodoState = { todos: Todo[] }

export type TodoAdded = Typed<{ id: string, name: string }, 'TodoAdded'>
export type TodoToggled = Typed<{ id: string }, 'TodoToggled'>
export type TodoRemoved = Typed<{ id: string }, 'TodoRemoved'>
export type TodoEvent = TodoAdded | TodoToggled | TodoRemoved

const todoInitialState: TodoState = {
    todos: []
};

const assertTodoExists = (state: TodoState, id: string) => {
    if (state.todos.every(todo => todo.id !== id)) throw new Error('unknown todo');
}

const decide: Decide<TodoCommand, TodoState, TodoEvent> = (command: TodoCommand, state: TodoState) => {
    switch (command.__type) {
        case "AddTodo":
            return [{id: command.id, name: command.name, __type: 'TodoAdded'}]
        case "ToggleTodo":
            assertTodoExists(state, command.id);
            return [{id: command.id, __type: 'TodoToggled'}]
        case "RemoveTodo":
            assertTodoExists(state, command.id);
            return [{id: command.id, __type: 'TodoRemoved'}]
    }
    return []
}

const evolve: Evolve<TodoState, TodoEvent> = (state: TodoState, event: TodoEvent) => {
    switch (event.__type) {
        case "TodoAdded":
            return {...state, todos: [...state.todos, {id: event.id, name: event.name, done: false}]}
        case "TodoToggled":
            return {...state, todos: state.todos.map((t: Todo) => t.id === event.id ? {...t, done: true} : t)}
        case "TodoRemoved":
            return {...state, todos: state.todos.filter(t => t.id !== event.id)}
    }
}

export const todoDecider: Decider<TodoCommand, TodoState, TodoEvent> = {
    decide,
    evolve,
    initialState: todoInitialState,
    isTerminal: () => false
}
