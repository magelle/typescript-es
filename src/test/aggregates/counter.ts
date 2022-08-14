import {Decide, Decider, Evolve} from "../../framework/framework";

type Increment = { __type: 'Increment' }
type Decrement = { __type: 'Decrement' }
export type CounterCommand = Increment | Decrement;

type Incremented = { __type: 'Incremented' }
type Decremented = { __type: 'Decremented' }
export type CounterEvent = Incremented | Decremented;

export interface CounterState {
    value: number;
    actionsCount: number;
}

let counterInitialState: CounterState = {
    value: 0,
    actionsCount: 0,
};


const onIncrement: Decide<CounterCommand, CounterState, CounterEvent> = (_command: CounterCommand, state: CounterState) => {
    if (state.value === 1000) throw new Error('counter reached max value');
    if (state.actionsCount === 1000000) throw new Error('counter reached max actions');
    return [{__type: 'Incremented'}];
}
const onDecrement: Decide<CounterCommand, CounterState, CounterEvent> = (_command: CounterCommand, state: CounterState) => {
    if (state.value === 0) throw new Error('counter reached min value');
    if (state.actionsCount === 1000000) throw new Error('counter reached max actions');
    return [{__type: 'Decremented'}];
}
const decide: Decide<CounterCommand, CounterState, CounterEvent> = (command: CounterCommand, state: CounterState) => {
    switch (command.__type) {
        case "Increment":
            return onIncrement(command, state)
        case "Decrement":
            return onDecrement(command, state)
    }
}

const evolve: Evolve<CounterState, CounterEvent> = (state: CounterState, event: CounterEvent) => {
    switch (event.__type) {
        case "Incremented":
            return {...state, value: state.value + 1, actionsCount: state.actionsCount + 1}
        case "Decremented":
            return {...state, value: state.value - 1, actionsCount: state.actionsCount + 1}
    }
}

export const counterDecider: Decider<CounterCommand, CounterState, CounterEvent> = {
    decide,
    evolve,
    initialState: counterInitialState,
    isTerminal: () => false
}
