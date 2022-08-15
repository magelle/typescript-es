import {Decide, Decider, Evolve} from "../../framework/framework";
import {match, Pattern} from "ts-pattern";

type Typed<K, T> = K & { __type: T }

export type AddTodo = Typed<{ name: string }, 'AddTodo'>
export type ToggleTodo = Typed<{}, 'ToggleTodo'>
export type RemoveTodo = Typed<{}, 'RemoveTodo'>
export type TodoCommand = AddTodo | ToggleTodo | RemoveTodo

export type TodoState = { name: string, done: boolean, removed: boolean }

export type TodoAdded = Typed<{ name: string }, 'TodoAdded'>
export type TodoToggled = Typed<{}, 'TodoToggled'>
export type TodoRemoved = Typed<{}, 'TodoRemoved'>
export type TodoEvent = TodoAdded | TodoToggled | TodoRemoved

const todoInitialState: TodoState = {
    name: "",
    done: false,
    removed: false
};

const decide: Decide<TodoCommand, TodoState, TodoEvent> = (command: TodoCommand, state: TodoState) =>
    match<[TodoCommand, TodoState], TodoEvent[]>([command, state])
        .with([{__type: 'AddTodo'}, Pattern.any],
            ([command, _state]: [AddTodo, TodoState]) =>
                [{name: command.name, __type: 'TodoAdded'}])
        .with([{__type: 'ToggleTodo'}, Pattern.any],
            ([_command, _state]: [ToggleTodo, TodoState]) => {
                return [{__type: 'TodoToggled'}]
            })
        .with([{__type: 'RemoveTodo'}, Pattern.any],
            ([_command, _state]: [RemoveTodo, TodoState]) => {
                return [{__type: 'TodoRemoved'}]
            })
        .otherwise(([_command, _state]) => [])

const evolve: Evolve<TodoState, TodoEvent> = (state: TodoState, event: TodoEvent) =>
    match<[TodoState, TodoEvent], TodoState>([state, event])
        .with([Pattern.any, {__type: 'TodoAdded'}],
            ([_state, event]) =>
                ({name: event.name, done: false, removed: false})
        )
        .with([Pattern.any, {__type: 'TodoToggled'}],
            ([state, _event]) =>
                ({...state, done: true})
        )
        .with([Pattern.any, {__type: 'TodoRemoved'}],
            ([state, _event]) =>
                ({...state, removed: true})
        )
        .otherwise(([state, _event]) => state)

export const todoDecider: Decider<TodoCommand, TodoState, TodoEvent> = {
    decide,
    evolve,
    initialState: todoInitialState,
    isTerminal: (s: TodoState) => s.removed
}
