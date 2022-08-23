import {PostgreSQLAdapter} from "../adapter/postgresql.adapter";
import {v4 as uuidv4} from 'uuid';
import {Serializer, Stream} from "../../framework";
import _ from "lodash";
import {QueryResult} from "pg";
import {Either, left, right} from "fp-ts/Either";
import {EventStoreWithVersion} from "../../eventStoreWithVersion";

type InStoreEvent = {
    id: string, stream: string, version: number, body: string
}

export class PostgresEventStoreWithVersion<Event> implements EventStoreWithVersion<Event> {
    constructor(
        private readonly postgreSQLAdapter: PostgreSQLAdapter,
        private readonly serializer: Serializer,
    ) {
    }

    public loadEvents: (stream: string, version?: number) => Promise<[number, Event[]]> =
        async (stream: string, version?: number) => {
            return await this.loadEventsAfterVersion(stream, version ?? 0)
        }

    public tryAppendEvents: (s: Stream, v: number, e: Event[]) => Promise<Either<[number, Event[]], number>> = async (stream: string, version: number, events: Event[]) => {
        const query = `INSERT INTO events (id, stream, version, body) VALUES ` + events.map((_, i) => `($${i * 4 + 1}, $${i + 2}, $${i * 4 + 3}, $${i * 4 + 4})`).join(', ');
        const values = _.flatMap(events, (e: Event) => ([
            uuidv4(),
            stream,
            ++version,
            this.serializer.serialize(e)
        ]))
        try {
            await this.postgreSQLAdapter.queries({text: query, values});
            return right(version);
        } catch (e) {
            // Error should be : duplicate key value violates unique constraint "events_stream_version_unique_index"
            console.log(e)
            const [lastVersion, catchupEvents]: [number, Event[]] = await this.loadEventsAfterVersion(stream, version)
            return left([lastVersion, catchupEvents]);
        }
    }

    private loadEventsAfterVersion: (stream: string, version: number) => Promise<[number, Event[]]> =
        async (stream: string, afterVersion: number) => {
            const result: QueryResult<InStoreEvent> = await this.postgreSQLAdapter.query(`SELECT id, stream, version, body FROM events WHERE stream = $1 AND version > $2`, [stream, afterVersion])
            const events: Event[] = result.rows
                .map((row: InStoreEvent) => this.serializer.deserialize(row.body));
            const lastVersion: number = _.maxBy(result.rows, e => e.version)?.version ?? afterVersion;
            return [lastVersion, events];
        }
}
