import {join} from "path";
import {PostgreSQLConfig} from "../postgresql/adapter/postgresql.config";
import {PostgreSQLAdapter} from "../postgresql/adapter/postgresql.adapter";
import migration from "node-pg-migrate";

const MIGRATION_DIR = join(__dirname, '../../migrations');
const MIGRATION_TABLE = 'pgmirations';
const POSTGRESQL_DB = 'postgres';
const POSTGRESQL_AUTH = 'postgres:integration-pass';

export async function buildPostgresqlAdapter() {
    // @ts-ignore
    global.__TESTCONTAINERS_POSTGRE_IP__ = global.__TESTCONTAINERS__[0].host;
    // @ts-ignore
    global.__TESTCONTAINERS_POSTGRE_PORT_5432__ = global.__TESTCONTAINERS__[0].getMappedPort(5432);
    // @ts-ignore
    const uri = `postgresql://${POSTGRESQL_AUTH}@${global.__TESTCONTAINERS_POSTGRE_IP__}:${global.__TESTCONTAINERS_POSTGRE_PORT_5432__}/${POSTGRESQL_DB}`;
    const postgreSQLConfig: PostgreSQLConfig = {uri};
    const postgreSQLAdapter = new PostgreSQLAdapter(postgreSQLConfig);

    await postgreSQLAdapter.connect();
    await migration({
        logger: console,
        databaseUrl: uri,
        dir: MIGRATION_DIR,
        migrationsTable: MIGRATION_TABLE,
        direction: 'up',
        count: 999,
        noLock: true,
    });
    return postgreSQLAdapter;
}
