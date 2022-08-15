import * as _ from "lodash";
import {Either, match} from "fp-ts/Either";
import {pipe} from "fp-ts/function";
import {Decider, EventStore, Stream} from "../framework";
import {EventStoreWithVersion} from "../eventStoreWithVersion";

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
