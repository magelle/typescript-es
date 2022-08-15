import {Decider} from "./framework";
import {match, Pattern} from "ts-pattern";

// Used either instead
type Typed<K, T> = K & { __type: T }
export type A<T> = Typed<{ value: T }, 'A'>
export type B<T> = Typed<{ value: T }, 'B'>
type Or<Ta, Tb> = A<Ta> | B<Tb>

// @ts-ignore
function plus<Ca, Cb, Sa, Sb, Ea, Eb>(
    da: Decider<Ca, Sa, Ea>,
    db: Decider<Cb, Sb, Eb>
): Decider<Or<Ca, Cb>, [Sa, Sb], Or<Ea, Eb>> {

    return {
        decide: (command: Or<Ca, Cb>, states: [Sa, Sb]) =>
            match<[Or<Ca, Cb>, [Sa, Sb]], Or<Ea, Eb>[]>([command, states])
                .with([{__type: 'A'}, Pattern.any],
                    ([command, [sa, _]]: [A<Ca>, [Sa, Sb]]) =>
                        da.decide(command.value, sa).map(ea => ({__type: 'A', value: ea}))
                ).with([{__type: 'B'}, Pattern.any],
                ([command, [_, sb]]: [B<Cb>, [Sa, Sb]]) =>
                    db.decide(command.value, sb).map(eb => ({__type: 'B', value: eb}))
            ).exhaustive(),
        evolve: (states: [Sa, Sb], e: Or<Ea, Eb>) =>
            match<[[Sa, Sb], Or<Ea, Eb>], [Sa, Sb]>([states, e])
                .with([Pattern.any, {__type: 'A'}],
                    ([[sa, sb], ea]) => [da.evolve(sa, ea.value), sb]
                )
                .with([Pattern.any, {__type: 'B'}],
                    ([[sa, sb], eb]) => [sa, db.evolve(sb, eb.value)]
                )
                .exhaustive(),
        initialState: [da.initialState, db.initialState],
        isTerminal: ([sx, sy]: [Sa, Sb]) => da.isTerminal(sx) && db.isTerminal(sy)
    }
}
