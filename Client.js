import DSBAPI from 'dsbapi';
import Promise from 'bluebird';
import rp from 'request-promise';
import cheerio from 'cheerio';
import 'datejs';

export default class DSBClient {

    /**
     *
     * @param username {String}
     * @param password {String}
     */
    constructor(username, password) {
        this.username = username;
        this.password = password;
        this.api = new DSBAPI(this.username, this.password);
        this.fetch = this.fetch.bind(this);
    }

    /**
     *
     * @return {Promise.<TResult>}
     */
    fetch() {
        return this.api.getData().then(DSBClient._filter);
    }

    /**
     *
     * @param data {Object}
     * @private
     */
    static _filter(data) {
        return new Promise((resolve, reject) => {
            if (!data) return reject(new Error("Returned data is null or undefined."));
            if (data["Resultcode"] !== 0) return reject(new Error("Data result code isn't 0. Code: " + data["Resultcode"]));
            if (!data["ResultMenuItems"]) return reject(new Error("No field ResultMenuItems on returned data."));
            if (!Array.isArray(data["ResultMenuItems"])) return reject(new Error("ResultMenuItems isn't an array."));
            if (data["ResultMenuItems"].length === 0) return reject(new Error("ResultMenuItems length is 0."));
            const ResultMenuItems = data["ResultMenuItems"];
            const Inhalte = DSBClient._fromArrayByKeyAndValue(ResultMenuItems, "Title", "Inhalte");
            if (Inhalte === false) return reject(new Error("Can't find {Title:'Inhalte'} in 'ResultMenuItems'."));
            if (!Inhalte["Childs"]) return reject(new Error("'Childs' in 'Inhalte' is null or undefined."));
            if (!Array.isArray(Inhalte["Childs"])) return reject(new Error("'Childs' in 'Inhalte' isn't an array."));
            if (Inhalte["Childs"].length === 0) return reject(new Error("The length of 'Childs' in 'Inhalte' is 0."));
            let InhalteChilds = Inhalte["Childs"];
            return Promise.map(InhalteChilds, function (child) {
                return DSBClient._RootResolver(child);
            }).then(Childs => {
                return Promise.map(Childs, (child, index) => {
                    InhalteChilds[index]['Childs'] = child;
                    delete InhalteChilds[index]['Root'];
                    delete InhalteChilds[index]['NewCount'];
                    delete InhalteChilds[index]['SaveLastState'];
                    delete InhalteChilds[index]['Index'];
                    return Promise.resolve();
                }).then(() => {
                    return Promise.resolve(InhalteChilds);
                });
            }).then(NewInhalte => {
                return Promise.map(NewInhalte, (method) => {
                    if (!method) return Promise.resolve();
                    if (method['MethodName'] === "timetable") {
                        return DSBClient._processed_timetable(method['Childs']);
                    } else if (method['MethodName'] === "tiles") {
                        // TODO: AUSHÄNGE PROMISE
                    } else if (method['MethodName'] === "new") {
                        // TODO: NEWS PROMISE
                    } else {
                        return Promise.resolve();
                    }
                });
            });
        });
    }

    /**
     *
     * @param array {Array}
     * @param key {String}
     * @param value {String}
     * @return {Object|boolean}
     * @private
     */
    static _fromArrayByKeyAndValue(array, key, value) {
        for (let i = 0; i < array.length; i++) {
            if (array[i][key] === value) return array[i];
        }
        return false;
    }

    /**
     *
     * @param object
     * @return {Promise}
     * @private
     */
    static _RootResolver(object) {
        return new Promise((resolve, reject) => {
            if (!object) return reject(new Error("Given parameter is null or undefined."));
            if (typeof object !== 'object') return reject(new Error("Given parameter is not an object."));
            if (!object['Root']) return reject(new Error("'Root' filed of given object is null or undefined."));
            if (typeof object['Root'] !== 'object') return reject(new Error("'Root' field of given object isn't an object."));
            if (!object['Root']['Childs']) return reject(new Error("'Childs' field in given object 'Root' is null or undefined."));
            if (!Array.isArray(object['Root']['Childs'])) return reject(new Error("'Childs' field in given object 'Root' is not an array."));
            resolve(object['Root']['Childs']);
        });
    }

    static _processed_timetable(timetables) {
        return Promise.map(timetables, (table) => {
            if (!table['Childs']) return Promise.reject(new Error("Timetable has no child array."));
            if (!Array.isArray(table['Childs'])) return Promise.reject(new Error("Timetable child field is not an array."));
            if (table['Childs'].length === 0) return Promise.reject(new Error("Timetable child array length is 0."));
            if (typeof table['Childs'][0] !== 'object' || !table['Childs'][0]['Detail']) return Promise.reject(new Error("Corrupted timetable."));
            return rp({
                uri: table['Childs'][0]['Detail'],
                transform: function (body) {
                    return cheerio.load(body);
                }
            }).then($ => {
                const MonTitle = $(".mon_title");
                if (!MonTitle.text()) return Promise.reject(new Error("Can not find 'mon_title' in timetable."));
                if (MonTitle.text().match(/\d*\.\d*\.\d*/).length === 0) return Promise.reject(new Error("Can not find date of timetable."));
                try {
                    const date = Date.parse(MonTitle.text().match(/\d*\.\d*\.\d*/)[0]);
                    return Promise.resolve({
                        src: table['Childs'][0]['Detail'],
                        date: Date.parse(MonTitle.text().match(/\d*\.\d*\.\d*/)[0])
                    });
                } catch (e) {
                    return Promise.reject(new Error("Can't parse date of timetable."));
                }
            });
        });
    }
}