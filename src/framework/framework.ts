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

export type InstantView<State, Event> =
    {
        evolve: Evolve<State, Event>
        initialState: State
    }

export type StoredView<State, Event, Changes> =
    {
        // Apply small batch
        changes: (e: Event) => Changes[],
        // Create a new state from changes. Useful when replaying events
        // So we compute in memory all changes then save the state
        evolve: (s: State, c: Changes) => State,
        initialState: State
    }

// Process react to external events (as commands) to create new events
// This allows us to synchronize several aggregates
// State would be the information about the pending actions
export type Process<XEvent, State, Event> =
    {
        decide: Decide<XEvent, State, Event>
        evolve: Evolve<State, Event>
        initialState: State
        isTerminal: IsTerminal<State>
    }
