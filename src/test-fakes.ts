import {Stream} from "./framework";

export class InMemorySimpleEventStore<Event> {
    private readonly events: Event[] = [];

    readonly loadEvents = (_stream: Stream, _version: number): Promise<Event[]> => {
        return Promise.resolve(this.events);
    }

    readonly appendEvents = (_s: Stream, e: Event[]): Promise<void> => {
        this.events.push(...e);
        return Promise.resolve();
    }
}
