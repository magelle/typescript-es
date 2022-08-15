import {Stream} from "../framework";

export type SimpleEventStore<Event> = {
    loadEvents: (stream: Stream, version: number) => Promise<Event[]>
    appendEvents: (s: Stream, e: Event[]) => Promise<void>
};
