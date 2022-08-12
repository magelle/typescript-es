import {PostgreSQLAdapter} from "./postgresql/postgresql.adapter";
import { v4 as uuidv4 } from 'uuid';

type InStoreEvent = {
    id: string, stream: string, version: number, body: string
}

export class PostgresEventStore<Event> {
    constructor(private readonly postgreSQLAdapter: PostgreSQLAdapter) {
    }

    public loadEvents: (stream: string, version: number) => Promise<Event[]> = async (stream: string, version: number) => {
        const result = await this.postgreSQLAdapter.query<InStoreEvent>(`SELECT * FROM events WHERE stream = $1 AND version >= $2`, [stream, version])
        return result.rows
            .map((row: InStoreEvent) => JSON.parse(row.body));
    }

    public appendEvents: (stream: string, events: Event[]) => Promise<void> = async (stream: string, events: Event[]) => {
        let actualVersion = await this.getLastVersion(stream)
        const toStore: InStoreEvent[] = events.map((e: Event) => ({
            id: uuidv4(),
            stream: stream,
            version: ++actualVersion,
            body: JSON.stringify(e)
        }))
        for (const e of toStore) {
            await this.appendEvent(e)
        }
    }

    private appendEvent: (event: InStoreEvent) => Promise<void> = async (event: InStoreEvent) => {
        const toStore = [
            event.id,
            event.stream,
            event.version,
            JSON.stringify(event.body),
        ];
        await this.postgreSQLAdapter.query<InStoreEvent>(`INSERT INTO events (id, stream, version, body) VALUES ($1, $2, $3, $4)`, toStore);
    }

    private getLastVersion: (stream: string) => Promise<number> = async (stream: string) => {
        const result = await this.postgreSQLAdapter.query<InStoreEvent>(`SELECT MAX(version) AS version FROM events WHERE stream = $1`, [stream]);
        return result.rows[0]?.version ?? 0;
    }
}
