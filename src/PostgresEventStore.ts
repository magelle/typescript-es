import {PostgreSQLAdapter} from "./postgresql/postgresql.adapter";

type InStoreEvent = {
    id: string, stream: string, version: number, event: string
}

export class PostgresEventStore<Event> {
    constructor(private readonly postgreSQLAdapter: PostgreSQLAdapter) {
    }

    public async loadEvents(stream: string, version: number): Promise<Event[]> {
        const result = await this.postgreSQLAdapter.query<InStoreEvent>(`SELECT * FROM events WHERE stream = $1 AND version >= $2`, [stream, version])
        return result.rows
            .map((row: InStoreEvent) => JSON.parse(row.event));
    }

    public async appendEvents(stream: string, events: Event[]): Promise<void> {
        let actualVersion = await this.getLastVersion(stream)
        const toStore: InStoreEvent[] = events.map((e: Event) => ({
            id: new Date().getTime().toString(),
            stream: stream,
            version: ++actualVersion,
            event: JSON.stringify(e)
        }))
        for (const e of toStore) {
            await this.appendEvent(e)
        }
    }

    private async appendEvent(event: InStoreEvent): Promise<void> {
        const toStore = [
            event.id,
            event.stream,
            event.version,
            JSON.stringify(event),
        ];
        await this.postgreSQLAdapter.query<InStoreEvent>(`INSERT INTO events (id, stream, version, event) VALUES ($1, $2, $3, $4)`, toStore);
    }

    private async getLastVersion(stream: string): Promise<number> {
        const result = await this.postgreSQLAdapter.query<InStoreEvent>(`SELECT MAX(version) AS version FROM events WHERE stream = $1`, [stream]);
        return result.rows[0]?.version ?? 0;
    }
}
