import {PostgreSQLAdapter} from "../adapter/postgresql.adapter";
import _ from "lodash";
import {QueryResult} from "pg";
import {SnapshotsWithContainer} from "../../05-with-snapshots-in-containers/snapshotsWithContainer";
import {Serializer} from "../../framework";

export class PostgresSnapshotsWithContainer<State> implements SnapshotsWithContainer<State> {
    constructor(
        private readonly postgreSQLAdapter: PostgreSQLAdapter,
        private readonly serializer: Serializer,
    ) {
    }

    async saveSnapshot(stream: string, container: string, newVersion: number, newState: any): Promise<void> {
        // UPDATE if exists, INSERT if not exists
        const serializedState = this.serializer.serialize(newState);
        await this.postgreSQLAdapter.query<State>(
            'INSERT INTO snapshots_with_containers(stream, container, version, body) VALUES($1, $2, $3, $4) ON CONFLICT ON CONSTRAINT unique_stream_container_version DO UPDATE SET body = $5',
            [stream, container, newVersion, serializedState, serializedState]
        )
    }

    async tryLoadSnapshot(stream: string, container: string): Promise<[number, State | undefined]> {
        const states: QueryResult<{ version: number, body: string }> =
            await this.postgreSQLAdapter.query<{ version: number, body: string }>(
                `SELECT version, body FROM snapshots_with_containers WHERE stream = $1 AND container = $2`,
                [stream, container]
            )
        const state = _.head(states.rows);
        if (state) return [state.version, this.serializer.deserialize<State>(state.body)]
        return [0, undefined]
    }

}
