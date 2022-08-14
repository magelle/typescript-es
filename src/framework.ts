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

export type SimpleEventStore<Event> = {
    loadEvents: (stream: Stream, version: number) => Promise<Event[]>
    appendEvents: (s: Stream, e: Event[]) => Promise<void>
};

export interface EventStore<Command, Event> {
    handle(command: Command): Promise<Event[]>
}

export class WithEventStore<Command, State, Event> implements EventStore<Command, Event>{
    constructor(
        private readonly decider: Decider<Command, State, Event>,
        private readonly stream: Stream,
        private readonly eventStore: SimpleEventStore<Event>,
    ) {
    }

    public async handle(command: Command) {
        const state = await this.computeState()
        const events = this.decider.decide(command, state)
        await this.eventStore.appendEvents(this.stream, events)
        return events
    }

    private async computeState() {
        return _.reduce(await this.eventStore.loadEvents(this.stream, 0), this.decider.evolve, this.decider.initialState);
    }
}


export class WithEventStoreAndVersion<Command, State, Event> implements EventStore<Command, Event> {
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

export class WithEventStoreInMemory<Command, State, Event> implements EventStore<Command, Event> {
    private version: number | undefined = undefined
    private state: State | undefined = undefined

    constructor(
        private readonly decider: Decider<Command, State, Event>,
        private readonly stream: Stream,
        private readonly eventStore: EventStoreWithVersion<Event>,
    ) {
    }

    public async handle(command: Command): Promise<Event[]> {
        await this.init()
        return await this.handleCommand(this.version!, this.state!, command)
    }

    private async handleCommand(version: number, state: State, command: Command): Promise<Event[]> {
        const events: Event[] = this.decider.decide(command, state)
        const result: Either<[number, Event[]], number> = await this.eventStore.tryAppendEvents(this.stream, version, events)
        return await pipe(result, match(
            ([actualVersion, catchupEvents]: [number, Event[]]) => {
                const actualState: State = _.reduce(catchupEvents, this.decider.evolve, state)
                return this.handleCommand(actualVersion, actualState, command)
            },
            (version: number) => {
                this.version = version
                this.state = _.reduce(events, this.decider.evolve, this.state!)
                return Promise.resolve(events)
            },
        ))
    }

    private async init() {
        if (this.version !== undefined) return
        console.info('Initializing event store of stream', this.stream)
        const [version, pastEvents]: [number, Event[]] = await this.eventStore.loadEvents(this.stream)
        const state: State = _.reduce(pastEvents, this.decider.evolve, this.decider.initialState)
        this.version = version
        this.state = state
    }
}
