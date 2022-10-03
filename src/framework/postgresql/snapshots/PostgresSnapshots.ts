import {Snapshots} from "../../04-with-snapshots/snapshots";
import {PostgreSQLAdapter} from "../adapter/postgresql.adapter";
import _ from "lodash";
import {QueryResult} from "pg";
import {Serializer} from "../../framework";

export class PostgresSnapshots<State> implements Snapshots<State> {
    constructor(
        private readonly postgreSQLAdapter: PostgreSQLAdapter,
        private readonly serializer: Serializer<any>,
    ) {
    }

    private readonly addSnapshotQuery = 'INSERT INTO snapshots(stream, version, body) VALUES($1, $2, $3) ON CONFLICT ON CONSTRAINT unique_stream_version DO UPDATE SET body = $4';
    saveSnapshot = async (stream: string, newVersion: number, newState: any): Promise<void> => {
        // UPDATE if exists, INSERT if not exists
        const serializedState = this.serializer.serialize(newState);
        await this.postgreSQLAdapter.queries<State>({
            name: 'addSnapshot',
            text: this.addSnapshotQuery,
            values: [stream, newVersion, serializedState, serializedState]
        })
    }

    private readonly getSnapshotQuery = `SELECT snapshots.version, snapshots.body FROM snapshots WHERE stream = $1`;
    tryLoadSnapshot = async (stream: string): Promise<[number, State | undefined]> => {
        const states: QueryResult<{ version: number, body: string }> =
            await this.postgreSQLAdapter.queries<{ version: number, body: string }>({
                name: 'getSnapshot',
                text: this.getSnapshotQuery,
                values: [stream]
            })
        const state = _.head(states.rows);
        if (state) return [state.version, this.serializer.deserialize<State>(state.body)]
        return [0, undefined]
    }

}
