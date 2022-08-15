import {Snapshots} from "../../framework/snapshots";
import {PostgreSQLAdapter} from "../adapter/postgresql.adapter";
import _ from "lodash";
import {QueryResult} from "pg";

export class PostgresSnapshots<State> implements Snapshots<State> {
    constructor(private readonly postgreSQLAdapter: PostgreSQLAdapter) {
    }

    async saveSnapshot(stream: string, newVersion: number, newState: any): Promise<void> {
        // UPDATE if exists, INSERT if not exists
        await this.postgreSQLAdapter.query<State>('INSERT INTO snapshots(stream, version, body) VALUES($1, $2, $3) ON CONFLICT ON CONSTRAINT unique_stream_version DO UPDATE SET body = $4', [stream, newVersion, JSON.stringify(newState), JSON.stringify(newState)])
    }

    async tryLoadSnapshot(stream: string): Promise<[number, State | undefined]> {
        const states: QueryResult<{ version: number, body: State }> =
            await this.postgreSQLAdapter.query<{ version: number, body: State }>(`SELECT snapshots.version, snapshots.body FROM snapshots WHERE stream = $1`, [stream])
        const state = _.head(states.rows);
        if (state) return [state.version, state.body]
        return [0, undefined]
    }

}
