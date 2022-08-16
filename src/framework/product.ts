import {Decider} from "./framework";
import _ from "lodash";

// This is a "Or" decider Commands, States, Events are specific to 1 type
// @ts-ignore
export function product<C, Sa, Sb, E>(
    da: Decider<C, Sa, E>,
    db: Decider<C, Sb, E>
): Decider<C, [Sa, Sb], E> {

    return {
        decide: (command: C, [sa, sb]: [Sa, Sb]) => _.concat(da.decide(command, sa), db.decide(command, sb)),
        evolve: ([sa, sb]: [Sa, Sb], e: E) => [da.evolve(sa, e), db.evolve(sb, e)],
        initialState: [da.initialState, db.initialState],
        isTerminal: ([sa, sb]: [Sa, Sb]) => da.isTerminal(sa) && db.isTerminal(sb)
    }
}
