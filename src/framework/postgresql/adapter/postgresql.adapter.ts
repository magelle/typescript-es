import {Pool, PoolClient, QueryConfig, QueryResult} from 'pg';
import {PostgreSQLConfig} from './postgresql.config';
import QueryStream from 'pg-query-stream';
import * as Stream from "stream";

export class PostgreSQLAdapter {
    pool: Pool | undefined;

    constructor(private readonly config: PostgreSQLConfig) {
    }

    public query = async <T>(
        query: string,
        params: unknown[] = []
    ): Promise<QueryResult<T>> => {
        return this.pool!.query(query, params);
    }

    public queryStream = (
        query: string,
        params: unknown[] = []
    ): Stream.Readable => {
        const reader = new Stream.Transform({
            transform(chunk, _, callback) {
                callback(null, chunk)
            },
            objectMode: true,
        })
        this.pool!.connect((err: Error, client: PoolClient, done: (release?: any) => void) => {
            if (err) throw err
            const queryStream = new QueryStream(query, params)
            const stream = client.query(queryStream)
            stream.on('end', done)
            stream.pipe(reader)
        });
        return reader
    }

    public queries = async <T>(
        query: QueryConfig,
    ): Promise<QueryResult<T>> => {
        return await this.pool!.query(query);
    }

    public connect = async (): Promise<void> => {
        const pool = new Pool({
            connectionString: this.config.uri,
        });

        try {
            await pool.query('SELECT NOW();');
        } catch (err: any) {
            throw new Error(
                `PostgreSQL could not execute dummy query. Error: ${err.message}`
            );
        }

        this.pool = pool;
    }

    public close = async (): Promise<void> => {
        await this.pool!.end();
    }
}

export type Query = {
    sql: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    params: any[];
};
