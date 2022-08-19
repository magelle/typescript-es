import {PostgreSQLAdapter} from "../adapter/postgresql.adapter";
import {v4 as uuidv4} from "uuid";
import {SimpleEventStore} from "../../01-with-event-store/simpleEventStore";
import {Serializer} from "../../framework";

type InStoreEvent = {
    id: string, stream: string, version: number, body: string
}

export class PostgresSimpleEventStore<Event> implements SimpleEventStore<Event> {
    constructor(
        private readonly postgreSQLAdapter: PostgreSQLAdapter,
        private readonly serializer: Serializer,
    ) {
    }

    public loadEvents: (stream: string, version: number) => Promise<Event[]> = async (stream: string, version: number) => {
        const result = await this.postgreSQLAdapter.query<InStoreEvent>(`SELECT * FROM events WHERE stream = $1 AND version >= $2`, [stream, version])
        return result.rows
            .map((row: InStoreEvent) => this.serializer.deserialize(row.body));
    }

    public appendEvents: (stream: string, events: Event[]) => Promise<void> = async (stream: string, events: Event[]) => {
        let actualVersion = await this.getLastVersion(stream)
        const toStore: InStoreEvent[] = events.map((e: Event) => ({
            id: uuidv4(),
            stream: stream,
            version: ++actualVersion,
            body: this.serializer.serialize(e)
        }))
        await this.insertEvents(toStore)
    }

    private insertEvents: (event: InStoreEvent[]) => Promise<void> = async (event: InStoreEvent[]) => {
        const query = `INSERT INTO events (id, stream, version, body) VALUES ` + event.map((_, i) => `($${i * 4 + 1}, $${i + 2}, $${i * 4 + 3}, $${i * 4 + 4})`).join(', ');
        const values = event.flatMap((e: InStoreEvent) => [
            e.id,
            e.stream,
            e.version,
            e.body,
        ]);

        const queries = {
            text: query,
            values: values
        }
        await this.postgreSQLAdapter.queries(queries);
    }

    private getLastVersion: (stream: string) => Promise<number> = async (stream: string) => {
        const result = await this.postgreSQLAdapter.query<InStoreEvent>(`SELECT MAX(version) AS version FROM events WHERE stream = $1`, [stream]);
        return result.rows[0]?.version ?? 0;
    }
}
