import * as _ from "lodash";
import {Either, match} from "fp-ts/Either";
import {pipe} from "fp-ts/function";
import {Decider, EventStore, Stream as StreamName} from "../framework";
import {EventStoreWithVersion} from "../eventStoreWithVersion";
import * as Stream from "stream";

export class WithEventStoreAndVersion<Command, State, Event> implements EventStore<Command, Event> {
    constructor(
        private readonly decider: Decider<Command, State, Event>,
        private readonly stream: StreamName,
        private readonly eventStore: EventStoreWithVersion<Event>,
    ) {
    }

    public handle = async(command: Command): Promise<Event[]> => {
        const {version, state} = await this.getState();
        return await this.handleCommand(version, state, command)
    }

    private async getState() {
        const [version, pastEvents]: [number, Stream.Readable] = await this.eventStore.stream(this.stream)

        let state = this.decider.initialState
        for await (const event of pastEvents) {
            state = this.decider.evolve(state, event)
        }

        return {version, state};
    }

    private handleCommand = async (version: number, state: State, command: Command): Promise<Event[]> => {
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
