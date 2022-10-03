import {PostgreSQLAdapter} from "../adapter/postgresql.adapter";
import {v4 as uuidv4} from 'uuid';
import {Serializer, Stream as StreamName} from "../../framework";
import _ from "lodash";
import {QueryResult} from "pg";
import {Either, left, right} from "fp-ts/Either";
import {EventStoreWithVersion} from "../../eventStoreWithVersion";
import * as Stream from "stream";

type InStoreEvent = {
    id: string, stream: string, version: number, body: string
}

export class PostgresEventStoreWithVersion<Event> implements EventStoreWithVersion<Event> {
    constructor(
        private readonly postgreSQLAdapter: PostgreSQLAdapter,
        private readonly serializer: Serializer<any>,
    ) {
    }

    public loadEvents: (stream: StreamName, version?: number) => Promise<[number, Event[]]> =
        async (stream: StreamName, version?: number) => {
            return await this.loadEventsAfterVersion(stream, version ?? 0)
        }

    public stream: (stream: string, version?: number) => Promise<[number, Stream.Readable]> = async (stream: string, version?: number) => {
        let transform = new Stream.Transform({
            transform: async (chunk, _, done: (error?: (Error | null), data?: any) => void) => {
                transform.push(this.serializer.deserialize(chunk.body))
                done()
            },
            objectMode: true,
        });

        const eventStream = await this.postgreSQLAdapter.queryStream(`SELECT * FROM events WHERE stream = $1 AND version >= $2`, [stream, version ?? 0])
            .pipe(transform)

        const lastVersion = await this.getLastVersion(stream)
        return [lastVersion, eventStream]
    }

    public tryAppendEvents: (s: StreamName, v: number, e: Event[]) => Promise<Either<[number, Event[]], number>> = async (stream: string, version: number, events: Event[]) => {
        const query = `INSERT INTO events (id, stream, version, body) VALUES ` + events.map((_, i) => `($${i * 4 + 1}, $${i * 4 + 2}, $${i * 4 + 3}, $${i * 4 + 4})`).join(', ');
        let eventVersion = version + 1
        const values = _.flatMap(events, (e: Event, i: number) => {
            eventVersion += 1
            return [
                uuidv4(),
                stream,
                version + i + 1,
                this.serializer.serialize(e)
            ]
        })
        try {
            await this.postgreSQLAdapter.queries({text: query, values});
            return right(eventVersion);
        } catch (e) {
            // Error should be : duplicate key value violates unique constraint "events_stream_version_unique_index"
            console.log(e)
            const [lastVersion, catchupEvents]: [number, Event[]] = await this.loadEventsAfterVersion(stream, version)
            return left([lastVersion, catchupEvents]);
        }
    }

    private loadEventsAfterVersion: (stream: StreamName, version: number) => Promise<[number, Event[]]> =
        async (stream: string, afterVersion: number) => {
            const result: QueryResult<InStoreEvent> = await this.postgreSQLAdapter.query(`SELECT id, stream, version, body FROM events WHERE stream = $1 AND version > $2`, [stream, afterVersion])
            const events: Event[] = result.rows
                .map((row: InStoreEvent) => this.serializer.deserialize(row.body));
            const lastVersion: number = _.maxBy(result.rows, e => e.version)?.version ?? afterVersion;
            return [lastVersion, events];
        }

    private getLastVersion: (stream: StreamName) => Promise<number> = async (stream: string) => {
        const result = await this.postgreSQLAdapter.query<InStoreEvent>(`SELECT MAX(version) AS version FROM events WHERE stream = $1`, [stream]);
        return result.rows[0]?.version ?? 0;
    }
}
