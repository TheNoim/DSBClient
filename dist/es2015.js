"use strict";

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

module.exports = DSBClient;

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

//# sourceMappingURL=data:application/json;charset=utf-8;base64,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QWMsS0FBSyxDQUFMLENBQWQsQ0FBSixFQUE0QjtBQUN4QixpQkFBSyxJQUFJLEtBQUssQ0FBZCxFQUFpQixLQUFLLEtBQUssQ0FBTCxFQUFRLE1BQTlCLEVBQXNDLElBQXRDLEVBQTRDO0FBQ3hDLGtCQUFFLElBQUYsQ0FBTyxLQUFLLENBQUwsRUFBUSxFQUFSLENBQVA7QUFDSDtBQUNKO0FBQ0o7QUFDRCxXQUFPLENBQVA7QUFDSCxDQVZEIiwiZmlsZSI6ImVzMjAxNS5qcyIsInNvdXJjZXNDb250ZW50IjpbIlwidXNlIHN0cmljdFwiO1xuXG5pbXBvcnQgRFNCQVBJIGZyb20gJ2RzYmFwaSc7XG5pbXBvcnQgUHJvbWlzZSBmcm9tICdibHVlYmlyZCc7XG5pbXBvcnQgcnAgZnJvbSAncmVxdWVzdC1wcm9taXNlJztcbmltcG9ydCBjaGVlcmlvIGZyb20gJ2NoZWVyaW8nO1xuaW1wb3J0ICdkYXRlanMnO1xuXG5jbGFzcyBEU0JDbGllbnQge1xuXG4gICAgLyoqXG4gICAgICpcbiAgICAgKiBAcGFyYW0gdXNlcm5hbWUge1N0cmluZ31cbiAgICAgKiBAcGFyYW0gcGFzc3dvcmQge1N0cmluZ31cbiAgICAgKi9cbiAgICBjb25zdHJ1Y3Rvcih1c2VybmFtZSwgcGFzc3dvcmQpIHtcbiAgICAgICAgdGhpcy51c2VybmFtZSA9IHVzZXJuYW1lO1xuICAgICAgICB0aGlzLnBhc3N3b3JkID0gcGFzc3dvcmQ7XG4gICAgICAgIHRoaXMuYXBpID0gbmV3IERTQkFQSSh0aGlzLnVzZXJuYW1lLCB0aGlzLnBhc3N3b3JkKTtcbiAgICAgICAgdGhpcy5mZXRjaCA9IHRoaXMuZmV0Y2guYmluZCh0aGlzKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKlxuICAgICAqIEByZXR1cm4ge1Byb21pc2UuPFRSZXN1bHQ+fVxuICAgICAqL1xuICAgIGZldGNoKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5hcGkuZ2V0RGF0YSgpLnRoZW4oRFNCQ2xpZW50Ll9maWx0ZXIpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqXG4gICAgICogQHBhcmFtIGRhdGEge09iamVjdH1cbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqL1xuICAgIHN0YXRpYyBfZmlsdGVyKGRhdGEpIHtcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICAgICAgICAgIGlmICghZGF0YSkgcmV0dXJuIHJlamVjdChuZXcgRXJyb3IoXCJSZXR1cm5lZCBkYXRhIGlzIG51bGwgb3IgdW5kZWZpbmVkLlwiKSk7XG4gICAgICAgICAgICBpZiAoZGF0YVtcIlJlc3VsdGNvZGVcIl0gIT09IDApIHJldHVybiByZWplY3QobmV3IEVycm9yKFwiRGF0YSByZXN1bHQgY29kZSBpc24ndCAwLiBDb2RlOiBcIiArIGRhdGFbXCJSZXN1bHRjb2RlXCJdKSk7XG4gICAgICAgICAgICBpZiAoIWRhdGFbXCJSZXN1bHRNZW51SXRlbXNcIl0pIHJldHVybiByZWplY3QobmV3IEVycm9yKFwiTm8gZmllbGQgUmVzdWx0TWVudUl0ZW1zIG9uIHJldHVybmVkIGRhdGEuXCIpKTtcbiAgICAgICAgICAgIGlmICghQXJyYXkuaXNBcnJheShkYXRhW1wiUmVzdWx0TWVudUl0ZW1zXCJdKSkgcmV0dXJuIHJlamVjdChuZXcgRXJyb3IoXCJSZXN1bHRNZW51SXRlbXMgaXNuJ3QgYW4gYXJyYXkuXCIpKTtcbiAgICAgICAgICAgIGlmIChkYXRhW1wiUmVzdWx0TWVudUl0ZW1zXCJdLmxlbmd0aCA9PT0gMCkgcmV0dXJuIHJlamVjdChuZXcgRXJyb3IoXCJSZXN1bHRNZW51SXRlbXMgbGVuZ3RoIGlzIDAuXCIpKTtcbiAgICAgICAgICAgIGNvbnN0IFJlc3VsdE1lbnVJdGVtcyA9IGRhdGFbXCJSZXN1bHRNZW51SXRlbXNcIl07XG4gICAgICAgICAgICBjb25zdCBJbmhhbHRlID0gRFNCQ2xpZW50Ll9mcm9tQXJyYXlCeUtleUFuZFZhbHVlKFJlc3VsdE1lbnVJdGVtcywgXCJUaXRsZVwiLCBcIkluaGFsdGVcIik7XG4gICAgICAgICAgICBpZiAoSW5oYWx0ZSA9PT0gZmFsc2UpIHJldHVybiByZWplY3QobmV3IEVycm9yKFwiQ2FuJ3QgZmluZCB7VGl0bGU6J0luaGFsdGUnfSBpbiAnUmVzdWx0TWVudUl0ZW1zJy5cIikpO1xuICAgICAgICAgICAgaWYgKCFJbmhhbHRlW1wiQ2hpbGRzXCJdKSByZXR1cm4gcmVqZWN0KG5ldyBFcnJvcihcIidDaGlsZHMnIGluICdJbmhhbHRlJyBpcyBudWxsIG9yIHVuZGVmaW5lZC5cIikpO1xuICAgICAgICAgICAgaWYgKCFBcnJheS5pc0FycmF5KEluaGFsdGVbXCJDaGlsZHNcIl0pKSByZXR1cm4gcmVqZWN0KG5ldyBFcnJvcihcIidDaGlsZHMnIGluICdJbmhhbHRlJyBpc24ndCBhbiBhcnJheS5cIikpO1xuICAgICAgICAgICAgaWYgKEluaGFsdGVbXCJDaGlsZHNcIl0ubGVuZ3RoID09PSAwKSByZXR1cm4gcmVqZWN0KG5ldyBFcnJvcihcIlRoZSBsZW5ndGggb2YgJ0NoaWxkcycgaW4gJ0luaGFsdGUnIGlzIDAuXCIpKTtcbiAgICAgICAgICAgIGxldCBJbmhhbHRlQ2hpbGRzID0gSW5oYWx0ZVtcIkNoaWxkc1wiXTtcbiAgICAgICAgICAgIHJldHVybiBQcm9taXNlLm1hcChJbmhhbHRlQ2hpbGRzLCBmdW5jdGlvbiAoY2hpbGQpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gRFNCQ2xpZW50Ll9Sb290UmVzb2x2ZXIoY2hpbGQpO1xuICAgICAgICAgICAgfSkudGhlbihDaGlsZHMgPT4ge1xuICAgICAgICAgICAgICAgIHJldHVybiBQcm9taXNlLm1hcChDaGlsZHMsIChjaGlsZCwgaW5kZXgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgSW5oYWx0ZUNoaWxkc1tpbmRleF1bJ0NoaWxkcyddID0gY2hpbGQ7XG4gICAgICAgICAgICAgICAgICAgIGRlbGV0ZSBJbmhhbHRlQ2hpbGRzW2luZGV4XVsnUm9vdCddO1xuICAgICAgICAgICAgICAgICAgICBkZWxldGUgSW5oYWx0ZUNoaWxkc1tpbmRleF1bJ05ld0NvdW50J107XG4gICAgICAgICAgICAgICAgICAgIGRlbGV0ZSBJbmhhbHRlQ2hpbGRzW2luZGV4XVsnU2F2ZUxhc3RTdGF0ZSddO1xuICAgICAgICAgICAgICAgICAgICBkZWxldGUgSW5oYWx0ZUNoaWxkc1tpbmRleF1bJ0luZGV4J107XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBQcm9taXNlLnJlc29sdmUoKTtcbiAgICAgICAgICAgICAgICB9KS50aGVuKCgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIFByb21pc2UucmVzb2x2ZShJbmhhbHRlQ2hpbGRzKTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0pLnRoZW4oTmV3SW5oYWx0ZSA9PiB7XG4gICAgICAgICAgICAgICAgbGV0IGZkYXRhID0ge307XG4gICAgICAgICAgICAgICAgcmV0dXJuIFByb21pc2UubWFwKE5ld0luaGFsdGUsIChtZXRob2QpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKCFtZXRob2QpIHJldHVybiBQcm9taXNlLnJlc29sdmUoKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKG1ldGhvZFsnTWV0aG9kTmFtZSddID09PSBcInRpbWV0YWJsZVwiKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gRFNCQ2xpZW50Ll9wcm9jZXNzZWRfdGltZXRhYmxlKG1ldGhvZFsnQ2hpbGRzJ10pLnRoZW4odGRhdGEgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZkYXRhW3RkYXRhLmtpbmRdID0gdGRhdGEuZGF0YTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKG1ldGhvZFsnTWV0aG9kTmFtZSddID09PSBcInRpbGVzXCIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBEU0JDbGllbnQuX3Byb2Nlc3NlZF90aWxlcyhtZXRob2RbJ0NoaWxkcyddKS50aGVuKHRkYXRhID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBmZGF0YVt0ZGF0YS5raW5kXSA9IHRkYXRhLmRhdGE7XG4gICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIGlmIChtZXRob2RbJ01ldGhvZE5hbWUnXSA9PT0gXCJuZXdzXCIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBEU0JDbGllbnQuX3Byb2Nlc3NlZF9uZXdzKG1ldGhvZFsnQ2hpbGRzJ10pLnRoZW4odGRhdGEgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZkYXRhW3RkYXRhLmtpbmRdID0gdGRhdGEuZGF0YTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIFByb21pc2UucmVzb2x2ZSgpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSkudGhlbigoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBQcm9taXNlLnJlc29sdmUoZmRhdGEpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSkudGhlbihkYXRhPT57XG4gICAgICAgICAgICAgICAgcmVzb2x2ZShkYXRhKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKlxuICAgICAqIEBwYXJhbSBhcnJheSB7QXJyYXl9XG4gICAgICogQHBhcmFtIGtleSB7U3RyaW5nfVxuICAgICAqIEBwYXJhbSB2YWx1ZSB7U3RyaW5nfVxuICAgICAqIEByZXR1cm4ge09iamVjdHxib29sZWFufVxuICAgICAqIEBwcml2YXRlXG4gICAgICovXG4gICAgc3RhdGljIF9mcm9tQXJyYXlCeUtleUFuZFZhbHVlKGFycmF5LCBrZXksIHZhbHVlKSB7XG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgYXJyYXkubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIGlmIChhcnJheVtpXVtrZXldID09PSB2YWx1ZSkgcmV0dXJuIGFycmF5W2ldO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKlxuICAgICAqIEBwYXJhbSBvYmplY3RcbiAgICAgKiBAcmV0dXJuIHtQcm9taXNlfVxuICAgICAqIEBwcml2YXRlXG4gICAgICovXG4gICAgc3RhdGljIF9Sb290UmVzb2x2ZXIob2JqZWN0KSB7XG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICAgICAgICBpZiAoIW9iamVjdCkgcmV0dXJuIHJlamVjdChuZXcgRXJyb3IoXCJHaXZlbiBwYXJhbWV0ZXIgaXMgbnVsbCBvciB1bmRlZmluZWQuXCIpKTtcbiAgICAgICAgICAgIGlmICh0eXBlb2Ygb2JqZWN0ICE9PSAnb2JqZWN0JykgcmV0dXJuIHJlamVjdChuZXcgRXJyb3IoXCJHaXZlbiBwYXJhbWV0ZXIgaXMgbm90IGFuIG9iamVjdC5cIikpO1xuICAgICAgICAgICAgaWYgKCFvYmplY3RbJ1Jvb3QnXSkgcmV0dXJuIHJlamVjdChuZXcgRXJyb3IoXCInUm9vdCcgZmlsZWQgb2YgZ2l2ZW4gb2JqZWN0IGlzIG51bGwgb3IgdW5kZWZpbmVkLlwiKSk7XG4gICAgICAgICAgICBpZiAodHlwZW9mIG9iamVjdFsnUm9vdCddICE9PSAnb2JqZWN0JykgcmV0dXJuIHJlamVjdChuZXcgRXJyb3IoXCInUm9vdCcgZmllbGQgb2YgZ2l2ZW4gb2JqZWN0IGlzbid0IGFuIG9iamVjdC5cIikpO1xuICAgICAgICAgICAgaWYgKCFvYmplY3RbJ1Jvb3QnXVsnQ2hpbGRzJ10pIHJldHVybiByZWplY3QobmV3IEVycm9yKFwiJ0NoaWxkcycgZmllbGQgaW4gZ2l2ZW4gb2JqZWN0ICdSb290JyBpcyBudWxsIG9yIHVuZGVmaW5lZC5cIikpO1xuICAgICAgICAgICAgaWYgKCFBcnJheS5pc0FycmF5KG9iamVjdFsnUm9vdCddWydDaGlsZHMnXSkpIHJldHVybiByZWplY3QobmV3IEVycm9yKFwiJ0NoaWxkcycgZmllbGQgaW4gZ2l2ZW4gb2JqZWN0ICdSb290JyBpcyBub3QgYW4gYXJyYXkuXCIpKTtcbiAgICAgICAgICAgIHJlc29sdmUob2JqZWN0WydSb290J11bJ0NoaWxkcyddKTtcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgc3RhdGljIF9wcm9jZXNzZWRfdGltZXRhYmxlKHRpbWV0YWJsZXMpIHtcbiAgICAgICAgcmV0dXJuIFByb21pc2UubWFwKHRpbWV0YWJsZXMsICh0YWJsZSkgPT4ge1xuICAgICAgICAgICAgaWYgKCF0YWJsZVsnQ2hpbGRzJ10pIHJldHVybiBQcm9taXNlLnJlamVjdChuZXcgRXJyb3IoXCJUaW1ldGFibGUgaGFzIG5vIGNoaWxkIGFycmF5LlwiKSk7XG4gICAgICAgICAgICBpZiAoIUFycmF5LmlzQXJyYXkodGFibGVbJ0NoaWxkcyddKSkgcmV0dXJuIFByb21pc2UucmVqZWN0KG5ldyBFcnJvcihcIlRpbWV0YWJsZSBjaGlsZCBmaWVsZCBpcyBub3QgYW4gYXJyYXkuXCIpKTtcbiAgICAgICAgICAgIGlmICh0YWJsZVsnQ2hpbGRzJ10ubGVuZ3RoID09PSAwKSByZXR1cm4gUHJvbWlzZS5yZWplY3QobmV3IEVycm9yKFwiVGltZXRhYmxlIGNoaWxkIGFycmF5IGxlbmd0aCBpcyAwLlwiKSk7XG4gICAgICAgICAgICBpZiAodHlwZW9mIHRhYmxlWydDaGlsZHMnXVswXSAhPT0gJ29iamVjdCcgfHwgIXRhYmxlWydDaGlsZHMnXVswXVsnRGV0YWlsJ10pIHJldHVybiBQcm9taXNlLnJlamVjdChuZXcgRXJyb3IoXCJDb3JydXB0ZWQgdGltZXRhYmxlLlwiKSk7XG4gICAgICAgICAgICByZXR1cm4gcnAoe1xuICAgICAgICAgICAgICAgIHVyaTogdGFibGVbJ0NoaWxkcyddWzBdWydEZXRhaWwnXSxcbiAgICAgICAgICAgICAgICB0cmFuc2Zvcm06IGZ1bmN0aW9uIChib2R5KSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBjaGVlcmlvLmxvYWQoYm9keSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSkudGhlbigkID0+IHtcbiAgICAgICAgICAgICAgICBkZWJ1Z2dlcjtcbiAgICAgICAgICAgICAgICBjb25zdCBNb25UaXRsZSA9ICQoXCIubW9uX3RpdGxlXCIpO1xuICAgICAgICAgICAgICAgIGlmICghTW9uVGl0bGUudGV4dCgpKSByZXR1cm4gUHJvbWlzZS5yZWplY3QobmV3IEVycm9yKFwiQ2FuIG5vdCBmaW5kICdtb25fdGl0bGUnIGluIHRpbWV0YWJsZS5cIikpO1xuICAgICAgICAgICAgICAgIGlmIChNb25UaXRsZS50ZXh0KCkubWF0Y2goL1xcZCpcXC5cXGQqXFwuXFxkKi8pLmxlbmd0aCA9PT0gMCkgcmV0dXJuIFByb21pc2UucmVqZWN0KG5ldyBFcnJvcihcIkNhbiBub3QgZmluZCBkYXRlIG9mIHRpbWV0YWJsZS5cIikpO1xuICAgICAgICAgICAgICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBkYXRlID0gRGF0ZS5wYXJzZShNb25UaXRsZS50ZXh0KCkubWF0Y2goL1xcZCpcXC5cXGQqXFwuXFxkKi8pWzBdKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlc29sdmUoe1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNyYzogdGFibGVbJ0NoaWxkcyddWzBdWydEZXRhaWwnXSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkYXRlOiBEYXRlLnBhcnNlKE1vblRpdGxlLnRleHQoKS5tYXRjaCgvXFxkKlxcLlxcZCpcXC5cXGQqLylbMF0pLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlZnJlc2hlZDogRGF0ZS5wYXJzZSh0YWJsZVsnQ2hpbGRzJ11bMF1bJ0RhdGUnXSlcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZWplY3QobmV3IEVycm9yKFwiQ2FuJ3QgcGFyc2UgZGF0ZSBvZiB0aW1ldGFibGUuXCIpKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0pLnRoZW4odGltZXRhYmxlcyA9PiB7XG4gICAgICAgICAgICByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKHtcbiAgICAgICAgICAgICAgICBraW5kOiBcInRpbWV0YWJsZXNcIixcbiAgICAgICAgICAgICAgICBkYXRhOiB0aW1ldGFibGVzXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgc3RhdGljIF9wcm9jZXNzZWRfbmV3cyhuZXdzcGwpIHtcbiAgICAgICAgcmV0dXJuIFByb21pc2UubWFwKG5ld3NwbCwgKG5ld3MpID0+IHtcbiAgICAgICAgICAgIHJldHVybiBQcm9taXNlLnJlc29sdmUoe1xuICAgICAgICAgICAgICAgIGRhdGU6IG5ld3NbXCJEYXRlXCJdLFxuICAgICAgICAgICAgICAgIHRpdGxlOiBuZXdzW1wiVGl0bGVcIl0sXG4gICAgICAgICAgICAgICAgdGV4dDogbmV3c1tcIkRldGFpbFwiXVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0pLnRoZW4oZGF0YSA9PiB7XG4gICAgICAgICAgICByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKHtcbiAgICAgICAgICAgICAgICBraW5kOiBcIm5ld3NcIixcbiAgICAgICAgICAgICAgICBkYXRhOiBkYXRhXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgc3RhdGljIF9wcm9jZXNzZWRfdGlsZXModGlsZXMpIHtcbiAgICAgICAgcmV0dXJuIFByb21pc2UubWFwKHRpbGVzLCAodGlsZSkgPT4ge1xuICAgICAgICAgICAgaWYgKCF0aWxlIHx8ICF0aWxlW1wiQ2hpbGRzXCJdIHx8ICFBcnJheS5pc0FycmF5KHRpbGVbXCJDaGlsZHNcIl0pKSByZXR1cm4gUHJvbWlzZS5yZWplY3QobmV3IEVycm9yKFwiQ29ycnVwdGVkIHRpbGUuXCIpKTtcbiAgICAgICAgICAgIHJldHVybiBQcm9taXNlLm1hcCh0aWxlW1wiQ2hpbGRzXCJdLCAodGlsZTIpID0+IHtcbiAgICAgICAgICAgICAgICByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKHtcbiAgICAgICAgICAgICAgICAgICAgZGF0ZTogdGlsZTJbXCJEYXRlXCJdLFxuICAgICAgICAgICAgICAgICAgICB0aXRsZTogdGlsZTJbXCJUaXRsZVwiXSxcbiAgICAgICAgICAgICAgICAgICAgZGV0YWlsOiB0aWxlMltcIkRldGFpbFwiXVxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0pLnRoZW4oZGF0YSA9PiB7XG4gICAgICAgICAgICByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKHtcbiAgICAgICAgICAgICAgICBraW5kOiBcInRpbGVzXCIsXG4gICAgICAgICAgICAgICAgZGF0YTogZGF0YS5jb21iaW5lKClcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcbiAgICB9XG59XG5cbm1vZHVsZS5leHBvcnRzID0gRFNCQ2xpZW50O1xuXG5BcnJheS5wcm90b3R5cGUuY29tYmluZSA9IGZ1bmN0aW9uICgpIHtcbiAgICBsZXQgeCA9IFtdO1xuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgdGhpcy5sZW5ndGg7IGkrKykge1xuICAgICAgICBpZiAoQXJyYXkuaXNBcnJheSh0aGlzW2ldKSkge1xuICAgICAgICAgICAgZm9yIChsZXQgaWkgPSAwOyBpaSA8IHRoaXNbaV0ubGVuZ3RoOyBpaSsrKSB7XG4gICAgICAgICAgICAgICAgeC5wdXNoKHRoaXNbaV1baWldKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4geDtcbn07Il19