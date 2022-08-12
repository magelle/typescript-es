import * as _ from 'lodash';

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

export type SimpleEventStore<Event> = {
    loadEvents: (stream: Stream, version: number) => Promise<Event[]>
    appendEvents: (s: Stream, e: Event[]) => Promise<void>
};

export class WithEventStore<Command, State, Event> {
    constructor(
        private readonly decider: Decider<Command, State, Event>,
        private readonly stream: Stream,
        private readonly eventStore: SimpleEventStore<Event>,
    ) {
    }

    public async handle(command: Command) {
        const state = _.reduce(await this.eventStore.loadEvents(this.stream, 0), this.decider.evolve, this.decider.initialState)
        const events = this.decider.decide(command, state)
        await this.eventStore.appendEvents(this.stream, events)
        return events
    }
}
