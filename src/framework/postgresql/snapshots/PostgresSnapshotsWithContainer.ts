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

    saveSnapshot = async (stream: string, container: string, newVersion: number, newState: any): Promise<void> => {
        // UPDATE if exists, INSERT if not exists
        const serializedState = this.serializer.serialize(newState);
        await this.postgreSQLAdapter.queries<State>({
                name: 'addSnapshot',
                text: 'INSERT INTO snapshots_with_containers(stream, container, version, body) VALUES($1, $2, $3, $4) ON CONFLICT ON CONSTRAINT unique_stream_container_version DO UPDATE SET body = $5',
                values: [stream, container, newVersion, serializedState, serializedState]
            }
        )
    }

    tryLoadSnapshot = async (stream: string, container: string): Promise<[number, State | undefined]> => {
        const states: QueryResult<{ version: number, body: string }> =
            await this.postgreSQLAdapter.queries<{ version: number, body: string }>({
                name: 'getSnapshot',
                text: `SELECT version, body FROM snapshots_with_containers WHERE stream = $1 AND container = $2`,
                values: [stream, container]
            })
        const state = _.head(states.rows);
        if (state) return [state.version, this.serializer.deserialize<State>(state.body)]
        return [0, undefined]
    }

}
