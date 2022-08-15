import {PostgreSQLAdapter} from "../adapter/postgresql.adapter";
import _ from "lodash";
import {QueryResult} from "pg";
import {SnapshotsWithContainer} from "../../05-with-snapshots-in-containers/snapshotsWithContainer";

export class PostgresSnapshotsWithContainer<State> implements SnapshotsWithContainer<State> {
    constructor(private readonly postgreSQLAdapter: PostgreSQLAdapter) {
    }

    async saveSnapshot(stream: string, container: string, newVersion: number, newState: any): Promise<void> {
        // UPDATE if exists, INSERT if not exists
        await this.postgreSQLAdapter.query<State>(
            'INSERT INTO snapshots_with_containers(stream, container, version, body) VALUES($1, $2, $3, $4) ON CONFLICT ON CONSTRAINT unique_stream_container_version DO UPDATE SET body = $5',
            [stream, container, newVersion, JSON.stringify(newState), JSON.stringify(newState)]
        )
    }

    async tryLoadSnapshot(stream: string, container: string): Promise<[number, State | undefined]> {
        const states: QueryResult<{ version: number, body: State }> =
            await this.postgreSQLAdapter.query<{ version: number, body: State }>(
                `SELECT version, body FROM snapshots_with_containers WHERE stream = $1 AND container = $2`,
                [stream, container]
            )
        const state = _.head(states.rows);
        if (state) return [state.version, state.body]
        return [0, undefined]
    }

}
