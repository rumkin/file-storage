const pify = require('pify');
const {defineConst} = require('../lib/utils.js');

class NedbDataStorage {
    constructor({db} = {}) {
        if (! db) {
            throw new Error('Database required');
        }

        defineConst(this, 'db', db);
        // Promisify db methods
        defineConst(this, '_insert', pify(db.insert.bind(db)));
        defineConst(this, '_update', pify(db.update.bind(db)));
        defineConst(this, '_find', pify(db.find.bind(db)));
        defineConst(this, '_findOne', pify(db.findOne.bind(db)));
        defineConst(this, '_remove', pify(db.remove.bind(db)));
        defineConst(this, '_count', pify(db.count.bind(db)));
    }

    /**
     * Set item with id
     *
     * @param  {String} id   Item id.
     * @param  {Object} data Item data.
     * @return {Promise} Promise resolves with inserted item.
     */
    put(id, data) {
        var data_ = Object.assign({_id: null}, data, {
            _id: id,
            isDeleted: false,
            createDate: new Date(),
            updateDate: new Date(),
        });
        // Validate data object
        // Append default fields
        return this._insert(Object.assign({}, data, {
            _id: id,
            isDeleted: false,
            createDate: new Date(),
            updateDate: new Date(),
        }));
    }

    /**
     * Get item by id.
     *
     * @param  {String} id Item id.
     * @return {Promise<Object|Null,Error>} Promise resolves with document or null
     */
    get(id) {
        return this._findOne({_id: id});
    }

    /**
     * Check if item exists in storage
     * @param {String} id Item id
     * @returns {Promise<Boolean,Error>} Promise resolves with boolean status.
     */
    has(id) {
        return this._count({
            _id: id
        })
        .then((count) => count > 0);
    }

    /**
     * Delete item from sotrage
     * @param {String} id Item id
     * @return {Promise}
     */
    delete(id) {
        return this._remove({_id: id});
    }

    /**
     * Mark item as updated
     */
    setUpdated(id) {
        return this._update({
            _id: id,
        }, {
            $set: {
                updateDate: new Date(),
            },
        });
    }

    /**
     * Mark item as deleted
     */
    setDeleted(id) {
        return this._update({
            _id: id,
        }, {
            $set: {
                isDeleted: true,
                updateDate: new Date(),
            },
        });
    }

    find(query, {select, sort, skip, limit}) {
        return new Promise((resolve, reject) => {
            var cursor = this.db.find(query);

            if (skip) {
                cursor.skip(skip);
            }

            if (limit) {
                cursor.limit(limit);
            }

            if (sort) {
                cursor.sort({
                    updateDate: -1,
                });
            }

            if (select) {
                cursor.projection(select);
            }

            cursor.exec((err, docs) => {
                if (err) {
                    reject(err);
                }
                else {
                    resolve(docs);
                }
            });
        });
    }

    count(query) {
        return this._count(query);
    }

    /**
     * List items updated after specified Database.
     *
     * @param {Date|Number} date Minimum update date
     * @return {Promise<Object[]>} Promise resolvs with array of updated documents.
     */
    listUpdated(date, {skip, limit} = {}) {
        return this.find({
            updateDate: {$gte: this._getDate(date)},
        }, {
            sort: {
                updateDate: -1,
            },
            skip,
            limit
        });
    }

    /**
     * Check if there is file updates in the store.
     *
     * @param {Date|Number} date Minimum update date
     * @return {Promise<Object[]>} Promise resolves with true if there is one.
     */
    hasUpdates(date) {
        return this.countUpdates(date)
        .then((count) => count > 0);
    }

    /**
     * Count updated documents number.
     *
     * @param {Date|Number} date Minimum update date
     * @return {Promise<Object[]>} Promise resolves with number of documents.
     */
    countUpdates(date) {
        return this.count({
            updateDate: {$gte: this._getDate(date)},
        });
    }

    _getDate(date) {
        if (! (date instanceof Date)) {
            return new Date(date);
        }
        else {
            return date;
        }
    }
}

module.exports = NedbDataStorage;
