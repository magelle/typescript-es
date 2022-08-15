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

export interface EventStore<Command, Event> {
    handle(command: Command): Promise<Event[]>
}

