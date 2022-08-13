import * as _ from 'lodash';
import {Either, match} from "fp-ts/Either";
import {pipe} from "fp-ts/function";

export type Decide<Command, State, Event> = (c: Command, s: State) => Event[]
export type Evolve<State, Event> = (s: State, e: Event) => State
export type IsTerminal<State> = (s: State) => boolean

export type Decider<Command, State, Event> =
    {
        decide: Decide<Command, State, Event>
        evolve: Evolve<State, Event>
        initialState: State
        isTerminal: IsTerminal<State>
    }

export type Stream = string

export type EventStoreWithVersion<Event> = {
    loadEvents: (stream: Stream) => Promise<[number, Event[]]>
    tryAppendEvents: (s: Stream, v: number, e: Event[]) => Promise<Either<[number, Event[]], number>>
};

export class WithEventStore<Command, State, Event> {
    constructor(
        private readonly decider: Decider<Command, State, Event>,
        private readonly stream: Stream,
        private readonly eventStore: EventStoreWithVersion<Event>,
    ) {
    }

    public async handle(command: Command): Promise<Event[]> {
        const [version, pastEvents]: [number, Event[]] = await this.eventStore.loadEvents(this.stream)
        const state: State = _.reduce(pastEvents, this.decider.evolve, this.decider.initialState)
        return await this.handleCommand(version, state, command)
    }

    private async handleCommand(version: number, state: State, command: Command): Promise<Event[]> {
        const events: Event[] = this.decider.decide(command, state)
        const result: Either<[number, Event[]], number> = await this.eventStore.tryAppendEvents(this.stream, version, events)
        return await pipe(result, match(
            ([actualVersion, catchupEvents]: [number, Event[]]) => {
                const actualState: State = _.reduce(catchupEvents, this.decider.evolve, state)
                return this.handleCommand(actualVersion, actualState, command)
            },
            (_version: number) => Promise.resolve(events),
        ))
    }
}
