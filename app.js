async function runApp() {
	appRunning = true; // used to determine whther a new session can start
	clearTimeout(checkIfAppStartedRunning) // Stop checking (through the index.html that app started running on the first time)
	// ****************************************************************
	//           SET & INITIALIZE STUFF:
	// ----------------------------------------------------------------
	var startTime = new Date(); // Get time of entry:

	// log the app entry time immeditaly to stash
	var stash = offline_data_manager.stash.get() || {};
	if (!stash.appLoadTimes) {
		offline_data_manager.stash.append({ appLoadTimes: [startTime] });
	} else {
		stash.appLoadTimes.push(startTime);
		offline_data_manager.stash.append({ appLoadTimes: stash.appLoadTimes })
	}

	if (document.visibilityState !== 'visible') { return } // Stop if from some reason initiated when app is not visible

	// check if implemented as PWA and handle accordingly:
	// ********************************************************
	if (typeof isPWA === 'undefined') { isPWA = await checkAndHandlePWA() };
	if (!isPWA) { return }
	// ********************************************************

	// Check and Handle service worker updates (the methods will cause a full implementatin of the changes on the 2nd trial following the change in code):
	// ********************************************************
	if (!!reloadDueToNew_sw_installed) { window.location.reload(); return } // reload if service worker was updated ():
	if (typeof swRegObject !== 'undefined') { console.log('Service Worker: checkig for update'); swRegObject.update(); }; // check for update in sw if it's not the first trial after app (full) reload (in app full reload it is anyway set to check for new updates)
	// ********************************************************

	// make sure all images were appropriately loaded:
	// ********************************************************
	await Promise.all(Array.from(document.images).filter(img => !img.complete).map(img => new Promise(resolve => { img.onload = resolve; }))).then(() => {
		console.log('images finished loading');
	});
	if (!!Array.from(document.images).filter(img => img.id !== "installation_guide" && img.naturalHeight === 0).length) { // check that all images were successfully loaded - detects if there was an error in loading an image
		console.log('Problem in image loading');

		// log problem with image loading to stash
		if (!stash.imgLoadingProblem) {
			offline_data_manager.stash.append({ imgLoadingProblem: [new Date()] });
		} else {
			stash.imgLoadingProblem.push(new Date());
			offline_data_manager.stash.append({ imgLoadingProblem: stash.imgLoadingProblem })
		}

		// reload page after unregistering service worker and
		navigator.serviceWorker.getRegistration().then(function (reg) {
			if (reg) {
				reg.unregister().then(function () { clearCacheAndReload() });
			} else {
				clearCacheAndReload()
			}
		});
		return
	}
	// ********************************************************
	dom_helper.show('main_container')

	// Define variables used to prevent two instances of the app running in simultaniously when reloading
	let identifier = startTime.getTime(); // local within this instance
	recordIdentifier = identifier; // global to communicate with the handle_events.js file

	var settings = Object.assign({}, app_settings);

	// create new session with server only after logic is called! (important for demo to work)
	const sessionPrefix = 'app';
	data_helper.init_session(sessionPrefix, false);

	// get subject data from batch session
	var checkLoading = setTimeout(() => {
		console.log('data not loading... RELOADING page')
		location.reload()
	}, 10000)
	var timer = new Date();
	try {
		do {
			if (new Date() - timer < 5000) { // In case the data is taken before saving was completed from last session it will try for 5 seconds to get the data again and check that it's fine (measured by having a uniqueEntryID).
				var subData = await data_helper.get_subject_data(true).catch(function (e) {
					console.log('error getting subject data');
					console.log(e);
				});
			} else if (new Date() - timer < 7000) {
				try {
					Object.keys(subData).forEach(function (key) { // After 5 seconds in case there still no good data from what supposedly was the last run, it is probabale that a problem occured or that no data had the chance to be normally saved and the last "trial/s" will be removed.
						subData[key] = subData[key].slice(0, subData[key].length - 1);
					});
				} catch (err) {
					console.log(err)
					location.reload()
					return
				}
			} else {
				location.reload()
				return
			}
		} while (subData.uniqueEntryID.length > 1 && !subData.uniqueEntryID[subData.uniqueEntryID.length - 1])
	} catch (err) {
		console.log(err)
		await dialog_helper.show(settings.text.loadingDataError, img_id = '', confirmation = '', delayBeforeClosing = 0, resolveOnlyAfterDelayBeforeClosing = false, preventFeedBack = true);
		return;
	}
	clearTimeout(checkLoading)

	// calculate run parameters
	var runData = logic.initialize(subData, settings);

	// try to resend missed messages again - this does not block execution
	offline_data_manager.resendMissed();

	// Giving a unique entry ID (should be assigned only once on each entry). Creating it as a global variable:
	if (!subData.uniqueEntryID[subData.uniqueEntryID.length - 1]) {// should be assigned once every entry
		uniqueEntryID = 1;
	} else {
		uniqueEntryID = subData.uniqueEntryID[subData.uniqueEntryID.length - 1] + 1;
	}

	// when we have uniqueEntryID, append stashed information to current sessionName
	data_helper.appendStashedData();

	// Save the data and refer to instructions if relevant:
	if (runData.showInstructions) {
		subject_data_worker.postMessage({ ...runData, startInstructionsTime: startTime, dataLoadingTime: (new Date) - startTime, visibilityStateOnFirstDataSaving: document.visibilityState, commitSession: true });
		appRunning = false
		// create instructions iframe:
		var instructionsUrl = "instructions.html" + location.search;
		instructionsElement = document.createElement('iframe');
		instructionsElement.setAttribute("id", 'instructions_iframe')
		instructionsElement.setAttribute("src", instructionsUrl)
		document.body.appendChild(instructionsElement)
		return;
	} else {
		subject_data_worker.postMessage({ ...runData, startTime: startTime, dataLoadingTime: (new Date) - startTime, commitSession: true });
	}

	// assign animation times according to settings:
	document.getElementById('cost_indicator_1_').style.animationDuration = String(settings.durations.costAnim / 1000) + 's'
	document.getElementById('outcome_win').style.animationDuration = String(settings.durations.outcomeAnim / 1000) + 's'
	document.getElementById('outcome_loss').style.animationDuration = String(settings.durations.outcomeAnim / 1000) + 's'
	document.getElementById('outcome_no_win').style.animationDuration = String(settings.durations.outcomeAnim / 1000) + 's'
	document.getElementById('outcome_text_1_').style.animationDuration = String(settings.durations.outcomeAnim / 1000) + 's'
	document.getElementById('superimposed_outcome_sum').style.animationDuration = String(settings.durations.outcomeAnim / 1000) + 's'
	document.getElementById('lottery').style.animationDuration = String(settings.durations.lotteryAnim / 1000) + 's'  // add animation duration

	// ****************************************************************
	//           RUN THE APP
	// ----------------------------------------------------------------
	if (runData.isDemo) {
		await delay(500); // to account for time it takes the embedded app to be openned.
	}

	dom_helper.hide('app_will_load_soon');
	dom_helper.hide('loading_animation');

	if (runData.isFirstTime) { // a message that the real game begins (after instruction [and demo if relevant])
		subject_data_worker.postMessage({ realGameBeginsAlertTime: new Date() })
		await dialog_helper.show(settings.text.realGameBegins, img_id = 'game_begins_image');
		subject_data_worker.postMessage({ realGameBeginsConfirmationTime: new Date() })
	}
	// reset the container at the beginning of the day:
	else if (runData.resetContainer) { // activating reseting container when relevant. **
		subject_data_worker.postMessage({ resetContainerAlertTime: new Date() })
		await dialog_helper.show(settings.text.rewardContainerClearingMessage, img_id = 'warehouse_empty');
		subject_data_worker.postMessage({ resetContainerConfirmationTime: new Date() })
	}

	// cover the outcome:
	if (runData.hideOutcome) {
		dom_helper.show("cover");
	}

	// show cost on top right corner if needed [At entrance]
	if (!!logic.getCost(runData, settings, logic.cost_on.entrance)) {
		var indicator_id = dom_helper.duplicate('cost_indicator_1_');
		dom_helper.set_text(indicator_id, "-" + logic.getCost(runData, settings, logic.cost_on.entrance));
		dom_helper.show(indicator_id);
		setTimeout(() => {
			if (identifiersToClean.includes(identifier)) { appRunning = false; return }; // Stop running the function if the app is reloaded (and thus a new instance started)
			dom_helper.hide(indicator_id)
		}, settings.durations.costAnim)
	}

	//show spacechip landing animation:
	dom_helper.show('spaceship');

	// define top & bottom click operations
	var lowerHalfClicked = false;

	var p1 = new Promise((resolve, reject) => {
		document.getElementById('lower_half').onclick = function () {
			if (!lowerHalfClicked) {
				dom_helper.remove_css_class('lower_half', 'blinkable');

				subject_data_worker.postMessage({ press1Time: new Date(), visibilityStatePress1: document.visibilityState });

				// show cost on top right corner if needed [After 1st click]
				if (!!logic.getCost(runData, settings, logic.cost_on.click1)) {
					var indicator_id = dom_helper.duplicate('cost_indicator_1_');
					dom_helper.set_text(indicator_id, "-" + logic.getCost(runData, settings, logic.cost_on.click1));
					dom_helper.show(indicator_id);
					setTimeout(() => {
						if (identifiersToClean.includes(identifier)) { appRunning = false; return }; // Stop running the function if the app is reloaded (and thus a new instance started)
						dom_helper.hide(indicator_id)
					}, settings.durations.costAnim)
				}

				document.getElementById('ice_lower').style.animationDuration = String(settings.durations.surface_disappearance / 1000) + 's'
				document.getElementById('ice_lower').style.animationName = "ice_breaking";

				dom_helper.add_css_class('upper_half', 'blinkable');
				lowerHalfClicked = true;
				resolve();
			}
		}
	});

	var p2 = new Promise((resolve, reject) => {
		document.getElementById('upper_half').onclick = function () {
			if (lowerHalfClicked) {
				dom_helper.remove_css_class('upper_half', 'blinkable');

				subject_data_worker.postMessage({ press2Time: new Date(), visibilityStatePress2: document.visibilityState });

				// show cost on top right corner if needed [After 2nd click]
				if (!!logic.getCost(runData, settings, logic.cost_on.click2)) {
					var indicator_id = dom_helper.duplicate('cost_indicator_1_');
					dom_helper.set_text(indicator_id, "-" + logic.getCost(runData, settings, logic.cost_on.click2));
					dom_helper.show(indicator_id);
					setTimeout(() => {
						if (identifiersToClean.includes(identifier)) { appRunning = false; return }; // Stop running the function if the app is reloaded (and thus a new instance started)
						dom_helper.hide(indicator_id)
					}, settings.durations.costAnim)
				}

				document.getElementById('ice_upper').style.animationDuration = String(settings.durations.surface_disappearance / 1000) + 's'
				document.getElementById('ice_upper').style.animationName = "ice_breaking"

				resolve();
			}
		}
	});

	// load the lottery animation frames (during the spaceship animation)
	loadLotteryFrames(settings.lottery_N_frames)

	// hide entrance graphics and sequence pressing inteface
	await delay(settings.durations.entranceMessage);
	if (identifiersToClean.includes(identifier)) { appRunning = false; return }; // Stop running the function if the app is reloaded (and thus a new instance started)
	dom_helper.hide("spaceship");
	dom_helper.show("upper_half");
	dom_helper.show("lower_half");

	// For the flow of the demo:
	if (runData.isDemo) {
		subject_data_worker.postMessage({ broadcast: 'sequence_entering_stage_presented' });
	}

	// wait for 2 clicks to happen
	appRunning = false;
	await Promise.all([p1, p2]);
	appRunning = true;

	// hide sequence pressing inteface and show lottery animation
	document.getElementById('lower_half').onclick = undefined;
	document.getElementById('upper_half').onclick = undefined;

	dom_helper.hide("upper_half");
	dom_helper.hide("lower_half");

	if (identifiersToClean.includes(identifier)) { appRunning = false; return }; // Stop running the function if the app is reloaded (and thus a new instance started)

	runLottery(settings.durations.lotteryAnim / settings.lottery_N_frames, settings.lottery_N_frames, identifier);

	if (identifiersToClean.includes(identifier)) { appRunning = false; return }; // Stop running the function if the app is reloaded (and thus a new instance started)

	// wait until gif animation is finished
	await delay(settings.durations.intervalBetweenLotteryAndOutcomeAnim);
	setTimeout(() => {
		if (identifiersToClean.includes(identifier)) { appRunning = false; return }; // Stop running the function if the app is reloaded (and thus a new instance started)
	}, settings.durations.lotteryAnim - settings.durations.intervalBetweenLotteryAndOutcomeAnim);

	if (identifiersToClean.includes(identifier)) { appRunning = false; return }; // Stop running the function if the app is reloaded (and thus a new instance started)

	if (runData.endExperiment) { // a message that game has ended (after the lottery gif for now, so I can assess multiple entries after completion)
		// get data again to verify it was updated on the server on this run
		var updatedSubData = await data_helper.get_subject_data(true).catch(function (e) {
			console.log('error getting subject data');
			console.log(e);
		});
		if (new Date(updatedSubData.startTime[updatedSubData.startTime.length - 1]).getTime() === startTime.getTime()) { // making sure the data was sent to the server by comparing the start times.
			subject_data_worker.postMessage({ endExperimentAlertTime: new Date() })
			await dialog_helper.show(settings.text.endExperiment(runData.baselineAccumulatedReward), img_id = '', confirmation = '', delayBeforeClosing = 0, resolveOnlyAfterDelayBeforeClosing = false, preventFeedBack = true);
		} else { // if there is no connection to the server:
			subject_data_worker.postMessage({ noConnectionToendExperimentAlertTime: new Date() })
			await dialog_helper.show(settings.text.noConnectionToEndExperiment, img_id = '', confirmation = '', delayBeforeClosing = 0, resolveOnlyAfterDelayBeforeClosing = false, preventFeedBack = true);
		}
		return;
	}

	if (!runData.hideOutcome) { // presenting the outcome:
		if (runData.isWin) {
			var outcomeText = "You found " + runData.reward + " gold units"
			var outcomeElementID = 'outcome_win'
		} else if (runData.isLoss) {
			var outcomeText = "You lost " + runData.reward + " gold units"
			var outcomeElementID = 'outcome_loss'
		} else {
			var outcomeText = "No gold this time"
			var outcomeElementID = 'outcome_no_win'
		}

		// show outcome:
		dom_helper.show(outcomeElementID);
		dom_helper.add_css_class(outcomeElementID, 'goUpOutcomeImage');

		// add a superimposed text on the outcome:
		dom_helper.set_text('superimposed_outcome_sum_txt', runData.reward);
		dom_helper.show('superimposed_outcome_sum');
		dom_helper.add_css_class('superimposed_outcome_sum', 'goUpOutcomeImage');

		// add text about the outcome below the outcome image:
		dom_helper.set_text('outcome_text_1_', outcomeText);
		dom_helper.show("outcome_text_1_");
		dom_helper.add_css_class('outcome_text_1_', 'appearSlowlyOutcomeText');
	}

	// get time of outcome presentation: **
	subject_data_worker.postMessage({ outcomeTime: new Date() });

	if (identifiersToClean.includes(identifier)) { appRunning = false; return }; // Stop running the function if the app is reloaded (and thus a new instance started)


	// show winning/loosing message for 2 seconds
	await delay(settings.durations.intervalBetweenOutcomeAndNextThing);

	//
	if (identifiersToClean.includes(identifier)) { appRunning = false; return }; // Stop running the function if the app is reloaded (and thus a new instance started)
	//

	// handle manipulations:
	var manipulationOption = logic.isManipulation(runData, settings); // Check if and which manipulation
	if (manipulationOption) { // activate manipulation notification:
		subject_data_worker.postMessage({ manipulationAlertTime: new Date() })

		// recored the time passed since presentation and if the app is open (made to decide if to include if there is no confirmation time):
		let manipulationConfirmed = false
		let timeFromManipulationMessage = 0
		var timeRecorder = setInterval(() => {
			if (identifiersToClean.includes(identifier)) { appRunning = false; return }; // Stop running the function if the app is reloaded (and thus a new instance started)
			if (!manipulationConfirmed) { // if manipulation w not confirmed yet but the process is in action
				timeFromManipulationMessage += settings.msToRecordTimeSinceManipulationActivation
				subject_data_worker.postMessage({ recordedTimePassedFromManipulaitonAlert_in_ms: timeFromManipulationMessage })
			} else {
				clearInterval(timeRecorder) // stop the timeRecorder
			} // Stop running the function if the app is reloaded (and thus a new instance started)
		}, settings.msToRecordTimeSinceManipulationActivation);

		await dialog_helper.random_code_confirmation(msg = settings.text.manipulationMessage(manipulationOption), img_id = settings.manipulationImageID(manipulationOption), delayBeforeClosing = 0, resolveOnlyAfterDelayBeforeClosing = true);
		subject_data_worker.postMessage({ manipulationConfirmationTime: new Date() })
		manipulationConfirmed = true
	}

	// activate consumption test:
	if (runData.consumptionTest) { // If there is no data yet (hold for both cases where demo is used or not)
		if (manipulationOption) { await delay(300) } // create a small interval between dialog boxes if they appear one after the other.
		if (identifiersToClean.includes(identifier)) { appRunning = false; return }; // Stop running the function if the app is reloaded (and thus a new instance started)
		subject_data_worker.postMessage({ manipCheckAlertTime: new Date() })
		if (settings.use_warehouse_state_query) {
			await dialog_helper.warehouse_state_query(msg = settings.text.dialog_warehouseStateQuery, img_id = '', confirmation_options = settings.text.dialog_warehouseStateQuery_allowed_answers, delayBeforeClosing = 0, resolveOnlyAfterDelayBeforeClosing = false);
		} else {
			await dialog_helper.random_code_confirmation(msg = settings.text.dialog_coinCollection, img_id = 'cave', delayBeforeClosing = 2000, resolveOnlyAfterDelayBeforeClosing = false); // ** The coins task will run through the helper ** show message about the going to the coin collection task
		}
		subject_data_worker.postMessage({ manipChecConfirmationTime: new Date() })
		if (settings.use_warehouse_state_query) {
			finishTrial(runData)
		} else {
			run_coin_collection(settings.coinCollectionTask, runData, identifier);
		}
	} else {
		finishTrial(runData)
	}
};
