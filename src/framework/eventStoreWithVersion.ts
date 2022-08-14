import {Either} from "fp-ts/Either";
import {Stream} from "./framework";

export type EventStoreWithVersion<Event> = {
    loadEvents: (stream: Stream) => Promise<[number, Event[]]>
    tryAppendEvents: (s: Stream, v: number, e: Event[]) => Promise<Either<[number, Event[]], number>>
};
