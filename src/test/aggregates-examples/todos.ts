import {Decide, Decider, Evolve} from "../../framework/framework";
import {match, Pattern} from "ts-pattern";

type Typed<K, T> = K & { __type: T }

export type AddTodo = Typed<{ id: string, name: string }, 'AddTodo'>
export type ToggleTodo = Typed<{ id: string }, 'ToggleTodo'>
export type RemoveTodo = Typed<{ id: string }, 'RemoveTodo'>
export type TodoCommand = AddTodo | ToggleTodo | RemoveTodo

export type Todos = { id: string, name: string, done: boolean }
export type TodoState = { todos: Todos[] }

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

const decide: Decide<TodoCommand, TodoState, TodoEvent> = (command: TodoCommand, state: TodoState) =>
    match<[TodoCommand, TodoState], TodoEvent[]>([command, state])
        .with([{__type: 'AddTodo'}, Pattern.any],
            ([command, _state]: [AddTodo, TodoState]) =>
                [{id: command.id, name: command.name, __type: 'TodoAdded'}])
        .with([{__type: 'ToggleTodo'}, Pattern.any],
            ([command, _state]: [ToggleTodo, TodoState]) => {
                assertTodoExists(state, command.id);
                return [{id: command.id, __type: 'TodoToggled'}]
            })
        .with([{__type: 'RemoveTodo'}, Pattern.any],
            ([command, _state]: [RemoveTodo, TodoState]) => {
                assertTodoExists(state, command.id);
                return [{id: command.id, __type: 'TodoRemoved'}]
            })
        .otherwise(([_command, _state]) => [])

const evolve: Evolve<TodoState, TodoEvent> = (state: TodoState, event: TodoEvent) =>
    match<[TodoState, TodoEvent], TodoState>([state, event])
        .with([Pattern.any, {__type: 'TodoAdded'}],
            ([state, event]) =>
                ({...state, todos: [...state.todos, {id: event.id, name: event.name, done: false}]})
        )
        .with([Pattern.any, {__type: 'TodoToggled'}],
            ([state, event]) =>
                ({...state, todos: state.todos.map((t: Todos) => t.id === event.id ? {...t, done: true} : t)})
        )
        .with([Pattern.any, {__type: 'TodoRemoved'}],
            ([state, event]) =>
                ({...state, todos: state.todos.filter(t => t.id !== event.id)})
        )
        .otherwise(([state, _event]) => state)

export const todoDecider: Decider<TodoCommand, TodoState, TodoEvent> = {
    decide,
    evolve,
    initialState: todoInitialState,
    isTerminal: () => false
}
