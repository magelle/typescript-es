import * as _ from "lodash";
import {Decider, EventStore, Stream} from "./framework";
import {SimpleEventStore} from "./simpleEventStore";

export class WithEventStore<Command, State, Event> implements EventStore<Command, Event> {
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
