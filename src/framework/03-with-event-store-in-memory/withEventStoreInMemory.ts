import {Either, match} from "fp-ts/Either";
import {pipe} from "fp-ts/function";
import * as _ from "lodash";
import {Decider, EventStore, Stream} from "../framework";
import {EventStoreWithVersion} from "../eventStoreWithVersion";

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
