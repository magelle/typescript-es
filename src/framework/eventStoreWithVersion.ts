import {Either} from "fp-ts/Either";
import {Stream as StreamName} from "./framework";
import * as Stream from "stream";

export type EventStoreWithVersion<Event> = {
    loadEvents: (stream: StreamName, version?: number) => Promise<[number, Event[]]>
    stream: (stream: string, version?: number) => Promise<[number, Stream.Readable]>
    tryAppendEvents: (s: StreamName, v: number, e: Event[]) => Promise<Either<[number, Event[]], number>>
};
