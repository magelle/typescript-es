export const shorthands = undefined;

export const up = (pgm: any) => {
    pgm.createTable('events', {
        id: 'id',
        stream: {type: 'varchar(24)', notNull: true},
        version: {type: 'integer', notNull: true},
        body: {type: 'json', notNull: true},
    })
};

export const down = (pgm: any) => {
    pgm.dropTable('events')
};
