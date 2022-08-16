import {Decide, Decider, Evolve} from "../../framework/framework";
import {match, Pattern} from "ts-pattern";
import {AddTodo, TodoCommand, TodoEvent} from "./todo";

export type TodoCounterState = { todos: number };

const todoInitialState: TodoCounterState = {todos: 0};

const decide: Decide<TodoCommand, TodoCounterState, TodoEvent> = (command: TodoCommand, state: TodoCounterState) =>
    match<[TodoCommand, TodoCounterState], TodoEvent[]>([command, state])
        .with([{__type: 'AddTodo'}, Pattern.any],
            ([_command, state]: [AddTodo, TodoCounterState]) => {
                if (state.todos > 10) throw new Error('Can\'t have more than 10 todos')
                return []
            })
        .otherwise(([_command, _state]) => [])

const evolve: Evolve<TodoCounterState, TodoEvent> = (state: TodoCounterState, event: TodoEvent) =>
    match<[TodoCounterState, TodoEvent], TodoCounterState>([state, event])
        .with([Pattern.any, {__type: 'TodoAdded'}],
            ([state, _event]) => ({...state, todos: state.todos + 1})
        )
        .with([Pattern.any, {__type: 'TodoRemoved'}],
            ([state, _event]) => ({...state, todos: state.todos - 1})
        )
        .otherwise(([state, _event]) => state)

export const todoCounterDecider: Decider<TodoCommand, TodoCounterState, TodoEvent> = {
    decide,
    evolve,
    initialState: todoInitialState,
    isTerminal: (_: TodoCounterState) => false
}
