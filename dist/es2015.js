'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.DSBClient = undefined;

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

var DSBClient = exports.DSBClient = function () {

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

//# sourceMappingURL=data:application/json;charset=utf-8;base64,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QUosRUFBNEI7QUFDeEIsaUJBQUssSUFBSSxLQUFLLENBQWQsRUFBaUIsS0FBSyxLQUFLLENBQUwsRUFBUSxNQUE5QixFQUFzQyxJQUF0QyxFQUE0QztBQUN4QyxrQkFBRSxJQUFGLENBQU8sS0FBSyxDQUFMLEVBQVEsRUFBUixDQUFQO0FBQ0g7QUFDSjtBQUNKO0FBQ0QsV0FBTyxDQUFQO0FBQ0gsQ0FWRCIsImZpbGUiOiJlczIwMTUuanMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgRFNCQVBJIGZyb20gJ2RzYmFwaSc7XG5pbXBvcnQgUHJvbWlzZSBmcm9tICdibHVlYmlyZCc7XG5pbXBvcnQgcnAgZnJvbSAncmVxdWVzdC1wcm9taXNlJztcbmltcG9ydCBjaGVlcmlvIGZyb20gJ2NoZWVyaW8nO1xuaW1wb3J0ICdkYXRlanMnO1xuXG5leHBvcnQgY2xhc3MgRFNCQ2xpZW50IHtcblxuICAgIC8qKlxuICAgICAqXG4gICAgICogQHBhcmFtIHVzZXJuYW1lIHtTdHJpbmd9XG4gICAgICogQHBhcmFtIHBhc3N3b3JkIHtTdHJpbmd9XG4gICAgICovXG4gICAgY29uc3RydWN0b3IodXNlcm5hbWUsIHBhc3N3b3JkKSB7XG4gICAgICAgIHRoaXMudXNlcm5hbWUgPSB1c2VybmFtZTtcbiAgICAgICAgdGhpcy5wYXNzd29yZCA9IHBhc3N3b3JkO1xuICAgICAgICB0aGlzLmFwaSA9IG5ldyBEU0JBUEkodGhpcy51c2VybmFtZSwgdGhpcy5wYXNzd29yZCk7XG4gICAgICAgIHRoaXMuZmV0Y2ggPSB0aGlzLmZldGNoLmJpbmQodGhpcyk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICpcbiAgICAgKiBAcmV0dXJuIHtQcm9taXNlLjxUUmVzdWx0Pn1cbiAgICAgKi9cbiAgICBmZXRjaCgpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuYXBpLmdldERhdGEoKS50aGVuKERTQkNsaWVudC5fZmlsdGVyKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKlxuICAgICAqIEBwYXJhbSBkYXRhIHtPYmplY3R9XG4gICAgICogQHByaXZhdGVcbiAgICAgKi9cbiAgICBzdGF0aWMgX2ZpbHRlcihkYXRhKSB7XG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICAgICAgICBpZiAoIWRhdGEpIHJldHVybiByZWplY3QobmV3IEVycm9yKFwiUmV0dXJuZWQgZGF0YSBpcyBudWxsIG9yIHVuZGVmaW5lZC5cIikpO1xuICAgICAgICAgICAgaWYgKGRhdGFbXCJSZXN1bHRjb2RlXCJdICE9PSAwKSByZXR1cm4gcmVqZWN0KG5ldyBFcnJvcihcIkRhdGEgcmVzdWx0IGNvZGUgaXNuJ3QgMC4gQ29kZTogXCIgKyBkYXRhW1wiUmVzdWx0Y29kZVwiXSkpO1xuICAgICAgICAgICAgaWYgKCFkYXRhW1wiUmVzdWx0TWVudUl0ZW1zXCJdKSByZXR1cm4gcmVqZWN0KG5ldyBFcnJvcihcIk5vIGZpZWxkIFJlc3VsdE1lbnVJdGVtcyBvbiByZXR1cm5lZCBkYXRhLlwiKSk7XG4gICAgICAgICAgICBpZiAoIUFycmF5LmlzQXJyYXkoZGF0YVtcIlJlc3VsdE1lbnVJdGVtc1wiXSkpIHJldHVybiByZWplY3QobmV3IEVycm9yKFwiUmVzdWx0TWVudUl0ZW1zIGlzbid0IGFuIGFycmF5LlwiKSk7XG4gICAgICAgICAgICBpZiAoZGF0YVtcIlJlc3VsdE1lbnVJdGVtc1wiXS5sZW5ndGggPT09IDApIHJldHVybiByZWplY3QobmV3IEVycm9yKFwiUmVzdWx0TWVudUl0ZW1zIGxlbmd0aCBpcyAwLlwiKSk7XG4gICAgICAgICAgICBjb25zdCBSZXN1bHRNZW51SXRlbXMgPSBkYXRhW1wiUmVzdWx0TWVudUl0ZW1zXCJdO1xuICAgICAgICAgICAgY29uc3QgSW5oYWx0ZSA9IERTQkNsaWVudC5fZnJvbUFycmF5QnlLZXlBbmRWYWx1ZShSZXN1bHRNZW51SXRlbXMsIFwiVGl0bGVcIiwgXCJJbmhhbHRlXCIpO1xuICAgICAgICAgICAgaWYgKEluaGFsdGUgPT09IGZhbHNlKSByZXR1cm4gcmVqZWN0KG5ldyBFcnJvcihcIkNhbid0IGZpbmQge1RpdGxlOidJbmhhbHRlJ30gaW4gJ1Jlc3VsdE1lbnVJdGVtcycuXCIpKTtcbiAgICAgICAgICAgIGlmICghSW5oYWx0ZVtcIkNoaWxkc1wiXSkgcmV0dXJuIHJlamVjdChuZXcgRXJyb3IoXCInQ2hpbGRzJyBpbiAnSW5oYWx0ZScgaXMgbnVsbCBvciB1bmRlZmluZWQuXCIpKTtcbiAgICAgICAgICAgIGlmICghQXJyYXkuaXNBcnJheShJbmhhbHRlW1wiQ2hpbGRzXCJdKSkgcmV0dXJuIHJlamVjdChuZXcgRXJyb3IoXCInQ2hpbGRzJyBpbiAnSW5oYWx0ZScgaXNuJ3QgYW4gYXJyYXkuXCIpKTtcbiAgICAgICAgICAgIGlmIChJbmhhbHRlW1wiQ2hpbGRzXCJdLmxlbmd0aCA9PT0gMCkgcmV0dXJuIHJlamVjdChuZXcgRXJyb3IoXCJUaGUgbGVuZ3RoIG9mICdDaGlsZHMnIGluICdJbmhhbHRlJyBpcyAwLlwiKSk7XG4gICAgICAgICAgICBsZXQgSW5oYWx0ZUNoaWxkcyA9IEluaGFsdGVbXCJDaGlsZHNcIl07XG4gICAgICAgICAgICByZXR1cm4gUHJvbWlzZS5tYXAoSW5oYWx0ZUNoaWxkcywgZnVuY3Rpb24gKGNoaWxkKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIERTQkNsaWVudC5fUm9vdFJlc29sdmVyKGNoaWxkKTtcbiAgICAgICAgICAgIH0pLnRoZW4oQ2hpbGRzID0+IHtcbiAgICAgICAgICAgICAgICByZXR1cm4gUHJvbWlzZS5tYXAoQ2hpbGRzLCAoY2hpbGQsIGluZGV4KSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIEluaGFsdGVDaGlsZHNbaW5kZXhdWydDaGlsZHMnXSA9IGNoaWxkO1xuICAgICAgICAgICAgICAgICAgICBkZWxldGUgSW5oYWx0ZUNoaWxkc1tpbmRleF1bJ1Jvb3QnXTtcbiAgICAgICAgICAgICAgICAgICAgZGVsZXRlIEluaGFsdGVDaGlsZHNbaW5kZXhdWydOZXdDb3VudCddO1xuICAgICAgICAgICAgICAgICAgICBkZWxldGUgSW5oYWx0ZUNoaWxkc1tpbmRleF1bJ1NhdmVMYXN0U3RhdGUnXTtcbiAgICAgICAgICAgICAgICAgICAgZGVsZXRlIEluaGFsdGVDaGlsZHNbaW5kZXhdWydJbmRleCddO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKCk7XG4gICAgICAgICAgICAgICAgfSkudGhlbigoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBQcm9taXNlLnJlc29sdmUoSW5oYWx0ZUNoaWxkcyk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9KS50aGVuKE5ld0luaGFsdGUgPT4ge1xuICAgICAgICAgICAgICAgIGxldCBmZGF0YSA9IHt9O1xuICAgICAgICAgICAgICAgIHJldHVybiBQcm9taXNlLm1hcChOZXdJbmhhbHRlLCAobWV0aG9kKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGlmICghbWV0aG9kKSByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKCk7XG4gICAgICAgICAgICAgICAgICAgIGlmIChtZXRob2RbJ01ldGhvZE5hbWUnXSA9PT0gXCJ0aW1ldGFibGVcIikge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIERTQkNsaWVudC5fcHJvY2Vzc2VkX3RpbWV0YWJsZShtZXRob2RbJ0NoaWxkcyddKS50aGVuKHRkYXRhID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBmZGF0YVt0ZGF0YS5raW5kXSA9IHRkYXRhLmRhdGE7XG4gICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIGlmIChtZXRob2RbJ01ldGhvZE5hbWUnXSA9PT0gXCJ0aWxlc1wiKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gRFNCQ2xpZW50Ll9wcm9jZXNzZWRfdGlsZXMobWV0aG9kWydDaGlsZHMnXSkudGhlbih0ZGF0YSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZmRhdGFbdGRhdGEua2luZF0gPSB0ZGF0YS5kYXRhO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAobWV0aG9kWydNZXRob2ROYW1lJ10gPT09IFwibmV3c1wiKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gRFNCQ2xpZW50Ll9wcm9jZXNzZWRfbmV3cyhtZXRob2RbJ0NoaWxkcyddKS50aGVuKHRkYXRhID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBmZGF0YVt0ZGF0YS5raW5kXSA9IHRkYXRhLmRhdGE7XG4gICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBQcm9taXNlLnJlc29sdmUoKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pLnRoZW4oKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKGZkYXRhKTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0pLnRoZW4oZGF0YT0+e1xuICAgICAgICAgICAgICAgIHJlc29sdmUoZGF0YSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICpcbiAgICAgKiBAcGFyYW0gYXJyYXkge0FycmF5fVxuICAgICAqIEBwYXJhbSBrZXkge1N0cmluZ31cbiAgICAgKiBAcGFyYW0gdmFsdWUge1N0cmluZ31cbiAgICAgKiBAcmV0dXJuIHtPYmplY3R8Ym9vbGVhbn1cbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqL1xuICAgIHN0YXRpYyBfZnJvbUFycmF5QnlLZXlBbmRWYWx1ZShhcnJheSwga2V5LCB2YWx1ZSkge1xuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IGFycmF5Lmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICBpZiAoYXJyYXlbaV1ba2V5XSA9PT0gdmFsdWUpIHJldHVybiBhcnJheVtpXTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICpcbiAgICAgKiBAcGFyYW0gb2JqZWN0XG4gICAgICogQHJldHVybiB7UHJvbWlzZX1cbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqL1xuICAgIHN0YXRpYyBfUm9vdFJlc29sdmVyKG9iamVjdCkge1xuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgICAgICAgICAgaWYgKCFvYmplY3QpIHJldHVybiByZWplY3QobmV3IEVycm9yKFwiR2l2ZW4gcGFyYW1ldGVyIGlzIG51bGwgb3IgdW5kZWZpbmVkLlwiKSk7XG4gICAgICAgICAgICBpZiAodHlwZW9mIG9iamVjdCAhPT0gJ29iamVjdCcpIHJldHVybiByZWplY3QobmV3IEVycm9yKFwiR2l2ZW4gcGFyYW1ldGVyIGlzIG5vdCBhbiBvYmplY3QuXCIpKTtcbiAgICAgICAgICAgIGlmICghb2JqZWN0WydSb290J10pIHJldHVybiByZWplY3QobmV3IEVycm9yKFwiJ1Jvb3QnIGZpbGVkIG9mIGdpdmVuIG9iamVjdCBpcyBudWxsIG9yIHVuZGVmaW5lZC5cIikpO1xuICAgICAgICAgICAgaWYgKHR5cGVvZiBvYmplY3RbJ1Jvb3QnXSAhPT0gJ29iamVjdCcpIHJldHVybiByZWplY3QobmV3IEVycm9yKFwiJ1Jvb3QnIGZpZWxkIG9mIGdpdmVuIG9iamVjdCBpc24ndCBhbiBvYmplY3QuXCIpKTtcbiAgICAgICAgICAgIGlmICghb2JqZWN0WydSb290J11bJ0NoaWxkcyddKSByZXR1cm4gcmVqZWN0KG5ldyBFcnJvcihcIidDaGlsZHMnIGZpZWxkIGluIGdpdmVuIG9iamVjdCAnUm9vdCcgaXMgbnVsbCBvciB1bmRlZmluZWQuXCIpKTtcbiAgICAgICAgICAgIGlmICghQXJyYXkuaXNBcnJheShvYmplY3RbJ1Jvb3QnXVsnQ2hpbGRzJ10pKSByZXR1cm4gcmVqZWN0KG5ldyBFcnJvcihcIidDaGlsZHMnIGZpZWxkIGluIGdpdmVuIG9iamVjdCAnUm9vdCcgaXMgbm90IGFuIGFycmF5LlwiKSk7XG4gICAgICAgICAgICByZXNvbHZlKG9iamVjdFsnUm9vdCddWydDaGlsZHMnXSk7XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIHN0YXRpYyBfcHJvY2Vzc2VkX3RpbWV0YWJsZSh0aW1ldGFibGVzKSB7XG4gICAgICAgIHJldHVybiBQcm9taXNlLm1hcCh0aW1ldGFibGVzLCAodGFibGUpID0+IHtcbiAgICAgICAgICAgIGlmICghdGFibGVbJ0NoaWxkcyddKSByZXR1cm4gUHJvbWlzZS5yZWplY3QobmV3IEVycm9yKFwiVGltZXRhYmxlIGhhcyBubyBjaGlsZCBhcnJheS5cIikpO1xuICAgICAgICAgICAgaWYgKCFBcnJheS5pc0FycmF5KHRhYmxlWydDaGlsZHMnXSkpIHJldHVybiBQcm9taXNlLnJlamVjdChuZXcgRXJyb3IoXCJUaW1ldGFibGUgY2hpbGQgZmllbGQgaXMgbm90IGFuIGFycmF5LlwiKSk7XG4gICAgICAgICAgICBpZiAodGFibGVbJ0NoaWxkcyddLmxlbmd0aCA9PT0gMCkgcmV0dXJuIFByb21pc2UucmVqZWN0KG5ldyBFcnJvcihcIlRpbWV0YWJsZSBjaGlsZCBhcnJheSBsZW5ndGggaXMgMC5cIikpO1xuICAgICAgICAgICAgaWYgKHR5cGVvZiB0YWJsZVsnQ2hpbGRzJ11bMF0gIT09ICdvYmplY3QnIHx8ICF0YWJsZVsnQ2hpbGRzJ11bMF1bJ0RldGFpbCddKSByZXR1cm4gUHJvbWlzZS5yZWplY3QobmV3IEVycm9yKFwiQ29ycnVwdGVkIHRpbWV0YWJsZS5cIikpO1xuICAgICAgICAgICAgcmV0dXJuIHJwKHtcbiAgICAgICAgICAgICAgICB1cmk6IHRhYmxlWydDaGlsZHMnXVswXVsnRGV0YWlsJ10sXG4gICAgICAgICAgICAgICAgdHJhbnNmb3JtOiBmdW5jdGlvbiAoYm9keSkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gY2hlZXJpby5sb2FkKGJvZHkpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pLnRoZW4oJCA9PiB7XG4gICAgICAgICAgICAgICAgZGVidWdnZXI7XG4gICAgICAgICAgICAgICAgY29uc3QgTW9uVGl0bGUgPSAkKFwiLm1vbl90aXRsZVwiKTtcbiAgICAgICAgICAgICAgICBpZiAoIU1vblRpdGxlLnRleHQoKSkgcmV0dXJuIFByb21pc2UucmVqZWN0KG5ldyBFcnJvcihcIkNhbiBub3QgZmluZCAnbW9uX3RpdGxlJyBpbiB0aW1ldGFibGUuXCIpKTtcbiAgICAgICAgICAgICAgICBpZiAoTW9uVGl0bGUudGV4dCgpLm1hdGNoKC9cXGQqXFwuXFxkKlxcLlxcZCovKS5sZW5ndGggPT09IDApIHJldHVybiBQcm9taXNlLnJlamVjdChuZXcgRXJyb3IoXCJDYW4gbm90IGZpbmQgZGF0ZSBvZiB0aW1ldGFibGUuXCIpKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgZGF0ZSA9IERhdGUucGFyc2UoTW9uVGl0bGUudGV4dCgpLm1hdGNoKC9cXGQqXFwuXFxkKlxcLlxcZCovKVswXSk7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXNvbHZlKHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzcmM6IHRhYmxlWydDaGlsZHMnXVswXVsnRGV0YWlsJ10sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGF0ZTogRGF0ZS5wYXJzZShNb25UaXRsZS50ZXh0KCkubWF0Y2goL1xcZCpcXC5cXGQqXFwuXFxkKi8pWzBdKSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZWZyZXNoZWQ6IERhdGUucGFyc2UodGFibGVbJ0NoaWxkcyddWzBdWydEYXRlJ10pXG4gICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmVqZWN0KG5ldyBFcnJvcihcIkNhbid0IHBhcnNlIGRhdGUgb2YgdGltZXRhYmxlLlwiKSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9KS50aGVuKHRpbWV0YWJsZXMgPT4ge1xuICAgICAgICAgICAgcmV0dXJuIFByb21pc2UucmVzb2x2ZSh7XG4gICAgICAgICAgICAgICAga2luZDogXCJ0aW1ldGFibGVzXCIsXG4gICAgICAgICAgICAgICAgZGF0YTogdGltZXRhYmxlc1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIHN0YXRpYyBfcHJvY2Vzc2VkX25ld3MobmV3c3BsKSB7XG4gICAgICAgIHJldHVybiBQcm9taXNlLm1hcChuZXdzcGwsIChuZXdzKSA9PiB7XG4gICAgICAgICAgICByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKHtcbiAgICAgICAgICAgICAgICBkYXRlOiBuZXdzW1wiRGF0ZVwiXSxcbiAgICAgICAgICAgICAgICB0aXRsZTogbmV3c1tcIlRpdGxlXCJdLFxuICAgICAgICAgICAgICAgIHRleHQ6IG5ld3NbXCJEZXRhaWxcIl1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9KS50aGVuKGRhdGEgPT4ge1xuICAgICAgICAgICAgcmV0dXJuIFByb21pc2UucmVzb2x2ZSh7XG4gICAgICAgICAgICAgICAga2luZDogXCJuZXdzXCIsXG4gICAgICAgICAgICAgICAgZGF0YTogZGF0YVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIHN0YXRpYyBfcHJvY2Vzc2VkX3RpbGVzKHRpbGVzKSB7XG4gICAgICAgIHJldHVybiBQcm9taXNlLm1hcCh0aWxlcywgKHRpbGUpID0+IHtcbiAgICAgICAgICAgIGlmICghdGlsZSB8fCAhdGlsZVtcIkNoaWxkc1wiXSB8fCAhQXJyYXkuaXNBcnJheSh0aWxlW1wiQ2hpbGRzXCJdKSkgcmV0dXJuIFByb21pc2UucmVqZWN0KG5ldyBFcnJvcihcIkNvcnJ1cHRlZCB0aWxlLlwiKSk7XG4gICAgICAgICAgICByZXR1cm4gUHJvbWlzZS5tYXAodGlsZVtcIkNoaWxkc1wiXSwgKHRpbGUyKSA9PiB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIFByb21pc2UucmVzb2x2ZSh7XG4gICAgICAgICAgICAgICAgICAgIGRhdGU6IHRpbGUyW1wiRGF0ZVwiXSxcbiAgICAgICAgICAgICAgICAgICAgdGl0bGU6IHRpbGUyW1wiVGl0bGVcIl0sXG4gICAgICAgICAgICAgICAgICAgIGRldGFpbDogdGlsZTJbXCJEZXRhaWxcIl1cbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9KS50aGVuKGRhdGEgPT4ge1xuICAgICAgICAgICAgcmV0dXJuIFByb21pc2UucmVzb2x2ZSh7XG4gICAgICAgICAgICAgICAga2luZDogXCJ0aWxlc1wiLFxuICAgICAgICAgICAgICAgIGRhdGE6IGRhdGEuY29tYmluZSgpXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG4gICAgfVxuXG59XG5cbkFycmF5LnByb3RvdHlwZS5jb21iaW5lID0gZnVuY3Rpb24gKCkge1xuICAgIGxldCB4ID0gW107XG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCB0aGlzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIGlmIChBcnJheS5pc0FycmF5KHRoaXNbaV0pKSB7XG4gICAgICAgICAgICBmb3IgKGxldCBpaSA9IDA7IGlpIDwgdGhpc1tpXS5sZW5ndGg7IGlpKyspIHtcbiAgICAgICAgICAgICAgICB4LnB1c2godGhpc1tpXVtpaV0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuICAgIHJldHVybiB4O1xufTsiXX0=