var dom_helper = {
	show: function (id) {
		this.remove_css_class(id, "hidden");
	},
	hide: function (id) {
		this.add_css_class(id, "hidden");
	},
	add_css_class: function (id, css_class) {
		document.getElementById(id).classList.add(css_class);
	},
	remove_css_class: function (id, css_class) {
		document.getElementById(id).classList.remove(css_class);
	},
	set_text: function (id, text) {
		document.getElementById(id).innerHTML = text;
	},
	append_html: function (id, html) {
		document.getElementById(id).insertAdjacentHTML('beforeend', html);
	},
	enable: function (id) {
		document.getElementById(id).disabled = false;
	},
	disable: function (id) {
		document.getElementById(id).disabled = true;
	},
	blink: function (id, ms) {
		this.show(id);
		setTimeout((function () { this.hide(id); }).bind(this), ms);
	},
	duplicate: function (id) {
		var original = document.getElementById(id);
		var clone = original.cloneNode(true); // "deep" clone

		var clone_id = id + data_helper.get_timestamp();
		clone.id = clone_id;

		original.parentNode.appendChild(clone);

		return clone_id;
	},
	duplicateSerially: function (id, serialNumber) {
		var original = document.getElementById(id);
		var clone = original.cloneNode(true); // "deep" clone

		var clone_id = id + serialNumber;
		clone.id = clone_id;

		original.parentNode.appendChild(clone);

		return clone_id;
	},
	removeElement: function (id) {
		var element = document.getElementById(id);
		element.parentNode.removeChild(element);
	},
	goTo: function (relativeUrl) {
		location.href = relativeUrl + location.search;
	}
};

function prepareSubjectData(subjectData) {
	var data = {};
	if (!!subjectData) {
		// create one dictionnay for each line of data:
		arrayOfObj = Object.entries(subjectData).map((e) => Object.assign(({ 'serial': e[0] }), e[1]));
		// populate data variables:
		app_settings.dataVarList.forEach(key => data[key] = []);
		// fill dictionnary of arrays:
		arrayOfObj.forEach(function (lineObject) {
			for (const key of Object.keys(data)) {
				data[key].push(lineObject[key]);
			}
		});
	};

	// Remove objects that don't have context=app_settings.context from the data:
	subjectData = subjectData.filter(x => x.context == app_settings.context);

	// Remove exact startTime multiple cases to overcome cases of partial or complete duplicates (may happen rarely). This will leave only last case of identical startTime (along with its data).
	if (data.startTime.filter(x => !!x).length !== (new Set(data.startTime.filter(x => !!x))).size) {
		var indicesToRemove = []
		data.startTime.forEach(function (x, i) {
			if (!!x && i !== data.startTime.lastIndexOf(x)) {
				indicesToRemove.push(i)
			}
		})
		if (indicesToRemove) {
			indicesToRemove.reverse().forEach(indToRemove => Object.keys(data).forEach(key => data[key].splice(indToRemove, 1)))
		}
	}

	return data;
}

var data_helper = {
	base_address: app_settings.server.base_address,
	ws_base_address: app_settings.server.ws_base_address,
	get_subject_id: function () {
		subId = /[&?]subId=([^&]+)/.exec(location.search)[1];
		return String(key2subId_mapping[subId]);
	},
	get_subject_data: function (asArray) { // returns promise
		return new Promise((function (resolve, reject) {
			var url = this.base_address + '/app/api/session/list?subId=' + this.get_subject_id();
			url += '&context=' + app_settings.context;
			url += '&fields=' + app_settings.dataVarList.concat(['uniqueEntryID']).join(',');

			var localData = offline_data_manager.get();

			if (offline_data_manager.isAvailable()) {
				return resolve(prepareSubjectData(localData));
			} else {
				if (localData.length > 0) {
					const lastSessionDate = new Date(Math.max(...localData.map(x => new Date(x.created_at))));
					url += '&from=' + lastSessionDate.toISOString();
				}
				return ajax_helper.get(url)
					.then((function (subjectData) {
						// use only relevant context:
						subjectData = subjectData.filter(x => x.context == app_settings.context);

						var allData = localData.concat(subjectData);
						subjectData = Object.values(allData.toDict('localSessionId')); // remove double entries
						subjectData = subjectData.sort((a, b) => Date.parse(a.startTime) - Date.parse(b.startTime)) // sort it before saving to the localStorage

						// Added to minimize data kept locally (to prevent local storage overload):
						if (!app_settings.downloadAllToLocalStorage) {
							for (let day = 1; day < subjectData.map(x => x['day']).filter(x => !!x).slice().reverse()[0]; day++) { // iterate day to last day appeared in the data [the last one is NOT included]
								subjectData = offline_data_manager.minimizeSelectedDayDataPoints(subjectData, day)
							}
						}

						// save the data to the localStorage and prepare it for use in this trial
						offline_data_manager.set(subjectData);

						if (!!asArray) {
							resolve(prepareSubjectData(subjectData));
						} else {
							resolve((!!subjectData) ? subjectData : {});
						}
					}).bind(this));
			}
		}).bind(this));
	},
	getWsUrl: function (sessionName) {
		var url = ''
		if (this.ws_base_address) {
			url = this.ws_base_address;
		} else {
			url += 'ws'

			if (location.protocol.includes('https'))
				url += 's';

			url += '://' + location.hostname;

			if (location.port)
				url += ":" + location.port;
		}

		url += '/app/session?subId=' + this.get_subject_id();
		url += '&context=' + app_settings.context;
		url += '&sName=' + sessionName;

		if (!!this.sessionId) {
			url += '&sessionId=' + this.sessionId;
		}

		url += '&transport=websocket';

		return url;
	},
	ws: {},
	sessionName: '',
	sessionId: '',
	localSessionId: '',
	q: [],
	get_timestamp: function () {
		return (new Date()).getTime();
	},
	init_session: function (sessionName, tryRestore) { // use tryRestore = false to force new session
		this.sessionName = sessionName;

		if (!tryRestore) {
			this.sessionId = '';
			this.q = [];
			this.localSessionId = 'session' + this.get_timestamp();

			offline_data_manager.clearStaged();
		}

		// close current socket before reconnecting
		if (!!this.ws && !!this.ws.close) {
			this.ws.close();
		}
		this.ws = new WebSocket(this.getWsUrl(sessionName + this.get_timestamp()));

		this.ws.onopen = (function (event) {
			console.log('new session opened');
		}).bind(this);

		this.ws.onclose = (function (event) {
			// https://stackoverflow.com/questions/18803971/websocket-onerror-how-to-read-error-description
			if (event.code != 1000) {
				// https://stackoverflow.com/questions/13797262/how-to-reconnect-to-websocket-after-close-connection
				console.log('WS is closed');
			}
		}).bind(this);

		this.ws.onerror = (function (event) {
			console.log('WS error!');
			console.log(event);
		}).bind(this);

		this.ws.onmessage = (function (event) {
			var data = JSON.parse(event.data);

			// if it is the first message in session get the current sessionId
			if ('_id' in data) {
				this.sessionId = data._id;
				this.try_flush();	// added to save first uploaded data **
			}

			// if it is ack message remove the message from queue
			if ('messageId' in data) {
				this.q = this.q.filter(m => m.messageId != data.messageId);

				// when message received in backend, save to local storage
				offline_data_manager.commit(data.messageId);
			}

			if ('broadcast' in data) {
				if (this.on_broadcast)
					this.on_broadcast(data);
			}
		}).bind(this);
	},
	appendStashedData: function () {
		var stash = offline_data_manager.stash.get();
		if (!!stash) {
			this.append_subject_data(stash);
			offline_data_manager.stash.clear();
		}
	},
	on_broadcast: undefined,
	append_subject_data: function (data) {
		this.q.push(data);

		// send all messages that sill in queue together
		return this.try_flush();
	},
	try_flush: function () {
		if (this.q.length && !!this.localSessionId) { // try flush only after session is initialized
			// generate new message id for all messages in q
			const messageId = 'm' + this.get_timestamp();
			this.q.forEach(m => m.messageId = messageId)

			var baseData = { localSessionId: this.localSessionId, subId: this.get_subject_id(), context: app_settings.context };
			if (!!this.sessionId)
				baseData._id = this.sessionId;
			const dataToSend =
				Object.assign({}, baseData, ...this.q, typeof uniqueEntryID === 'undefined' ? {} : { uniqueEntryID: uniqueEntryID })

			// save sent message to temp storage before receipt confirmation arrives
			offline_data_manager.stage(dataToSend.messageId, { ...dataToSend, touchData: undefined });

			if (!!this.ws.readyState) {
				if (this.ws.readyState == 1 && this.sessionId) {
					// send to backend
					this.ws.send(JSON.stringify(dataToSend));

					console.log('readySatate = 1; data was saved. The data:')
					console.log(dataToSend)

					return true;
				} else {
					console.log("waiting for connection...")
					if (this.ws.readyState == 3) { // status CLOSED
						this.init_session(this.sessionName, true);
					}
					return false;
				}
			} else {
				return true; // nothing to send - report success
			}
		} else {
			return true; // nothing to send - report success
		}
	},
	flush: function (nRetries) { // use -1 for infinite retries
		if (!nRetries) // if no value is set then use infinite retries
			nRetries = -1;

		var retries = 0;

		return new Promise((async function (resolve, reject) {
			while (!this.try_flush() && this.q.length > 0) {
				retries += 1;
				if (nRetries < 0 || retries < nRetries)
					await delay(300);
				else
					return reject();
			}
			return resolve();
		}).bind(this));
	},
	wait_for_server: function (max_ms) {
		return Promise.race([
			delay(max_ms),
			new Promise((async function (resolve, reject) {
				while (this.q.length > 0) {
					await delay(300);
				}
				return resolve('success');
			}).bind(this))
		]).then((function (result) {
			if (result != 'success') {
				this.try_flush();
			}
		}).bind(this));
	}
};

var offline_data_manager = {
	get: function () {
		return local_storage_helper.get('data') ?? [];
	},
	stage: function (messageId, data) {
		local_storage_helper.set('msg_' + messageId, data);
	},
	stash: {
		append: function (data) {
			var stash = local_storage_helper.get('stash') ?? {};
			local_storage_helper.set('stash', Object.assign(stash, data));
		},
		get: function () {
			return local_storage_helper.get('stash');
		},
		clear: function () {
			var stash = local_storage_helper.get('stash');
			local_storage_helper.remove('stash');
			return stash;
		}
	},
	commit: function (messageId) {
		const data = local_storage_helper.get('msg_' + messageId);
		const result = this.append(data, '_id');
		local_storage_helper.remove('msg_' + messageId);
		return result;
	},
	clearStaged: function () {
		var staged = [];

		local_storage_helper.keys().forEach(k => {
			if (k.startsWith('msg_')) {
				staged.push(local_storage_helper.get(k));
				local_storage_helper.remove(k);
			}
		});

		var localData = this.get();
		if (localData && localData.length > 0) {
			staged = staged.filter(stagedElement => {
				var item = { ...stagedElement };
				delete item.messageId;
				delete item.commitSession;
				delete item.isDialogOn;
				var localDataElement = (!!item['localSessionId']) ? localData.find(i => i['localSessionId'] == item['localSessionId']) : undefined;
				if (localDataElement !== undefined) {
					var containedInLocalData = !(Object.keys(item).every((k) => Object.keys(localDataElement).indexOf(k) > -1
						&& (localDataElement[k] === item[k] || JSON.stringify(localDataElement[k]) === JSON.stringify(item[k]))));
					return containedInLocalData;
				} else {
					return true
				}
			})
		}

		staged.sort((a, b) => {
			if (a.messageId < b.messageId) return -1
			if (a.messageId > b.messageId) return 1
			return 0
		})

		var stagedByIds = staged.reduce(function (byIds, msg) {
			byIds[msg.localSessionId] = byIds[msg.localSessionId] || [];
			byIds[msg.localSessionId].push(msg);
			return byIds;
		}, {});

		var newMissedMsgs = Object.values(stagedByIds).map(g => Object.assign({}, ...g));

		var missed = local_storage_helper.get('missed');
		missed = missed || [];
		missed.push(...newMissedMsgs);

		local_storage_helper.set('missed', missed);

		newMissedMsgs.forEach(m => {
			if (!!m._id)
				this.append(m, '_id')
			else
				this.append(m, 'localSessionId')

		});
	},
	append: function (item, key) {
		if (!item)
			return;

		var localData = this.get();
		if (localData && localData.length > 0) {
			var element = (!!item[key]) ? localData.find(i => i[key] == item[key]) : undefined;
			if (!!element) {
				Object.assign(element, item);
			} else {
				localData.push(item);
				// This lines were added to follow locally stored data points at each moment.
				subject_data_worker.postMessage({ n_localDataPoints: localData.length });
			}
			// Added to minimize data saved locally:
			if (!!item['resetContainer'] && !!item['uniqueEntryID'] && !!item['day'] && item['day'] > 1 && // if there is a resetContainet (i.e., first daily trial) and uniqueID and a day in the item to save and it is not the first day
				localData.map(el => el['day']).filter(el => el === (item['day'] - 1)).length > app_settings.minDailyDataPointsToStoreLocally) {// get the number of entries on the day before
				// remove locally kept data from the previous day
				localData = this.minimizeSelectedDayDataPoints(localData, item['day'] - 1)

				subject_data_worker.postMessage({ n_localDataPoints: localData.length }); // update the nummber of locally stored data points.
			}
		} else {
			localData.push(item);
		}

		this.set(localData);
		return localData;
	},
	set: function (data) {
		local_storage_helper.set('data', data);
	},
	isAvailable: function () {
		return !!local_storage_helper.get('data') && !!local_storage_helper.get('data').length;
	},
	resendMissed: function () {
		var missed = local_storage_helper.get('missed');

		if (!missed || missed.length == 0)
			return;

		var url = data_helper.base_address + '/app/api/session?subId=' + data_helper.get_subject_id() + '&context=' + app_settings.context;
		ajax_helper.post(url, missed).then(result => {
			if (result.nModified + result.nInserted == missed.length) {
				local_storage_helper.set('missed', []);
			}
		}).catch(console.log);
	},
	minimizeSelectedDayDataPoints: function (data, day) {
		try {
			// items to remove according to min daily points defined to keep localy (in minDailyDataPointsToStoreLocall):
			let thisDayIndicesToRemove = data.map(el => el['day']).multiIndexOf(day).slice(app_settings.minDailyDataPointsToStoreLocally)

			// check if there was a manipulation this day (and if there was, get the first index with manipulation confirmation time):
			let thisDayFirstIndexWithManipulationConfirmationTime; // if doesn't exist has to be null for the Math.max below to work;
			if (!!data.filter(el => el['day'] === (day))[0]['manipulationToday']) { // check if there was a manipulation yesterday
				thisDayFirstIndexWithManipulationConfirmationTime = data.map(el => el['day'] === (day) && !!el['manipulationConfirmationTime']).multiIndexOf(true)[0];
			}
			if (!thisDayFirstIndexWithManipulationConfirmationTime) { thisDayFirstIndexWithManipulationConfirmationTime = null } // if doesn't exist has to be null for the Math.max below to work

			// get the first trial with endTime - to keep it in (the rare) case that the minDailyDataPointsToStoreLocall do not include trials with endTime:
			let thisvDayFirstIndexWithEndTime = data.map(el => el['day'] === (day) && !!el['endTime']).multiIndexOf(true)[0]
			if (!thisvDayFirstIndexWithEndTime) { thisvDayFirstIndexWithEndTime = null } // if doesn't exist has to be null for the Math.max below to work

			// calculate the first and last indices to remove
			firstIndexToRemove = Math.max(thisDayIndicesToRemove[0], thisDayFirstIndexWithManipulationConfirmationTime + 1, thisvDayFirstIndexWithEndTime + 1)
			n_items_ToRemove = thisDayIndicesToRemove.filter(val => val >= firstIndexToRemove).length
			// Cut the data before saving
			data.splice(firstIndexToRemove, n_items_ToRemove)
			return data

		} catch (error) {
			console.error(error);
			return data
		}
	}
}

var local_storage_helper = {
	set: function (id, data) {
		return localStorage.setItem(data_helper.get_subject_id() + '_' + app_settings.context + '_' + id, JSON.stringify(data));
	},
	get: function (id) {
		const val = localStorage.getItem(data_helper.get_subject_id() + '_' + app_settings.context + '_' + id);
		return val ? JSON.parse(val) : val;
	},
	keys: function () {
		var keys = [];
		const subIdString = data_helper.get_subject_id() + '_' + app_settings.context + '_';

		for (var i = 0; i < localStorage.length; i++) {
			if (localStorage.key(i).includes(subIdString))
				keys.push(localStorage.key(i).replace(subIdString, ''));
		}
		return keys;
	},
	remove: function (id) {
		return localStorage.removeItem(data_helper.get_subject_id() + '_' + app_settings.context + '_' + id);
	}
}

// Make the function wait until the connection is made...
function waitForSocketConnection(socket, callback) {
	setTimeout(
		function () {
			if (socket.readyState === 1) {
				console.log("Connection is made")
				if (callback != null) {
					callback();
				}
			} else {
				console.log("wait for connection...")
				waitForSocketConnection(socket, callback);
			}

		}, 5); // wait 5 milisecond for the connection...
}


// ***************************************************************
//                 Additional helper functions:
// ---------------------------------------------------------------

function dateDiff(date1, date2, experimentalDayStartingHour = 0) {
	const adjustingTime = 1000 * 60 * 60 * experimentalDayStartingHour;

	date1 = new Date(date1 - adjustingTime)
	date2 = new Date(date2 - adjustingTime)

	date1.setHours(0, 0, 0, 0);
	date2.setHours(0, 0, 0, 0);
	const diffTime = Math.abs(date2 - date1);
	const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
	return diffDays;
}

function wait(delay) {
	return new Promise(function (resolve) {
		setTimeout(resolve, delay);
	});
}

function delay(delay) {
	return wait(delay);
}

Array.prototype.multiIndexOf = function (el) {
	var idxs = [];
	for (var i = this.length - 1; i >= 0; i--) {
		if (this[i] === el) {
			idxs.unshift(i);
		}
	}
	return idxs;
};

Array.prototype.toDict = function (field) {
	return this.reduce((d, el) => {
		//d[el[field]] = el;
		d[el[field]] = Object.assign({}, d[el[field]], el, { ...d[el[field]] });
		return d;
	}, {})
};

function shuffle(a) {
	for (let i = a.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[a[i], a[j]] = [a[j], a[i]];
	}
	return a;
}

// A function to sort with indices I got from: https://stackoverflow.com/questions/3730510/javascript-sort-array-and-return-an-array-of-indicies-that-indicates-the-positi
function sortWithIndices(toSort) {
	for (var i = 0; i < toSort.length; i++) {
		toSort[i] = [toSort[i], i];
	}
	toSort.sort(function (left, right) {
		return left[0] < right[0] ? -1 : 1;
	});
	toSort.sortIndices = [];
	for (var j = 0; j < toSort.length; j++) {
		toSort.sortIndices.push(toSort[j][1]);
		toSort[j] = toSort[j][0];
	}
	return toSort;
}

// load the frames in case they are not already there:
function loadLotteryFrames(totalFrames) {
	if (!document.getElementById('lottery-1')) {
		for (var i = 1; i < totalFrames + 1; i++) {
			var elem = document.createElement('img');
			elem.setAttribute('id', 'lottery-' + i)
			elem.setAttribute('class', 'waiting_for_outcome_gif')
			elem.setAttribute('src', "images/lottery/image" + i + ".png")
			document.getElementById('lottery').appendChild(elem);
		}
	}
}

function runLottery(timePerFrame, totalFrames, identifier) {
	x = new Date()
	dom_helper.show('lottery')
	document.getElementById('lottery-1').style.opacity = 1
	let frameNumber = 1;
	var runAnimation = setInterval(() => {
		frameNumber++;
		if (frameNumber > totalFrames || identifiersToClean.includes(identifier)) { // The second one is for case of pseudo refresh.
			document.getElementById('lottery-' + (frameNumber - 1)).style.opacity = 0;
			clearInterval(runAnimation)
			if (identifiersToClean.includes(identifier)) { appRunning = false };
			return
		} else {
			document.getElementById('lottery-' + (frameNumber - 1)).style.opacity = 0;
			document.getElementById('lottery-' + frameNumber).style.opacity = 1;
		}
	}, timePerFrame)
}

var ajax_helper = {
	get: function (url) {
		return this.request("GET", url);
	},
	post: function (url, payload) {
		return this.request("POST", url, payload);
	},
	request: function (method, url, payload) {
		return new Promise(function (resolve, reject) {
			let xhr = new XMLHttpRequest();

			xhr.open(method, url);
			xhr.responseType = "json";

			xhr.onload = function () {
				if (this.status >= 200 && this.status < 300) {
					resolve(xhr.response);
				} else {
					reject({
						status: this.status,
						statusText: xhr.statusText
					});
				}
			};

			xhr.onerror = function () {
				reject({
					status: this.status,
					statusText: xhr.statusText
				});
			};
			xhr.ontimeout = function (e) { reject(e); };
			xhr.onabort = function (e) { reject(e); };

			if (!!payload) {
				xhr.setRequestHeader('Content-Type', 'application/json')
				xhr.send(JSON.stringify(payload));
			}
			else
				xhr.send();
		});
	}
};

// Used by app.js and coin_collection.js:
function finishTrial(runData) {
	// show goodbye message:
	dom_helper.add_css_class('welcome_msg', 'goodByeMessage'); // **
	dom_helper.add_css_class('welcome_msg_txt', 'goodByeMessageTextSize'); // **
	if (runData.giveFeedbackOnDevaluedOutcome) {
		dom_helper.set_text('welcome_msg_txt', "<span style='color: red;'>A reminder:<br>The warehouse is full and cannot store more gold today.</span><br><br>See you next time"); //**
	} else {
		dom_helper.set_text('welcome_msg_txt', "See you next time"); //**
	}
	dom_helper.show('welcome_msg'); // **

	// collect end time and save subject data as results:
	var dataToSend = { endTime: new Date(), visibilityStateOnEndTime: document.visibilityState, commitSession: true };
	if (runData.isDemo) {
		dataToSend.broadcast = 'demo_trial_ended';
	}

	subject_data_worker.postMessage(dataToSend);

	data_helper.wait_for_server(2000).then(function () { console.log('All data received at server [initiated by the finishTrial function]'); appRunning = false });

	console.log('Trial Completed')
	onUserExit('trial_completed')
}

var dialog_helper = {
	makeid: function (length) { // adapted to generate random strings from : https://stackoverflow.com/questions/1349404/generate-random-string-characters-in-javascript
		var result = '';
		var characters = 'bcdfghjklmnpqrstvwxyz'; // I left only small letters and removed AEIOU letters to prevent word formation.
		var charactersLength = characters.length;
		for (var i = 0; i < length; i++) {
			result += characters.charAt(Math.floor(Math.random() * charactersLength));
		}
		return result;
	},
	random_code_confirmation: function (msg, img_id = '', delayBeforeClosing = 0, resolveOnlyAfterDelayBeforeClosing = false, preventFeedBack = false) { // returns promise
		return this.show(msg, img_id, this.makeid(3), delayBeforeClosing, resolveOnlyAfterDelayBeforeClosing, preventFeedBack);
	},
	warehouse_state_query: function (msg, img_id = '', confirmation_options = [], delayBeforeClosing = 0, resolveOnlyAfterDelayBeforeClosing = false, preventFeedBack = false) { // returns promise
		return this.show(msg, img_id, confirmation_options, delayBeforeClosing, resolveOnlyAfterDelayBeforeClosing, preventFeedBack);
	},
	show: function (msg, img_id = '', confirmation = '', delayBeforeClosing = 0, resolveOnlyAfterDelayBeforeClosing = false, preventFeedBack = false) { // returns promise
		appRunning = false;
		return new Promise(function (resolve) {
			if (Array.isArray(confirmation) && confirmation.length > 1) { // for the warehouse state
				// prompt to type one of the options in confirmation:
				dom_helper.set_text("dialog_confirmation_msg", "Type here one of the following '" + confirmation.join("', '") + "'.");
				dom_helper.show("dialog_confirmation_msg")
				dom_helper.show("dialog_response_text");
				dom_helper.disable("dialog_ok_button");
				document.getElementById('dialog_response_text').oninput = function () {
					// check wrote one of the available options:
					if (confirmation.includes(document.getElementById('dialog_response_text').value.toLowerCase())) {
						dom_helper.enable("dialog_ok_button");
					}
				}
			} else if (!!confirmation) { // for a random code
				dom_helper.set_text("dialog_confirmation_msg", 'To continue type ' + "'" + confirmation + "'" + '.');
				dom_helper.show("dialog_confirmation_msg")
				dom_helper.show("dialog_response_text");
				dom_helper.disable("dialog_ok_button");
				document.getElementById('dialog_response_text').oninput = function () {
					if (document.getElementById('dialog_response_text').value.toLowerCase() == confirmation) {
						dom_helper.enable("dialog_ok_button");
					}
				}
			} else if (preventFeedBack) {
				dom_helper.hide("dialog_response_text");
				dom_helper.hide("dialog_ok_button")
			} else {
				dom_helper.hide("dialog_response_text");
				dom_helper.enable("dialog_ok_button")
			}

			if (!!img_id) {
				dom_helper.show(img_id);
			}

			dom_helper.set_text("dialog_msg", msg);
			dom_helper.show("screen-disabled-mask");
			dom_helper.show('dialog_box');

			subject_data_worker.postMessage({ isDialogOn: true });

			if (preventFeedBack) { resolve() }

			document.getElementById('dialog_ok_button').onclick = function () {
				document.getElementById('dialog_ok_button').onclick = undefined;
				document.getElementById('dialog_response_text').oninput = undefined;

				setTimeout(() => {
					if (!!img_id) {
						dom_helper.hide(img_id);
					}
					dom_helper.hide('dialog_box');
					dom_helper.hide("screen-disabled-mask");

					document.getElementById("dialog_response_text").value = ''; // clean the text box (good for if a new text box is following)

					subject_data_worker.postMessage({ isDialogOn: false });

					if (resolveOnlyAfterDelayBeforeClosing) { // needed to make consecutive dialog boxes work sometimes
						resolve();
						appRunning = true;
					}
				}, delayBeforeClosing)
				if (!resolveOnlyAfterDelayBeforeClosing) { // needed to make consecutive dialog boxes work sometimes
					resolve();
					appRunning = true;
				}
			}
		});
	}
}

// SERVICE WORKER CALLING
if ('serviceWorker' in navigator) {
	window.addEventListener('load', () => {
		navigator.serviceWorker
			.register('sw.js')
			.then(reg => {
				console.log('Service Worker: Registered')
				swRegObject = reg // Extract a global variable of the registered service worker (to chekc for updates on each trial.
				reg.addEventListener('updatefound', () => {
					console.log('Service Worker: UPDATE FOUND')
					subject_data_worker.postMessage({ newServiceWorkerDetected: new Date, commitSession: true });

					const newWorker = reg.installing;

					newWorker.state;
					// "installing" - the install event has fired, but not yet complete
					// "installed"  - install complete
					// "activating" - the activate event has fired, but not yet complete
					// "activated"  - fully active
					// "redundant"  - discarded. Either failed install, or it's been
					//                replaced by a newer version

					newWorker.addEventListener('statechange', () => {
						console.log('Service Worker: STATE CHANGED')
						console.log(newWorker.state)
						// newWorker.state has changed
					});
				});
			})
			.catch(err => console.log(`Service Worker: Error: ${err}`))
	})
}

function clearCacheAndReload() {
	caches.keys().then(cacheNames => {
		return Promise.all(
			cacheNames.map(cache => {
				console.log('Service Worker: Clearing Old Cache');
				return caches.delete(cache);
			})
		);
	}).then(window.location.reload())
}

// Identify and indicate that a new service worker has been installed (to then handle the necessary refresh for subsequent trial [if it's a trial without full app reload]))
// ------------------------------------------------------------------
// Define a global var to be used in the app.js file (but should be initiated once every app full reload)
reloadDueToNew_sw_installed = false;
// detect controller change and refresh the page
if ('serviceWorker' in navigator) {
	console.log('Service Worker: Listening to controllerchange');
	navigator.serviceWorker.addEventListener('controllerchange', () => {
		console.log('Service Worker: Controller change detected. WILL RELOAD PAGE ON NEXT TRIAL!');
		reloadDueToNew_sw_installed = true;
	})
}
