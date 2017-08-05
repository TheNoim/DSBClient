"use strict";

import DSBAPI from 'dsbapi';
import Promise from 'bluebird';
import request from 'request';
import progress from 'request-progress';
import cheerio from 'cheerio';
import 'datejs';
import {EventEmitter} from 'events';
import percentage from 'percentage-calc';

class DSBClient extends EventEmitter {

	/**
	 *
	 * @param username {String}
	 * @param password {String}
	 * @param [cookiejar] {String}
	 */
	constructor(username, password, cookiejar) {
		super();

		this.username = username;
		this.password = password;
		this.cookiejar = cookiejar;

		this.progress = 0;

		if (this.cookiejar) {
			this.api = new DSBAPI(this.username, this.password, this.cookiejar);
		} else {
			this.api = new DSBAPI(this.username, this.password);
		}

		const self = this;

		this.api.on('progress', function (p) {
			self.progress = percentage.of(p, 50);
			self.emit('progress', self.progress);
		});

		this.fetch = this.fetch.bind(this);
		this._filter = this._filter.bind(this);
		this._processed_timetable = this._processed_timetable.bind(this);
	}

	/**
	 *
	 * @return {Promise.<TResult>}
	 */
	fetch() {
		const self = this;
		self.progress = 0;
		return this.api.getData().then(self._filter);
	}

	/**
	 *
	 * @param data {Object}
	 * @private
	 */
	_filter(data) {
		const self = this;
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
				let fdata = {};
				return Promise.map(NewInhalte, (method) => {
					if (!method) return Promise.resolve();
					if (method['MethodName'] === "timetable") {
						return self._processed_timetable(method['Childs']).then(tdata => {
							fdata[tdata.kind] = tdata.data;
						});
					} else if (method['MethodName'] === "tiles") {
						return DSBClient._processed_tiles(method['Childs']).then(tdata => {
							fdata[tdata.kind] = tdata.data;
						});
					} else if (method['MethodName'] === "news") {
						return DSBClient._processed_news(method['Childs']).then(tdata => {
							fdata[tdata.kind] = tdata.data;
						});
					} else {
						return Promise.resolve();
					}
				}).then(() => {
					return Promise.resolve(fdata);
				});
			}).then(data => {
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

	_processed_timetable(timetables, setProgress, inCount) {
		const self = this;
		self._timetables = timetables.length;
		self._progressTrack = Array.apply(null, Array(self._timetables)).map(Number.prototype.valueOf,0);
		self._currentTimetable = 0;
		self._everyTimetable = 50 / self._timetables;
		self.progress = 50;
		function track() {
			self.progress = 50 + (self._currentTimetable * self._everyTimetable) + percentage.of(self._progressTrack[self._currentTimetable], self._everyTimetable);
			self.emit('progress', self.progress);
		}
		function pro(p) {
			self._progressTrack[self._currentTimetable] = p;
			track();
		}
		return Promise.mapSeries(timetables, (table) => {
			if (!table['Childs']) return Promise.reject(new Error("Timetable has no child array."));
			if (!Array.isArray(table['Childs'])) return Promise.reject(new Error("Timetable child field is not an array."));
			if (table['Childs'].length === 0) return Promise.reject(new Error("Timetable child array length is 0."));
			if (typeof table['Childs'][0] !== 'object' || !table['Childs'][0]['Detail']) return Promise.reject(new Error("Corrupted timetable."));
			return new Promise((resolve, reject) => {
				progress(request({
					uri: table['Childs'][0]['Detail']
				}, function (error, response, body) {
					if (error || response.statusCode !== 200) {
						return reject(new Error("Response code was not 200."));
					} else {
						pro(100);
						self._currentTimetable += 1;
						const $ = cheerio.load(body);
						const MonTitle = $(".mon_title");
						if (!MonTitle.text()) return Promise.reject(new Error("Can not find 'mon_title' in timetable."));
						if (MonTitle.text().match(/\d*\.\d*\.\d*/).length === 0) return Promise.reject(new Error("Can not find date of timetable."));
						return new Promise((resolve, reject) => {
							try {
								const date = Date.parse(MonTitle.text().match(/\d*\.\d*\.\d*/)[0]);
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
		}).then(timetables => {
			return Promise.resolve({
				kind: "timetables",
				data: timetables
			});
		});
	}

	static _processed_news(newspl) {
		return Promise.map(newspl, (news) => {
			return Promise.resolve({
				date: news["Date"],
				title: news["Title"],
				text: news["Detail"]
			});
		}).then(data => {
			return Promise.resolve({
				kind: "news",
				data: data
			});
		});
	}

	static _processed_tiles(tiles) {
		return Promise.map(tiles, (tile) => {
			if (!tile || !tile["Childs"] || !Array.isArray(tile["Childs"])) return Promise.reject(new Error("Corrupted tile."));
			return Promise.map(tile["Childs"], (tile2) => {
				return Promise.resolve({
					date: tile2["Date"],
					title: tile2["Title"],
					detail: tile2["Detail"]
				});
			});
		}).then(data => {
			return Promise.resolve({
				kind: "tiles",
				data: data.combine()
			});
		});
	}
}

module.exports = DSBClient;

Array.prototype.combine = function () {
	let x = [];
	for (let i = 0; i < this.length; i++) {
		if (Array.isArray(this[i])) {
			for (let ii = 0; ii < this[i].length; ii++) {
				x.push(this[i][ii]);
			}
		}
	}
	return x;
};
