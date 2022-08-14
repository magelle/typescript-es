import {PostgreSQLAdapter} from "../adapter/postgresql.adapter";
import {v4 as uuidv4} from 'uuid';
import {Stream} from "../../framework/framework";
import _ from "lodash";
import {QueryResult} from "pg";
import {Either, left, right} from "fp-ts/Either";
import {EventStoreWithVersion} from "../../framework/eventStoreWithVersion";

type InStoreEvent = {
    id: string, stream: string, version: number, body: string
}

export class PostgresEventStoreWithVersion<Event> implements EventStoreWithVersion<Event> {
    constructor(private readonly postgreSQLAdapter: PostgreSQLAdapter) {
    }

    public loadEvents: (stream: string) => Promise<[number, Event[]]> = async (stream: string) => {
        return await this.loadEventsAfterVersion(stream, 0)
    }

    public tryAppendEvents: (s: Stream, v: number, e: Event[]) => Promise<Either<[number, Event[]], number>> = async (stream: string, version: number, events: Event[]) => {
        const toStore: InStoreEvent[] = events.map((e: Event) => ({
            id: uuidv4(),
            stream: stream,
            version: ++version,
            body: JSON.stringify(e)
        }))
        try {
            await this.insertEvents(toStore)
            return right(version);
        } catch (e) {
            // Error should be : duplicate key value violates unique constraint "events_stream_version_unique_index"
            console.log(e)
            const [lastVersion, catchupEvents]: [number, Event[]] = await this.loadEventsAfterVersion(stream, version)
            return left([lastVersion, catchupEvents]);
        }
    }

    private insertEvents: (event: InStoreEvent[]) => Promise<void> = async (event: InStoreEvent[]) => {
        let query = `INSERT INTO events (id, stream, version, body) VALUES ($1, $2, $3, $4)`;
        const queries = event.map((e: InStoreEvent) => [
            e.id,
            e.stream,
            e.version,
            JSON.stringify(e.body),
        ]).map((params: any[]) => ({
            sql: query,
            params
        }));
        await this.postgreSQLAdapter.multipleQueryInTransaction(queries);
    }

    private loadEventsAfterVersion: (stream: string, version: number) => Promise<[number, Event[]]> = async (stream: string, afterVersion: number) => {
        const result: QueryResult<InStoreEvent> = await this.postgreSQLAdapter.query<InStoreEvent>(`SELECT * FROM events WHERE stream = $1 AND version >= $2`, [stream, afterVersion])
        const events: Event[] = result.rows
            .map((row: InStoreEvent) => JSON.parse(row.body));
        const version: number = _.maxBy(result.rows, e => e.version)?.version ?? 0;
        return [version, events];
    }
}
