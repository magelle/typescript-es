import {Decider} from "./framework";
import _ from "lodash";

export function toMap<key, C, S, E>(decider: Decider<C, S, E>): Decider<[key, C], Map<key, S>, [key, E]> {
    return {
        decide: ([key, command]: [key, C], states: Map<key, S>) => {
            const state = states.get(key) ?? decider.initialState;
            const events = decider.decide(command, state)
            return events.map((event: E) => [key, event]);
        },
        evolve: (states: Map<key, S>, [key, event]: [key, E]) => {
            const state = states.get(key) ?? decider.initialState;
            const newState = decider.evolve(state, event)
             if (decider.isTerminal(newState)) {
                 states.delete(key)
             } else {
                 states.set(key, state)
             }
             return states;
        },
        initialState: new Map(),
        isTerminal: (states: Map<key, S>) => _.every(states, decider.isTerminal),
    }
}
