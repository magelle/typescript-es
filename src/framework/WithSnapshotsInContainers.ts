import {Either, match} from "fp-ts/Either";
import {pipe} from "fp-ts/function";
import * as _ from "lodash";
import {Decider, EventStore, Stream} from "./framework";
import {EventStoreWithVersion} from "./eventStoreWithVersion";
import {SnapshotsWithContainer} from "./snapshotsWithContainer";
import {hash} from "fast-check";

export class WithSnapshotsInContainers<Command, State, Event> implements EventStore<Command, Event> {

    private readonly container: string;

    constructor(
        private readonly decider: Decider<Command, State, Event>,
        private readonly stream: Stream,
        private readonly eventStore: EventStoreWithVersion<Event>,
        private readonly snapshots: SnapshotsWithContainer<State>,
    ) {
        this.container = this.getContainerFromDecideHash(decider)
    }

    private getContainerFromDecideHash(decider: Decider<Command, State, Event>): string {
        // Make this better to avoid having a new container when the decider is refactored
        return hash(decider.evolve.toString()).toString();
    }

    public async handle(command: Command): Promise<Event[]> {
        const [version, state]: [number, State] = await this.loadState()
        return await this.handleCommand(version!, state, command)
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
                if(this.isTimeToSnapshot(version)) {
                    const newState = _.reduce(events, this.decider.evolve, state!)
                    this.snapshots.saveSnapshot(this.stream, this.container, version, newState)
                }
                return Promise.resolve(events)
            },
        ))
    }

    private async loadState(): Promise<[number, State]> {
        let [snapVersion, snapState] = await this.snapshots.tryLoadSnapshot(this.stream, this.container);
        if (!snapState) {
            snapVersion = 0
            snapState = this.decider.initialState
        }

        const [lastVersion, events] = await this.eventStore.loadEvents(this.stream, snapVersion)

        const state = _.reduce(events, this.decider.evolve, snapState)

        return [lastVersion, state]
    }

    private isTimeToSnapshot(version: number) {
        return version % 1 === 0;
    }
}
