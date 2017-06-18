'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _dsbapi = require('dsbapi');

var _dsbapi2 = _interopRequireDefault(_dsbapi);

var _bluebird = require('bluebird');

var _bluebird2 = _interopRequireDefault(_bluebird);

var _requestPromise = require('request-promise');

var _requestPromise2 = _interopRequireDefault(_requestPromise);

var _cheerio = require('cheerio');

var _cheerio2 = _interopRequireDefault(_cheerio);

require('datejs');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var DSBClient = function () {

    /**
     *
     * @param username {String}
     * @param password {String}
     */
    function DSBClient(username, password) {
        _classCallCheck(this, DSBClient);

        this.username = username;
        this.password = password;
        this.api = new _dsbapi2.default(this.username, this.password);
        this.fetch = this.fetch.bind(this);
    }

    /**
     *
     * @return {Promise.<TResult>}
     */


    _createClass(DSBClient, [{
        key: 'fetch',
        value: function fetch() {
            return this.api.getData().then(DSBClient._filter);
        }

        /**
         *
         * @param data {Object}
         * @private
         */

    }], [{
        key: '_filter',
        value: function _filter(data) {
            return new _bluebird2.default(function (resolve, reject) {
                if (!data) return reject(new Error("Returned data is null or undefined."));
                if (data["Resultcode"] !== 0) return reject(new Error("Data result code isn't 0. Code: " + data["Resultcode"]));
                if (!data["ResultMenuItems"]) return reject(new Error("No field ResultMenuItems on returned data."));
                if (!Array.isArray(data["ResultMenuItems"])) return reject(new Error("ResultMenuItems isn't an array."));
                if (data["ResultMenuItems"].length === 0) return reject(new Error("ResultMenuItems length is 0."));
                var ResultMenuItems = data["ResultMenuItems"];
                var Inhalte = DSBClient._fromArrayByKeyAndValue(ResultMenuItems, "Title", "Inhalte");
                if (Inhalte === false) return reject(new Error("Can't find {Title:'Inhalte'} in 'ResultMenuItems'."));
                if (!Inhalte["Childs"]) return reject(new Error("'Childs' in 'Inhalte' is null or undefined."));
                if (!Array.isArray(Inhalte["Childs"])) return reject(new Error("'Childs' in 'Inhalte' isn't an array."));
                if (Inhalte["Childs"].length === 0) return reject(new Error("The length of 'Childs' in 'Inhalte' is 0."));
                var InhalteChilds = Inhalte["Childs"];
                return _bluebird2.default.map(InhalteChilds, function (child) {
                    return DSBClient._RootResolver(child);
                }).then(function (Childs) {
                    return _bluebird2.default.map(Childs, function (child, index) {
                        InhalteChilds[index]['Childs'] = child;
                        delete InhalteChilds[index]['Root'];
                        delete InhalteChilds[index]['NewCount'];
                        delete InhalteChilds[index]['SaveLastState'];
                        delete InhalteChilds[index]['Index'];
                        return _bluebird2.default.resolve();
                    }).then(function () {
                        return _bluebird2.default.resolve(InhalteChilds);
                    });
                }).then(function (NewInhalte) {
                    var fdata = {};
                    return _bluebird2.default.map(NewInhalte, function (method) {
                        if (!method) return _bluebird2.default.resolve();
                        if (method['MethodName'] === "timetable") {
                            return DSBClient._processed_timetable(method['Childs']).then(function (tdata) {
                                fdata[tdata.kind] = tdata.data;
                            });
                        } else if (method['MethodName'] === "tiles") {
                            return DSBClient._processed_tiles(method['Childs']).then(function (tdata) {
                                fdata[tdata.kind] = tdata.data;
                            });
                        } else if (method['MethodName'] === "news") {
                            return DSBClient._processed_news(method['Childs']).then(function (tdata) {
                                fdata[tdata.kind] = tdata.data;
                            });
                        } else {
                            return _bluebird2.default.resolve();
                        }
                    }).then(function () {
                        return _bluebird2.default.resolve(fdata);
                    });
                }).then(function (data) {
                    resolve(data);
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

    }, {
        key: '_fromArrayByKeyAndValue',
        value: function _fromArrayByKeyAndValue(array, key, value) {
            for (var i = 0; i < array.length; i++) {
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

    }, {
        key: '_RootResolver',
        value: function _RootResolver(object) {
            return new _bluebird2.default(function (resolve, reject) {
                if (!object) return reject(new Error("Given parameter is null or undefined."));
                if ((typeof object === 'undefined' ? 'undefined' : _typeof(object)) !== 'object') return reject(new Error("Given parameter is not an object."));
                if (!object['Root']) return reject(new Error("'Root' filed of given object is null or undefined."));
                if (_typeof(object['Root']) !== 'object') return reject(new Error("'Root' field of given object isn't an object."));
                if (!object['Root']['Childs']) return reject(new Error("'Childs' field in given object 'Root' is null or undefined."));
                if (!Array.isArray(object['Root']['Childs'])) return reject(new Error("'Childs' field in given object 'Root' is not an array."));
                resolve(object['Root']['Childs']);
            });
        }
    }, {
        key: '_processed_timetable',
        value: function _processed_timetable(timetables) {
            return _bluebird2.default.map(timetables, function (table) {
                if (!table['Childs']) return _bluebird2.default.reject(new Error("Timetable has no child array."));
                if (!Array.isArray(table['Childs'])) return _bluebird2.default.reject(new Error("Timetable child field is not an array."));
                if (table['Childs'].length === 0) return _bluebird2.default.reject(new Error("Timetable child array length is 0."));
                if (_typeof(table['Childs'][0]) !== 'object' || !table['Childs'][0]['Detail']) return _bluebird2.default.reject(new Error("Corrupted timetable."));
                return (0, _requestPromise2.default)({
                    uri: table['Childs'][0]['Detail'],
                    transform: function transform(body) {
                        return _cheerio2.default.load(body);
                    }
                }).then(function ($) {
                    debugger;
                    var MonTitle = $(".mon_title");
                    if (!MonTitle.text()) return _bluebird2.default.reject(new Error("Can not find 'mon_title' in timetable."));
                    if (MonTitle.text().match(/\d*\.\d*\.\d*/).length === 0) return _bluebird2.default.reject(new Error("Can not find date of timetable."));
                    return new _bluebird2.default(function (resolve, reject) {
                        try {
                            var date = Date.parse(MonTitle.text().match(/\d*\.\d*\.\d*/)[0]);
                            resolve({
                                src: table['Childs'][0]['Detail'],
                                date: Date.parse(MonTitle.text().match(/\d*\.\d*\.\d*/)[0]),
                                refreshed: Date.parse(table['Childs'][0]['Date'])
                            });
                        } catch (e) {
                            reject(new Error("Can't parse date of timetable."));
                        }
                    });
                });
            }).then(function (timetables) {
                return _bluebird2.default.resolve({
                    kind: "timetables",
                    data: timetables
                });
            });
        }
    }, {
        key: '_processed_news',
        value: function _processed_news(newspl) {
            return _bluebird2.default.map(newspl, function (news) {
                return _bluebird2.default.resolve({
                    date: news["Date"],
                    title: news["Title"],
                    text: news["Detail"]
                });
            }).then(function (data) {
                return _bluebird2.default.resolve({
                    kind: "news",
                    data: data
                });
            });
        }
    }, {
        key: '_processed_tiles',
        value: function _processed_tiles(tiles) {
            return _bluebird2.default.map(tiles, function (tile) {
                if (!tile || !tile["Childs"] || !Array.isArray(tile["Childs"])) return _bluebird2.default.reject(new Error("Corrupted tile."));
                return _bluebird2.default.map(tile["Childs"], function (tile2) {
                    return _bluebird2.default.resolve({
                        date: tile2["Date"],
                        title: tile2["Title"],
                        detail: tile2["Detail"]
                    });
                });
            }).then(function (data) {
                return _bluebird2.default.resolve({
                    kind: "tiles",
                    data: data.combine()
                });
            });
        }
    }]);

    return DSBClient;
}();

exports.default = DSBClient;


Array.prototype.combine = function () {
    var x = [];
    for (var i = 0; i < this.length; i++) {
        if (Array.isArray(this[i])) {
            for (var ii = 0; ii < this[i].length; ii++) {
                x.push(this[i][ii]);
            }
        }
    }
    return x;
};

//# sourceMappingURL=data:application/json;charset=utf-8;base64,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LENBQWQsQ0FBSixFQUE0QjtBQUN4QixpQkFBSyxJQUFJLEtBQUssQ0FBZCxFQUFpQixLQUFLLEtBQUssQ0FBTCxFQUFRLE1BQTlCLEVBQXNDLElBQXRDLEVBQTRDO0FBQ3hDLGtCQUFFLElBQUYsQ0FBTyxLQUFLLENBQUwsRUFBUSxFQUFSLENBQVA7QUFDSDtBQUNKO0FBQ0o7QUFDRCxXQUFPLENBQVA7QUFDSCxDQVZEIiwiZmlsZSI6ImVzMjAxNS5qcyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCBEU0JBUEkgZnJvbSAnZHNiYXBpJztcbmltcG9ydCBQcm9taXNlIGZyb20gJ2JsdWViaXJkJztcbmltcG9ydCBycCBmcm9tICdyZXF1ZXN0LXByb21pc2UnO1xuaW1wb3J0IGNoZWVyaW8gZnJvbSAnY2hlZXJpbyc7XG5pbXBvcnQgJ2RhdGVqcyc7XG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIERTQkNsaWVudCB7XG5cbiAgICAvKipcbiAgICAgKlxuICAgICAqIEBwYXJhbSB1c2VybmFtZSB7U3RyaW5nfVxuICAgICAqIEBwYXJhbSBwYXNzd29yZCB7U3RyaW5nfVxuICAgICAqL1xuICAgIGNvbnN0cnVjdG9yKHVzZXJuYW1lLCBwYXNzd29yZCkge1xuICAgICAgICB0aGlzLnVzZXJuYW1lID0gdXNlcm5hbWU7XG4gICAgICAgIHRoaXMucGFzc3dvcmQgPSBwYXNzd29yZDtcbiAgICAgICAgdGhpcy5hcGkgPSBuZXcgRFNCQVBJKHRoaXMudXNlcm5hbWUsIHRoaXMucGFzc3dvcmQpO1xuICAgICAgICB0aGlzLmZldGNoID0gdGhpcy5mZXRjaC5iaW5kKHRoaXMpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqXG4gICAgICogQHJldHVybiB7UHJvbWlzZS48VFJlc3VsdD59XG4gICAgICovXG4gICAgZmV0Y2goKSB7XG4gICAgICAgIHJldHVybiB0aGlzLmFwaS5nZXREYXRhKCkudGhlbihEU0JDbGllbnQuX2ZpbHRlcik7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICpcbiAgICAgKiBAcGFyYW0gZGF0YSB7T2JqZWN0fVxuICAgICAqIEBwcml2YXRlXG4gICAgICovXG4gICAgc3RhdGljIF9maWx0ZXIoZGF0YSkge1xuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgICAgICAgICAgaWYgKCFkYXRhKSByZXR1cm4gcmVqZWN0KG5ldyBFcnJvcihcIlJldHVybmVkIGRhdGEgaXMgbnVsbCBvciB1bmRlZmluZWQuXCIpKTtcbiAgICAgICAgICAgIGlmIChkYXRhW1wiUmVzdWx0Y29kZVwiXSAhPT0gMCkgcmV0dXJuIHJlamVjdChuZXcgRXJyb3IoXCJEYXRhIHJlc3VsdCBjb2RlIGlzbid0IDAuIENvZGU6IFwiICsgZGF0YVtcIlJlc3VsdGNvZGVcIl0pKTtcbiAgICAgICAgICAgIGlmICghZGF0YVtcIlJlc3VsdE1lbnVJdGVtc1wiXSkgcmV0dXJuIHJlamVjdChuZXcgRXJyb3IoXCJObyBmaWVsZCBSZXN1bHRNZW51SXRlbXMgb24gcmV0dXJuZWQgZGF0YS5cIikpO1xuICAgICAgICAgICAgaWYgKCFBcnJheS5pc0FycmF5KGRhdGFbXCJSZXN1bHRNZW51SXRlbXNcIl0pKSByZXR1cm4gcmVqZWN0KG5ldyBFcnJvcihcIlJlc3VsdE1lbnVJdGVtcyBpc24ndCBhbiBhcnJheS5cIikpO1xuICAgICAgICAgICAgaWYgKGRhdGFbXCJSZXN1bHRNZW51SXRlbXNcIl0ubGVuZ3RoID09PSAwKSByZXR1cm4gcmVqZWN0KG5ldyBFcnJvcihcIlJlc3VsdE1lbnVJdGVtcyBsZW5ndGggaXMgMC5cIikpO1xuICAgICAgICAgICAgY29uc3QgUmVzdWx0TWVudUl0ZW1zID0gZGF0YVtcIlJlc3VsdE1lbnVJdGVtc1wiXTtcbiAgICAgICAgICAgIGNvbnN0IEluaGFsdGUgPSBEU0JDbGllbnQuX2Zyb21BcnJheUJ5S2V5QW5kVmFsdWUoUmVzdWx0TWVudUl0ZW1zLCBcIlRpdGxlXCIsIFwiSW5oYWx0ZVwiKTtcbiAgICAgICAgICAgIGlmIChJbmhhbHRlID09PSBmYWxzZSkgcmV0dXJuIHJlamVjdChuZXcgRXJyb3IoXCJDYW4ndCBmaW5kIHtUaXRsZTonSW5oYWx0ZSd9IGluICdSZXN1bHRNZW51SXRlbXMnLlwiKSk7XG4gICAgICAgICAgICBpZiAoIUluaGFsdGVbXCJDaGlsZHNcIl0pIHJldHVybiByZWplY3QobmV3IEVycm9yKFwiJ0NoaWxkcycgaW4gJ0luaGFsdGUnIGlzIG51bGwgb3IgdW5kZWZpbmVkLlwiKSk7XG4gICAgICAgICAgICBpZiAoIUFycmF5LmlzQXJyYXkoSW5oYWx0ZVtcIkNoaWxkc1wiXSkpIHJldHVybiByZWplY3QobmV3IEVycm9yKFwiJ0NoaWxkcycgaW4gJ0luaGFsdGUnIGlzbid0IGFuIGFycmF5LlwiKSk7XG4gICAgICAgICAgICBpZiAoSW5oYWx0ZVtcIkNoaWxkc1wiXS5sZW5ndGggPT09IDApIHJldHVybiByZWplY3QobmV3IEVycm9yKFwiVGhlIGxlbmd0aCBvZiAnQ2hpbGRzJyBpbiAnSW5oYWx0ZScgaXMgMC5cIikpO1xuICAgICAgICAgICAgbGV0IEluaGFsdGVDaGlsZHMgPSBJbmhhbHRlW1wiQ2hpbGRzXCJdO1xuICAgICAgICAgICAgcmV0dXJuIFByb21pc2UubWFwKEluaGFsdGVDaGlsZHMsIGZ1bmN0aW9uIChjaGlsZCkge1xuICAgICAgICAgICAgICAgIHJldHVybiBEU0JDbGllbnQuX1Jvb3RSZXNvbHZlcihjaGlsZCk7XG4gICAgICAgICAgICB9KS50aGVuKENoaWxkcyA9PiB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIFByb21pc2UubWFwKENoaWxkcywgKGNoaWxkLCBpbmRleCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICBJbmhhbHRlQ2hpbGRzW2luZGV4XVsnQ2hpbGRzJ10gPSBjaGlsZDtcbiAgICAgICAgICAgICAgICAgICAgZGVsZXRlIEluaGFsdGVDaGlsZHNbaW5kZXhdWydSb290J107XG4gICAgICAgICAgICAgICAgICAgIGRlbGV0ZSBJbmhhbHRlQ2hpbGRzW2luZGV4XVsnTmV3Q291bnQnXTtcbiAgICAgICAgICAgICAgICAgICAgZGVsZXRlIEluaGFsdGVDaGlsZHNbaW5kZXhdWydTYXZlTGFzdFN0YXRlJ107XG4gICAgICAgICAgICAgICAgICAgIGRlbGV0ZSBJbmhhbHRlQ2hpbGRzW2luZGV4XVsnSW5kZXgnXTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIFByb21pc2UucmVzb2x2ZSgpO1xuICAgICAgICAgICAgICAgIH0pLnRoZW4oKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKEluaGFsdGVDaGlsZHMpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSkudGhlbihOZXdJbmhhbHRlID0+IHtcbiAgICAgICAgICAgICAgICBsZXQgZmRhdGEgPSB7fTtcbiAgICAgICAgICAgICAgICByZXR1cm4gUHJvbWlzZS5tYXAoTmV3SW5oYWx0ZSwgKG1ldGhvZCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICBpZiAoIW1ldGhvZCkgcmV0dXJuIFByb21pc2UucmVzb2x2ZSgpO1xuICAgICAgICAgICAgICAgICAgICBpZiAobWV0aG9kWydNZXRob2ROYW1lJ10gPT09IFwidGltZXRhYmxlXCIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBEU0JDbGllbnQuX3Byb2Nlc3NlZF90aW1ldGFibGUobWV0aG9kWydDaGlsZHMnXSkudGhlbih0ZGF0YSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZmRhdGFbdGRhdGEua2luZF0gPSB0ZGF0YS5kYXRhO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAobWV0aG9kWydNZXRob2ROYW1lJ10gPT09IFwidGlsZXNcIikge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIERTQkNsaWVudC5fcHJvY2Vzc2VkX3RpbGVzKG1ldGhvZFsnQ2hpbGRzJ10pLnRoZW4odGRhdGEgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZkYXRhW3RkYXRhLmtpbmRdID0gdGRhdGEuZGF0YTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKG1ldGhvZFsnTWV0aG9kTmFtZSddID09PSBcIm5ld3NcIikge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIERTQkNsaWVudC5fcHJvY2Vzc2VkX25ld3MobWV0aG9kWydDaGlsZHMnXSkudGhlbih0ZGF0YSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZmRhdGFbdGRhdGEua2luZF0gPSB0ZGF0YS5kYXRhO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9KS50aGVuKCgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIFByb21pc2UucmVzb2x2ZShmZGF0YSk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9KS50aGVuKGRhdGE9PntcbiAgICAgICAgICAgICAgICByZXNvbHZlKGRhdGEpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqXG4gICAgICogQHBhcmFtIGFycmF5IHtBcnJheX1cbiAgICAgKiBAcGFyYW0ga2V5IHtTdHJpbmd9XG4gICAgICogQHBhcmFtIHZhbHVlIHtTdHJpbmd9XG4gICAgICogQHJldHVybiB7T2JqZWN0fGJvb2xlYW59XG4gICAgICogQHByaXZhdGVcbiAgICAgKi9cbiAgICBzdGF0aWMgX2Zyb21BcnJheUJ5S2V5QW5kVmFsdWUoYXJyYXksIGtleSwgdmFsdWUpIHtcbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBhcnJheS5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgaWYgKGFycmF5W2ldW2tleV0gPT09IHZhbHVlKSByZXR1cm4gYXJyYXlbaV07XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqXG4gICAgICogQHBhcmFtIG9iamVjdFxuICAgICAqIEByZXR1cm4ge1Byb21pc2V9XG4gICAgICogQHByaXZhdGVcbiAgICAgKi9cbiAgICBzdGF0aWMgX1Jvb3RSZXNvbHZlcihvYmplY3QpIHtcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICAgICAgICAgIGlmICghb2JqZWN0KSByZXR1cm4gcmVqZWN0KG5ldyBFcnJvcihcIkdpdmVuIHBhcmFtZXRlciBpcyBudWxsIG9yIHVuZGVmaW5lZC5cIikpO1xuICAgICAgICAgICAgaWYgKHR5cGVvZiBvYmplY3QgIT09ICdvYmplY3QnKSByZXR1cm4gcmVqZWN0KG5ldyBFcnJvcihcIkdpdmVuIHBhcmFtZXRlciBpcyBub3QgYW4gb2JqZWN0LlwiKSk7XG4gICAgICAgICAgICBpZiAoIW9iamVjdFsnUm9vdCddKSByZXR1cm4gcmVqZWN0KG5ldyBFcnJvcihcIidSb290JyBmaWxlZCBvZiBnaXZlbiBvYmplY3QgaXMgbnVsbCBvciB1bmRlZmluZWQuXCIpKTtcbiAgICAgICAgICAgIGlmICh0eXBlb2Ygb2JqZWN0WydSb290J10gIT09ICdvYmplY3QnKSByZXR1cm4gcmVqZWN0KG5ldyBFcnJvcihcIidSb290JyBmaWVsZCBvZiBnaXZlbiBvYmplY3QgaXNuJ3QgYW4gb2JqZWN0LlwiKSk7XG4gICAgICAgICAgICBpZiAoIW9iamVjdFsnUm9vdCddWydDaGlsZHMnXSkgcmV0dXJuIHJlamVjdChuZXcgRXJyb3IoXCInQ2hpbGRzJyBmaWVsZCBpbiBnaXZlbiBvYmplY3QgJ1Jvb3QnIGlzIG51bGwgb3IgdW5kZWZpbmVkLlwiKSk7XG4gICAgICAgICAgICBpZiAoIUFycmF5LmlzQXJyYXkob2JqZWN0WydSb290J11bJ0NoaWxkcyddKSkgcmV0dXJuIHJlamVjdChuZXcgRXJyb3IoXCInQ2hpbGRzJyBmaWVsZCBpbiBnaXZlbiBvYmplY3QgJ1Jvb3QnIGlzIG5vdCBhbiBhcnJheS5cIikpO1xuICAgICAgICAgICAgcmVzb2x2ZShvYmplY3RbJ1Jvb3QnXVsnQ2hpbGRzJ10pO1xuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICBzdGF0aWMgX3Byb2Nlc3NlZF90aW1ldGFibGUodGltZXRhYmxlcykge1xuICAgICAgICByZXR1cm4gUHJvbWlzZS5tYXAodGltZXRhYmxlcywgKHRhYmxlKSA9PiB7XG4gICAgICAgICAgICBpZiAoIXRhYmxlWydDaGlsZHMnXSkgcmV0dXJuIFByb21pc2UucmVqZWN0KG5ldyBFcnJvcihcIlRpbWV0YWJsZSBoYXMgbm8gY2hpbGQgYXJyYXkuXCIpKTtcbiAgICAgICAgICAgIGlmICghQXJyYXkuaXNBcnJheSh0YWJsZVsnQ2hpbGRzJ10pKSByZXR1cm4gUHJvbWlzZS5yZWplY3QobmV3IEVycm9yKFwiVGltZXRhYmxlIGNoaWxkIGZpZWxkIGlzIG5vdCBhbiBhcnJheS5cIikpO1xuICAgICAgICAgICAgaWYgKHRhYmxlWydDaGlsZHMnXS5sZW5ndGggPT09IDApIHJldHVybiBQcm9taXNlLnJlamVjdChuZXcgRXJyb3IoXCJUaW1ldGFibGUgY2hpbGQgYXJyYXkgbGVuZ3RoIGlzIDAuXCIpKTtcbiAgICAgICAgICAgIGlmICh0eXBlb2YgdGFibGVbJ0NoaWxkcyddWzBdICE9PSAnb2JqZWN0JyB8fCAhdGFibGVbJ0NoaWxkcyddWzBdWydEZXRhaWwnXSkgcmV0dXJuIFByb21pc2UucmVqZWN0KG5ldyBFcnJvcihcIkNvcnJ1cHRlZCB0aW1ldGFibGUuXCIpKTtcbiAgICAgICAgICAgIHJldHVybiBycCh7XG4gICAgICAgICAgICAgICAgdXJpOiB0YWJsZVsnQ2hpbGRzJ11bMF1bJ0RldGFpbCddLFxuICAgICAgICAgICAgICAgIHRyYW5zZm9ybTogZnVuY3Rpb24gKGJvZHkpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGNoZWVyaW8ubG9hZChib2R5KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KS50aGVuKCQgPT4ge1xuICAgICAgICAgICAgICAgIGRlYnVnZ2VyO1xuICAgICAgICAgICAgICAgIGNvbnN0IE1vblRpdGxlID0gJChcIi5tb25fdGl0bGVcIik7XG4gICAgICAgICAgICAgICAgaWYgKCFNb25UaXRsZS50ZXh0KCkpIHJldHVybiBQcm9taXNlLnJlamVjdChuZXcgRXJyb3IoXCJDYW4gbm90IGZpbmQgJ21vbl90aXRsZScgaW4gdGltZXRhYmxlLlwiKSk7XG4gICAgICAgICAgICAgICAgaWYgKE1vblRpdGxlLnRleHQoKS5tYXRjaCgvXFxkKlxcLlxcZCpcXC5cXGQqLykubGVuZ3RoID09PSAwKSByZXR1cm4gUHJvbWlzZS5yZWplY3QobmV3IEVycm9yKFwiQ2FuIG5vdCBmaW5kIGRhdGUgb2YgdGltZXRhYmxlLlwiKSk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGRhdGUgPSBEYXRlLnBhcnNlKE1vblRpdGxlLnRleHQoKS5tYXRjaCgvXFxkKlxcLlxcZCpcXC5cXGQqLylbMF0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZSh7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc3JjOiB0YWJsZVsnQ2hpbGRzJ11bMF1bJ0RldGFpbCddLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRhdGU6IERhdGUucGFyc2UoTW9uVGl0bGUudGV4dCgpLm1hdGNoKC9cXGQqXFwuXFxkKlxcLlxcZCovKVswXSksXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVmcmVzaGVkOiBEYXRlLnBhcnNlKHRhYmxlWydDaGlsZHMnXVswXVsnRGF0ZSddKVxuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlamVjdChuZXcgRXJyb3IoXCJDYW4ndCBwYXJzZSBkYXRlIG9mIHRpbWV0YWJsZS5cIikpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSkudGhlbih0aW1ldGFibGVzID0+IHtcbiAgICAgICAgICAgIHJldHVybiBQcm9taXNlLnJlc29sdmUoe1xuICAgICAgICAgICAgICAgIGtpbmQ6IFwidGltZXRhYmxlc1wiLFxuICAgICAgICAgICAgICAgIGRhdGE6IHRpbWV0YWJsZXNcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICBzdGF0aWMgX3Byb2Nlc3NlZF9uZXdzKG5ld3NwbCkge1xuICAgICAgICByZXR1cm4gUHJvbWlzZS5tYXAobmV3c3BsLCAobmV3cykgPT4ge1xuICAgICAgICAgICAgcmV0dXJuIFByb21pc2UucmVzb2x2ZSh7XG4gICAgICAgICAgICAgICAgZGF0ZTogbmV3c1tcIkRhdGVcIl0sXG4gICAgICAgICAgICAgICAgdGl0bGU6IG5ld3NbXCJUaXRsZVwiXSxcbiAgICAgICAgICAgICAgICB0ZXh0OiBuZXdzW1wiRGV0YWlsXCJdXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSkudGhlbihkYXRhID0+IHtcbiAgICAgICAgICAgIHJldHVybiBQcm9taXNlLnJlc29sdmUoe1xuICAgICAgICAgICAgICAgIGtpbmQ6IFwibmV3c1wiLFxuICAgICAgICAgICAgICAgIGRhdGE6IGRhdGFcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICBzdGF0aWMgX3Byb2Nlc3NlZF90aWxlcyh0aWxlcykge1xuICAgICAgICByZXR1cm4gUHJvbWlzZS5tYXAodGlsZXMsICh0aWxlKSA9PiB7XG4gICAgICAgICAgICBpZiAoIXRpbGUgfHwgIXRpbGVbXCJDaGlsZHNcIl0gfHwgIUFycmF5LmlzQXJyYXkodGlsZVtcIkNoaWxkc1wiXSkpIHJldHVybiBQcm9taXNlLnJlamVjdChuZXcgRXJyb3IoXCJDb3JydXB0ZWQgdGlsZS5cIikpO1xuICAgICAgICAgICAgcmV0dXJuIFByb21pc2UubWFwKHRpbGVbXCJDaGlsZHNcIl0sICh0aWxlMikgPT4ge1xuICAgICAgICAgICAgICAgIHJldHVybiBQcm9taXNlLnJlc29sdmUoe1xuICAgICAgICAgICAgICAgICAgICBkYXRlOiB0aWxlMltcIkRhdGVcIl0sXG4gICAgICAgICAgICAgICAgICAgIHRpdGxlOiB0aWxlMltcIlRpdGxlXCJdLFxuICAgICAgICAgICAgICAgICAgICBkZXRhaWw6IHRpbGUyW1wiRGV0YWlsXCJdXG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSkudGhlbihkYXRhID0+IHtcbiAgICAgICAgICAgIHJldHVybiBQcm9taXNlLnJlc29sdmUoe1xuICAgICAgICAgICAgICAgIGtpbmQ6IFwidGlsZXNcIixcbiAgICAgICAgICAgICAgICBkYXRhOiBkYXRhLmNvbWJpbmUoKVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuICAgIH1cblxufVxuXG5BcnJheS5wcm90b3R5cGUuY29tYmluZSA9IGZ1bmN0aW9uICgpIHtcbiAgICBsZXQgeCA9IFtdO1xuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgdGhpcy5sZW5ndGg7IGkrKykge1xuICAgICAgICBpZiAoQXJyYXkuaXNBcnJheSh0aGlzW2ldKSkge1xuICAgICAgICAgICAgZm9yIChsZXQgaWkgPSAwOyBpaSA8IHRoaXNbaV0ubGVuZ3RoOyBpaSsrKSB7XG4gICAgICAgICAgICAgICAgeC5wdXNoKHRoaXNbaV1baWldKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4geDtcbn07Il19