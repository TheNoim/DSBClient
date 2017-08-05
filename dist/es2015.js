"use strict";

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _dsbapi = require('dsbapi');

var _dsbapi2 = _interopRequireDefault(_dsbapi);

var _bluebird = require('bluebird');

var _bluebird2 = _interopRequireDefault(_bluebird);

var _request = require('request');

var _request2 = _interopRequireDefault(_request);

var _requestProgress = require('request-progress');

var _requestProgress2 = _interopRequireDefault(_requestProgress);

var _cheerio = require('cheerio');

var _cheerio2 = _interopRequireDefault(_cheerio);

require('datejs');

var _events = require('events');

var _percentageCalc = require('percentage-calc');

var _percentageCalc2 = _interopRequireDefault(_percentageCalc);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var DSBClient = function (_EventEmitter) {
	_inherits(DSBClient, _EventEmitter);

	/**
  *
  * @param username {String}
  * @param password {String}
  * @param [cookiejar] {String}
  */
	function DSBClient(username, password, cookiejar) {
		_classCallCheck(this, DSBClient);

		var _this = _possibleConstructorReturn(this, (DSBClient.__proto__ || Object.getPrototypeOf(DSBClient)).call(this));

		_this.username = username;
		_this.password = password;
		_this.cookiejar = cookiejar;

		_this.progress = 0;

		if (_this.cookiejar) {
			_this.api = new _dsbapi2.default(_this.username, _this.password, _this.cookiejar);
		} else {
			_this.api = new _dsbapi2.default(_this.username, _this.password);
		}

		var self = _this;

		_this.api.on('progress', function (p) {
			self.progress = _percentageCalc2.default.of(p, 50);
			self.emit('progress', self.progress);
		});

		_this.fetch = _this.fetch.bind(_this);
		_this._filter = _this._filter.bind(_this);
		_this._processed_timetable = _this._processed_timetable.bind(_this);
		return _this;
	}

	/**
  *
  * @return {Promise.<TResult>}
  */


	_createClass(DSBClient, [{
		key: 'fetch',
		value: function fetch() {
			var self = this;
			self.progress = 0;
			return this.api.getData().then(self._filter);
		}

		/**
   *
   * @param data {Object}
   * @private
   */

	}, {
		key: '_filter',
		value: function _filter(data) {
			var self = this;
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
							return self._processed_timetable(method['Childs']).then(function (tdata) {
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
					self.progress = 100;
					self.emit('progress', 100);
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
		key: '_processed_timetable',
		value: function _processed_timetable(timetables, setProgress, inCount) {
			var self = this;
			self._timetables = timetables.length;
			self._progressTrack = Array.apply(null, Array(self._timetables)).map(Number.prototype.valueOf, 0);
			self._currentTimetable = 0;
			self._everyTimetable = 50 / self._timetables;
			self.progress = 50;
			function track() {
				self.progress = 50 + self._currentTimetable * self._everyTimetable + _percentageCalc2.default.of(self._progressTrack[self._currentTimetable], self._everyTimetable);
				self.emit('progress', self.progress);
			}
			function pro(p) {
				self._progressTrack[self._currentTimetable] = p;
				track();
			}
			return _bluebird2.default.mapSeries(timetables, function (table) {
				if (!table['Childs']) return _bluebird2.default.reject(new Error("Timetable has no child array."));
				if (!Array.isArray(table['Childs'])) return _bluebird2.default.reject(new Error("Timetable child field is not an array."));
				if (table['Childs'].length === 0) return _bluebird2.default.reject(new Error("Timetable child array length is 0."));
				if (_typeof(table['Childs'][0]) !== 'object' || !table['Childs'][0]['Detail']) return _bluebird2.default.reject(new Error("Corrupted timetable."));
				return new _bluebird2.default(function (resolve, reject) {
					(0, _requestProgress2.default)((0, _request2.default)({
						uri: table['Childs'][0]['Detail']
					}, function (error, response, body) {
						if (error || response.statusCode !== 200) {
							return reject(new Error("Response code was not 200."));
						} else {
							pro(100);
							self._currentTimetable += 1;
							var $ = _cheerio2.default.load(body);
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
							}).then(resolve).catch(reject);
						}
					})).on('progress', function (state) {
						pro(state.percent * 100);
					});
				});
			}).then(function (timetables) {
				return _bluebird2.default.resolve({
					kind: "timetables",
					data: timetables
				});
			});
		}
	}], [{
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
}(_events.EventEmitter);

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

//# sourceMappingURL=data:application/json;charset=utf-8;base64,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QVIsQ0FBZSxJQUFJLEtBQUosQ0FBVSxpQkFBVixDQUFmLENBQVA7QUFDaEUsV0FBTyxtQkFBUSxHQUFSLENBQVksS0FBSyxRQUFMLENBQVosRUFBNEIsVUFBQyxLQUFELEVBQVc7QUFDN0MsWUFBTyxtQkFBUSxPQUFSLENBQWdCO0FBQ3RCLFlBQU0sTUFBTSxNQUFOLENBRGdCO0FBRXRCLGFBQU8sTUFBTSxPQUFOLENBRmU7QUFHdEIsY0FBUSxNQUFNLFFBQU47QUFIYyxNQUFoQixDQUFQO0FBS0EsS0FOTSxDQUFQO0FBT0EsSUFUTSxFQVNKLElBVEksQ0FTQyxnQkFBUTtBQUNmLFdBQU8sbUJBQVEsT0FBUixDQUFnQjtBQUN0QixXQUFNLE9BRGdCO0FBRXRCLFdBQU0sS0FBSyxPQUFMO0FBRmdCLEtBQWhCLENBQVA7QUFJQSxJQWRNLENBQVA7QUFlQTs7Ozs7O0FBR0YsT0FBTyxPQUFQLEdBQWlCLFNBQWpCOztBQUVBLE1BQU0sU0FBTixDQUFnQixPQUFoQixHQUEwQixZQUFZO0FBQ3JDLEtBQUksSUFBSSxFQUFSO0FBQ0EsTUFBSyxJQUFJLElBQUksQ0FBYixFQUFnQixJQUFJLEtBQUssTUFBekIsRUFBaUMsR0FBakMsRUFBc0M7QUFDckMsTUFBSSxNQUFNLE9BQU4sQ0FBYyxLQUFLLENBQUwsQ0FBZCxDQUFKLEVBQTRCO0FBQzNCLFFBQUssSUFBSSxLQUFLLENBQWQsRUFBaUIsS0FBSyxLQUFLLENBQUwsRUFBUSxNQUE5QixFQUFzQyxJQUF0QyxFQUE0QztBQUMzQyxNQUFFLElBQUYsQ0FBTyxLQUFLLENBQUwsRUFBUSxFQUFSLENBQVA7QUFDQTtBQUNEO0FBQ0Q7QUFDRCxRQUFPLENBQVA7QUFDQSxDQVZEIiwiZmlsZSI6ImVzMjAxNS5qcyIsInNvdXJjZXNDb250ZW50IjpbIlwidXNlIHN0cmljdFwiO1xuXG5pbXBvcnQgRFNCQVBJIGZyb20gJ2RzYmFwaSc7XG5pbXBvcnQgUHJvbWlzZSBmcm9tICdibHVlYmlyZCc7XG5pbXBvcnQgcmVxdWVzdCBmcm9tICdyZXF1ZXN0JztcbmltcG9ydCBwcm9ncmVzcyBmcm9tICdyZXF1ZXN0LXByb2dyZXNzJztcbmltcG9ydCBjaGVlcmlvIGZyb20gJ2NoZWVyaW8nO1xuaW1wb3J0ICdkYXRlanMnO1xuaW1wb3J0IHtFdmVudEVtaXR0ZXJ9IGZyb20gJ2V2ZW50cyc7XG5pbXBvcnQgcGVyY2VudGFnZSBmcm9tICdwZXJjZW50YWdlLWNhbGMnO1xuXG5jbGFzcyBEU0JDbGllbnQgZXh0ZW5kcyBFdmVudEVtaXR0ZXIge1xuXG5cdC8qKlxuXHQgKlxuXHQgKiBAcGFyYW0gdXNlcm5hbWUge1N0cmluZ31cblx0ICogQHBhcmFtIHBhc3N3b3JkIHtTdHJpbmd9XG5cdCAqIEBwYXJhbSBbY29va2llamFyXSB7U3RyaW5nfVxuXHQgKi9cblx0Y29uc3RydWN0b3IodXNlcm5hbWUsIHBhc3N3b3JkLCBjb29raWVqYXIpIHtcblx0XHRzdXBlcigpO1xuXG5cdFx0dGhpcy51c2VybmFtZSA9IHVzZXJuYW1lO1xuXHRcdHRoaXMucGFzc3dvcmQgPSBwYXNzd29yZDtcblx0XHR0aGlzLmNvb2tpZWphciA9IGNvb2tpZWphcjtcblxuXHRcdHRoaXMucHJvZ3Jlc3MgPSAwO1xuXG5cdFx0aWYgKHRoaXMuY29va2llamFyKSB7XG5cdFx0XHR0aGlzLmFwaSA9IG5ldyBEU0JBUEkodGhpcy51c2VybmFtZSwgdGhpcy5wYXNzd29yZCwgdGhpcy5jb29raWVqYXIpO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHR0aGlzLmFwaSA9IG5ldyBEU0JBUEkodGhpcy51c2VybmFtZSwgdGhpcy5wYXNzd29yZCk7XG5cdFx0fVxuXG5cdFx0Y29uc3Qgc2VsZiA9IHRoaXM7XG5cblx0XHR0aGlzLmFwaS5vbigncHJvZ3Jlc3MnLCBmdW5jdGlvbiAocCkge1xuXHRcdFx0c2VsZi5wcm9ncmVzcyA9IHBlcmNlbnRhZ2Uub2YocCwgNTApO1xuXHRcdFx0c2VsZi5lbWl0KCdwcm9ncmVzcycsIHNlbGYucHJvZ3Jlc3MpO1xuXHRcdH0pO1xuXG5cdFx0dGhpcy5mZXRjaCA9IHRoaXMuZmV0Y2guYmluZCh0aGlzKTtcblx0XHR0aGlzLl9maWx0ZXIgPSB0aGlzLl9maWx0ZXIuYmluZCh0aGlzKTtcblx0XHR0aGlzLl9wcm9jZXNzZWRfdGltZXRhYmxlID0gdGhpcy5fcHJvY2Vzc2VkX3RpbWV0YWJsZS5iaW5kKHRoaXMpO1xuXHR9XG5cblx0LyoqXG5cdCAqXG5cdCAqIEByZXR1cm4ge1Byb21pc2UuPFRSZXN1bHQ+fVxuXHQgKi9cblx0ZmV0Y2goKSB7XG5cdFx0Y29uc3Qgc2VsZiA9IHRoaXM7XG5cdFx0c2VsZi5wcm9ncmVzcyA9IDA7XG5cdFx0cmV0dXJuIHRoaXMuYXBpLmdldERhdGEoKS50aGVuKHNlbGYuX2ZpbHRlcik7XG5cdH1cblxuXHQvKipcblx0ICpcblx0ICogQHBhcmFtIGRhdGEge09iamVjdH1cblx0ICogQHByaXZhdGVcblx0ICovXG5cdF9maWx0ZXIoZGF0YSkge1xuXHRcdGNvbnN0IHNlbGYgPSB0aGlzO1xuXHRcdHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG5cdFx0XHRpZiAoIWRhdGEpIHJldHVybiByZWplY3QobmV3IEVycm9yKFwiUmV0dXJuZWQgZGF0YSBpcyBudWxsIG9yIHVuZGVmaW5lZC5cIikpO1xuXHRcdFx0aWYgKGRhdGFbXCJSZXN1bHRjb2RlXCJdICE9PSAwKSByZXR1cm4gcmVqZWN0KG5ldyBFcnJvcihcIkRhdGEgcmVzdWx0IGNvZGUgaXNuJ3QgMC4gQ29kZTogXCIgKyBkYXRhW1wiUmVzdWx0Y29kZVwiXSkpO1xuXHRcdFx0aWYgKCFkYXRhW1wiUmVzdWx0TWVudUl0ZW1zXCJdKSByZXR1cm4gcmVqZWN0KG5ldyBFcnJvcihcIk5vIGZpZWxkIFJlc3VsdE1lbnVJdGVtcyBvbiByZXR1cm5lZCBkYXRhLlwiKSk7XG5cdFx0XHRpZiAoIUFycmF5LmlzQXJyYXkoZGF0YVtcIlJlc3VsdE1lbnVJdGVtc1wiXSkpIHJldHVybiByZWplY3QobmV3IEVycm9yKFwiUmVzdWx0TWVudUl0ZW1zIGlzbid0IGFuIGFycmF5LlwiKSk7XG5cdFx0XHRpZiAoZGF0YVtcIlJlc3VsdE1lbnVJdGVtc1wiXS5sZW5ndGggPT09IDApIHJldHVybiByZWplY3QobmV3IEVycm9yKFwiUmVzdWx0TWVudUl0ZW1zIGxlbmd0aCBpcyAwLlwiKSk7XG5cdFx0XHRjb25zdCBSZXN1bHRNZW51SXRlbXMgPSBkYXRhW1wiUmVzdWx0TWVudUl0ZW1zXCJdO1xuXHRcdFx0Y29uc3QgSW5oYWx0ZSA9IERTQkNsaWVudC5fZnJvbUFycmF5QnlLZXlBbmRWYWx1ZShSZXN1bHRNZW51SXRlbXMsIFwiVGl0bGVcIiwgXCJJbmhhbHRlXCIpO1xuXHRcdFx0aWYgKEluaGFsdGUgPT09IGZhbHNlKSByZXR1cm4gcmVqZWN0KG5ldyBFcnJvcihcIkNhbid0IGZpbmQge1RpdGxlOidJbmhhbHRlJ30gaW4gJ1Jlc3VsdE1lbnVJdGVtcycuXCIpKTtcblx0XHRcdGlmICghSW5oYWx0ZVtcIkNoaWxkc1wiXSkgcmV0dXJuIHJlamVjdChuZXcgRXJyb3IoXCInQ2hpbGRzJyBpbiAnSW5oYWx0ZScgaXMgbnVsbCBvciB1bmRlZmluZWQuXCIpKTtcblx0XHRcdGlmICghQXJyYXkuaXNBcnJheShJbmhhbHRlW1wiQ2hpbGRzXCJdKSkgcmV0dXJuIHJlamVjdChuZXcgRXJyb3IoXCInQ2hpbGRzJyBpbiAnSW5oYWx0ZScgaXNuJ3QgYW4gYXJyYXkuXCIpKTtcblx0XHRcdGlmIChJbmhhbHRlW1wiQ2hpbGRzXCJdLmxlbmd0aCA9PT0gMCkgcmV0dXJuIHJlamVjdChuZXcgRXJyb3IoXCJUaGUgbGVuZ3RoIG9mICdDaGlsZHMnIGluICdJbmhhbHRlJyBpcyAwLlwiKSk7XG5cdFx0XHRsZXQgSW5oYWx0ZUNoaWxkcyA9IEluaGFsdGVbXCJDaGlsZHNcIl07XG5cdFx0XHRyZXR1cm4gUHJvbWlzZS5tYXAoSW5oYWx0ZUNoaWxkcywgZnVuY3Rpb24gKGNoaWxkKSB7XG5cdFx0XHRcdHJldHVybiBEU0JDbGllbnQuX1Jvb3RSZXNvbHZlcihjaGlsZCk7XG5cdFx0XHR9KS50aGVuKENoaWxkcyA9PiB7XG5cdFx0XHRcdHJldHVybiBQcm9taXNlLm1hcChDaGlsZHMsIChjaGlsZCwgaW5kZXgpID0+IHtcblx0XHRcdFx0XHRJbmhhbHRlQ2hpbGRzW2luZGV4XVsnQ2hpbGRzJ10gPSBjaGlsZDtcblx0XHRcdFx0XHRkZWxldGUgSW5oYWx0ZUNoaWxkc1tpbmRleF1bJ1Jvb3QnXTtcblx0XHRcdFx0XHRkZWxldGUgSW5oYWx0ZUNoaWxkc1tpbmRleF1bJ05ld0NvdW50J107XG5cdFx0XHRcdFx0ZGVsZXRlIEluaGFsdGVDaGlsZHNbaW5kZXhdWydTYXZlTGFzdFN0YXRlJ107XG5cdFx0XHRcdFx0ZGVsZXRlIEluaGFsdGVDaGlsZHNbaW5kZXhdWydJbmRleCddO1xuXHRcdFx0XHRcdHJldHVybiBQcm9taXNlLnJlc29sdmUoKTtcblx0XHRcdFx0fSkudGhlbigoKSA9PiB7XG5cdFx0XHRcdFx0cmV0dXJuIFByb21pc2UucmVzb2x2ZShJbmhhbHRlQ2hpbGRzKTtcblx0XHRcdFx0fSk7XG5cdFx0XHR9KS50aGVuKE5ld0luaGFsdGUgPT4ge1xuXHRcdFx0XHRsZXQgZmRhdGEgPSB7fTtcblx0XHRcdFx0cmV0dXJuIFByb21pc2UubWFwKE5ld0luaGFsdGUsIChtZXRob2QpID0+IHtcblx0XHRcdFx0XHRpZiAoIW1ldGhvZCkgcmV0dXJuIFByb21pc2UucmVzb2x2ZSgpO1xuXHRcdFx0XHRcdGlmIChtZXRob2RbJ01ldGhvZE5hbWUnXSA9PT0gXCJ0aW1ldGFibGVcIikge1xuXHRcdFx0XHRcdFx0cmV0dXJuIHNlbGYuX3Byb2Nlc3NlZF90aW1ldGFibGUobWV0aG9kWydDaGlsZHMnXSkudGhlbih0ZGF0YSA9PiB7XG5cdFx0XHRcdFx0XHRcdGZkYXRhW3RkYXRhLmtpbmRdID0gdGRhdGEuZGF0YTtcblx0XHRcdFx0XHRcdH0pO1xuXHRcdFx0XHRcdH0gZWxzZSBpZiAobWV0aG9kWydNZXRob2ROYW1lJ10gPT09IFwidGlsZXNcIikge1xuXHRcdFx0XHRcdFx0cmV0dXJuIERTQkNsaWVudC5fcHJvY2Vzc2VkX3RpbGVzKG1ldGhvZFsnQ2hpbGRzJ10pLnRoZW4odGRhdGEgPT4ge1xuXHRcdFx0XHRcdFx0XHRmZGF0YVt0ZGF0YS5raW5kXSA9IHRkYXRhLmRhdGE7XG5cdFx0XHRcdFx0XHR9KTtcblx0XHRcdFx0XHR9IGVsc2UgaWYgKG1ldGhvZFsnTWV0aG9kTmFtZSddID09PSBcIm5ld3NcIikge1xuXHRcdFx0XHRcdFx0cmV0dXJuIERTQkNsaWVudC5fcHJvY2Vzc2VkX25ld3MobWV0aG9kWydDaGlsZHMnXSkudGhlbih0ZGF0YSA9PiB7XG5cdFx0XHRcdFx0XHRcdGZkYXRhW3RkYXRhLmtpbmRdID0gdGRhdGEuZGF0YTtcblx0XHRcdFx0XHRcdH0pO1xuXHRcdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0XHRyZXR1cm4gUHJvbWlzZS5yZXNvbHZlKCk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9KS50aGVuKCgpID0+IHtcblx0XHRcdFx0XHRyZXR1cm4gUHJvbWlzZS5yZXNvbHZlKGZkYXRhKTtcblx0XHRcdFx0fSk7XG5cdFx0XHR9KS50aGVuKGRhdGEgPT4ge1xuXHRcdFx0XHRzZWxmLnByb2dyZXNzID0gMTAwO1xuXHRcdFx0XHRzZWxmLmVtaXQoJ3Byb2dyZXNzJywgMTAwKTtcblx0XHRcdFx0cmVzb2x2ZShkYXRhKTtcblx0XHRcdH0pO1xuXHRcdH0pO1xuXHR9XG5cblx0LyoqXG5cdCAqXG5cdCAqIEBwYXJhbSBhcnJheSB7QXJyYXl9XG5cdCAqIEBwYXJhbSBrZXkge1N0cmluZ31cblx0ICogQHBhcmFtIHZhbHVlIHtTdHJpbmd9XG5cdCAqIEByZXR1cm4ge09iamVjdHxib29sZWFufVxuXHQgKiBAcHJpdmF0ZVxuXHQgKi9cblx0c3RhdGljIF9mcm9tQXJyYXlCeUtleUFuZFZhbHVlKGFycmF5LCBrZXksIHZhbHVlKSB7XG5cdFx0Zm9yIChsZXQgaSA9IDA7IGkgPCBhcnJheS5sZW5ndGg7IGkrKykge1xuXHRcdFx0aWYgKGFycmF5W2ldW2tleV0gPT09IHZhbHVlKSByZXR1cm4gYXJyYXlbaV07XG5cdFx0fVxuXHRcdHJldHVybiBmYWxzZTtcblx0fVxuXG5cdC8qKlxuXHQgKlxuXHQgKiBAcGFyYW0gb2JqZWN0XG5cdCAqIEByZXR1cm4ge1Byb21pc2V9XG5cdCAqIEBwcml2YXRlXG5cdCAqL1xuXHRzdGF0aWMgX1Jvb3RSZXNvbHZlcihvYmplY3QpIHtcblx0XHRyZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuXHRcdFx0aWYgKCFvYmplY3QpIHJldHVybiByZWplY3QobmV3IEVycm9yKFwiR2l2ZW4gcGFyYW1ldGVyIGlzIG51bGwgb3IgdW5kZWZpbmVkLlwiKSk7XG5cdFx0XHRpZiAodHlwZW9mIG9iamVjdCAhPT0gJ29iamVjdCcpIHJldHVybiByZWplY3QobmV3IEVycm9yKFwiR2l2ZW4gcGFyYW1ldGVyIGlzIG5vdCBhbiBvYmplY3QuXCIpKTtcblx0XHRcdGlmICghb2JqZWN0WydSb290J10pIHJldHVybiByZWplY3QobmV3IEVycm9yKFwiJ1Jvb3QnIGZpbGVkIG9mIGdpdmVuIG9iamVjdCBpcyBudWxsIG9yIHVuZGVmaW5lZC5cIikpO1xuXHRcdFx0aWYgKHR5cGVvZiBvYmplY3RbJ1Jvb3QnXSAhPT0gJ29iamVjdCcpIHJldHVybiByZWplY3QobmV3IEVycm9yKFwiJ1Jvb3QnIGZpZWxkIG9mIGdpdmVuIG9iamVjdCBpc24ndCBhbiBvYmplY3QuXCIpKTtcblx0XHRcdGlmICghb2JqZWN0WydSb290J11bJ0NoaWxkcyddKSByZXR1cm4gcmVqZWN0KG5ldyBFcnJvcihcIidDaGlsZHMnIGZpZWxkIGluIGdpdmVuIG9iamVjdCAnUm9vdCcgaXMgbnVsbCBvciB1bmRlZmluZWQuXCIpKTtcblx0XHRcdGlmICghQXJyYXkuaXNBcnJheShvYmplY3RbJ1Jvb3QnXVsnQ2hpbGRzJ10pKSByZXR1cm4gcmVqZWN0KG5ldyBFcnJvcihcIidDaGlsZHMnIGZpZWxkIGluIGdpdmVuIG9iamVjdCAnUm9vdCcgaXMgbm90IGFuIGFycmF5LlwiKSk7XG5cdFx0XHRyZXNvbHZlKG9iamVjdFsnUm9vdCddWydDaGlsZHMnXSk7XG5cdFx0fSk7XG5cdH1cblxuXHRfcHJvY2Vzc2VkX3RpbWV0YWJsZSh0aW1ldGFibGVzLCBzZXRQcm9ncmVzcywgaW5Db3VudCkge1xuXHRcdGNvbnN0IHNlbGYgPSB0aGlzO1xuXHRcdHNlbGYuX3RpbWV0YWJsZXMgPSB0aW1ldGFibGVzLmxlbmd0aDtcblx0XHRzZWxmLl9wcm9ncmVzc1RyYWNrID0gQXJyYXkuYXBwbHkobnVsbCwgQXJyYXkoc2VsZi5fdGltZXRhYmxlcykpLm1hcChOdW1iZXIucHJvdG90eXBlLnZhbHVlT2YsMCk7XG5cdFx0c2VsZi5fY3VycmVudFRpbWV0YWJsZSA9IDA7XG5cdFx0c2VsZi5fZXZlcnlUaW1ldGFibGUgPSA1MCAvIHNlbGYuX3RpbWV0YWJsZXM7XG5cdFx0c2VsZi5wcm9ncmVzcyA9IDUwO1xuXHRcdGZ1bmN0aW9uIHRyYWNrKCkge1xuXHRcdFx0c2VsZi5wcm9ncmVzcyA9IDUwICsgKHNlbGYuX2N1cnJlbnRUaW1ldGFibGUgKiBzZWxmLl9ldmVyeVRpbWV0YWJsZSkgKyBwZXJjZW50YWdlLm9mKHNlbGYuX3Byb2dyZXNzVHJhY2tbc2VsZi5fY3VycmVudFRpbWV0YWJsZV0sIHNlbGYuX2V2ZXJ5VGltZXRhYmxlKTtcblx0XHRcdHNlbGYuZW1pdCgncHJvZ3Jlc3MnLCBzZWxmLnByb2dyZXNzKTtcblx0XHR9XG5cdFx0ZnVuY3Rpb24gcHJvKHApIHtcblx0XHRcdHNlbGYuX3Byb2dyZXNzVHJhY2tbc2VsZi5fY3VycmVudFRpbWV0YWJsZV0gPSBwO1xuXHRcdFx0dHJhY2soKTtcblx0XHR9XG5cdFx0cmV0dXJuIFByb21pc2UubWFwU2VyaWVzKHRpbWV0YWJsZXMsICh0YWJsZSkgPT4ge1xuXHRcdFx0aWYgKCF0YWJsZVsnQ2hpbGRzJ10pIHJldHVybiBQcm9taXNlLnJlamVjdChuZXcgRXJyb3IoXCJUaW1ldGFibGUgaGFzIG5vIGNoaWxkIGFycmF5LlwiKSk7XG5cdFx0XHRpZiAoIUFycmF5LmlzQXJyYXkodGFibGVbJ0NoaWxkcyddKSkgcmV0dXJuIFByb21pc2UucmVqZWN0KG5ldyBFcnJvcihcIlRpbWV0YWJsZSBjaGlsZCBmaWVsZCBpcyBub3QgYW4gYXJyYXkuXCIpKTtcblx0XHRcdGlmICh0YWJsZVsnQ2hpbGRzJ10ubGVuZ3RoID09PSAwKSByZXR1cm4gUHJvbWlzZS5yZWplY3QobmV3IEVycm9yKFwiVGltZXRhYmxlIGNoaWxkIGFycmF5IGxlbmd0aCBpcyAwLlwiKSk7XG5cdFx0XHRpZiAodHlwZW9mIHRhYmxlWydDaGlsZHMnXVswXSAhPT0gJ29iamVjdCcgfHwgIXRhYmxlWydDaGlsZHMnXVswXVsnRGV0YWlsJ10pIHJldHVybiBQcm9taXNlLnJlamVjdChuZXcgRXJyb3IoXCJDb3JydXB0ZWQgdGltZXRhYmxlLlwiKSk7XG5cdFx0XHRyZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuXHRcdFx0XHRwcm9ncmVzcyhyZXF1ZXN0KHtcblx0XHRcdFx0XHR1cmk6IHRhYmxlWydDaGlsZHMnXVswXVsnRGV0YWlsJ11cblx0XHRcdFx0fSwgZnVuY3Rpb24gKGVycm9yLCByZXNwb25zZSwgYm9keSkge1xuXHRcdFx0XHRcdGlmIChlcnJvciB8fCByZXNwb25zZS5zdGF0dXNDb2RlICE9PSAyMDApIHtcblx0XHRcdFx0XHRcdHJldHVybiByZWplY3QobmV3IEVycm9yKFwiUmVzcG9uc2UgY29kZSB3YXMgbm90IDIwMC5cIikpO1xuXHRcdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0XHRwcm8oMTAwKTtcblx0XHRcdFx0XHRcdHNlbGYuX2N1cnJlbnRUaW1ldGFibGUgKz0gMTtcblx0XHRcdFx0XHRcdGNvbnN0ICQgPSBjaGVlcmlvLmxvYWQoYm9keSk7XG5cdFx0XHRcdFx0XHRjb25zdCBNb25UaXRsZSA9ICQoXCIubW9uX3RpdGxlXCIpO1xuXHRcdFx0XHRcdFx0aWYgKCFNb25UaXRsZS50ZXh0KCkpIHJldHVybiBQcm9taXNlLnJlamVjdChuZXcgRXJyb3IoXCJDYW4gbm90IGZpbmQgJ21vbl90aXRsZScgaW4gdGltZXRhYmxlLlwiKSk7XG5cdFx0XHRcdFx0XHRpZiAoTW9uVGl0bGUudGV4dCgpLm1hdGNoKC9cXGQqXFwuXFxkKlxcLlxcZCovKS5sZW5ndGggPT09IDApIHJldHVybiBQcm9taXNlLnJlamVjdChuZXcgRXJyb3IoXCJDYW4gbm90IGZpbmQgZGF0ZSBvZiB0aW1ldGFibGUuXCIpKTtcblx0XHRcdFx0XHRcdHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG5cdFx0XHRcdFx0XHRcdHRyeSB7XG5cdFx0XHRcdFx0XHRcdFx0Y29uc3QgZGF0ZSA9IERhdGUucGFyc2UoTW9uVGl0bGUudGV4dCgpLm1hdGNoKC9cXGQqXFwuXFxkKlxcLlxcZCovKVswXSk7XG5cdFx0XHRcdFx0XHRcdFx0cmVzb2x2ZSh7XG5cdFx0XHRcdFx0XHRcdFx0XHRzcmM6IHRhYmxlWydDaGlsZHMnXVswXVsnRGV0YWlsJ10sXG5cdFx0XHRcdFx0XHRcdFx0XHRkYXRlOiBEYXRlLnBhcnNlKE1vblRpdGxlLnRleHQoKS5tYXRjaCgvXFxkKlxcLlxcZCpcXC5cXGQqLylbMF0pLFxuXHRcdFx0XHRcdFx0XHRcdFx0cmVmcmVzaGVkOiBEYXRlLnBhcnNlKHRhYmxlWydDaGlsZHMnXVswXVsnRGF0ZSddKVxuXHRcdFx0XHRcdFx0XHRcdH0pO1xuXHRcdFx0XHRcdFx0XHR9IGNhdGNoIChlKSB7XG5cdFx0XHRcdFx0XHRcdFx0cmVqZWN0KG5ldyBFcnJvcihcIkNhbid0IHBhcnNlIGRhdGUgb2YgdGltZXRhYmxlLlwiKSk7XG5cdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdH0pLnRoZW4ocmVzb2x2ZSkuY2F0Y2gocmVqZWN0KTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH0pKS5vbigncHJvZ3Jlc3MnLCBmdW5jdGlvbiAoc3RhdGUpIHtcblx0XHRcdFx0XHRwcm8oc3RhdGUucGVyY2VudCAqIDEwMCk7XG5cdFx0XHRcdH0pO1xuXHRcdFx0fSk7XG5cdFx0fSkudGhlbih0aW1ldGFibGVzID0+IHtcblx0XHRcdHJldHVybiBQcm9taXNlLnJlc29sdmUoe1xuXHRcdFx0XHRraW5kOiBcInRpbWV0YWJsZXNcIixcblx0XHRcdFx0ZGF0YTogdGltZXRhYmxlc1xuXHRcdFx0fSk7XG5cdFx0fSk7XG5cdH1cblxuXHRzdGF0aWMgX3Byb2Nlc3NlZF9uZXdzKG5ld3NwbCkge1xuXHRcdHJldHVybiBQcm9taXNlLm1hcChuZXdzcGwsIChuZXdzKSA9PiB7XG5cdFx0XHRyZXR1cm4gUHJvbWlzZS5yZXNvbHZlKHtcblx0XHRcdFx0ZGF0ZTogbmV3c1tcIkRhdGVcIl0sXG5cdFx0XHRcdHRpdGxlOiBuZXdzW1wiVGl0bGVcIl0sXG5cdFx0XHRcdHRleHQ6IG5ld3NbXCJEZXRhaWxcIl1cblx0XHRcdH0pO1xuXHRcdH0pLnRoZW4oZGF0YSA9PiB7XG5cdFx0XHRyZXR1cm4gUHJvbWlzZS5yZXNvbHZlKHtcblx0XHRcdFx0a2luZDogXCJuZXdzXCIsXG5cdFx0XHRcdGRhdGE6IGRhdGFcblx0XHRcdH0pO1xuXHRcdH0pO1xuXHR9XG5cblx0c3RhdGljIF9wcm9jZXNzZWRfdGlsZXModGlsZXMpIHtcblx0XHRyZXR1cm4gUHJvbWlzZS5tYXAodGlsZXMsICh0aWxlKSA9PiB7XG5cdFx0XHRpZiAoIXRpbGUgfHwgIXRpbGVbXCJDaGlsZHNcIl0gfHwgIUFycmF5LmlzQXJyYXkodGlsZVtcIkNoaWxkc1wiXSkpIHJldHVybiBQcm9taXNlLnJlamVjdChuZXcgRXJyb3IoXCJDb3JydXB0ZWQgdGlsZS5cIikpO1xuXHRcdFx0cmV0dXJuIFByb21pc2UubWFwKHRpbGVbXCJDaGlsZHNcIl0sICh0aWxlMikgPT4ge1xuXHRcdFx0XHRyZXR1cm4gUHJvbWlzZS5yZXNvbHZlKHtcblx0XHRcdFx0XHRkYXRlOiB0aWxlMltcIkRhdGVcIl0sXG5cdFx0XHRcdFx0dGl0bGU6IHRpbGUyW1wiVGl0bGVcIl0sXG5cdFx0XHRcdFx0ZGV0YWlsOiB0aWxlMltcIkRldGFpbFwiXVxuXHRcdFx0XHR9KTtcblx0XHRcdH0pO1xuXHRcdH0pLnRoZW4oZGF0YSA9PiB7XG5cdFx0XHRyZXR1cm4gUHJvbWlzZS5yZXNvbHZlKHtcblx0XHRcdFx0a2luZDogXCJ0aWxlc1wiLFxuXHRcdFx0XHRkYXRhOiBkYXRhLmNvbWJpbmUoKVxuXHRcdFx0fSk7XG5cdFx0fSk7XG5cdH1cbn1cblxubW9kdWxlLmV4cG9ydHMgPSBEU0JDbGllbnQ7XG5cbkFycmF5LnByb3RvdHlwZS5jb21iaW5lID0gZnVuY3Rpb24gKCkge1xuXHRsZXQgeCA9IFtdO1xuXHRmb3IgKGxldCBpID0gMDsgaSA8IHRoaXMubGVuZ3RoOyBpKyspIHtcblx0XHRpZiAoQXJyYXkuaXNBcnJheSh0aGlzW2ldKSkge1xuXHRcdFx0Zm9yIChsZXQgaWkgPSAwOyBpaSA8IHRoaXNbaV0ubGVuZ3RoOyBpaSsrKSB7XG5cdFx0XHRcdHgucHVzaCh0aGlzW2ldW2lpXSk7XG5cdFx0XHR9XG5cdFx0fVxuXHR9XG5cdHJldHVybiB4O1xufTtcbiJdfQ==