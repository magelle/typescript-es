export const shorthands = undefined;

export const up = (pgm: any) => {
    pgm.createTable('events', {
        id: 'uuid',
        stream: {type: 'varchar(40)', notNull: true},
        version: {type: 'integer', notNull: true},
        body: {type: 'json', notNull: true},
    })
    pgm.createIndex('events', ['stream', 'version'], {unique: true}),
    // Add snapshot table
    pgm.createTable('snapshots', {
        stream: {type: 'varchar(40)', notNull: true},
        version: {type: 'integer', notNull: true},
        body: {type: 'json', notNull: true},
    }),
    pgm.createConstraint('snapshots', 'unique_stream_version', {unique: ['stream', 'version']}),
    pgm.createIndex('snapshots', ['stream', 'version'], {unique: true})
};

export const down = (pgm: any) => {
    pgm.dropTable('events')
};
