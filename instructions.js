// ****************************************************************
//                           FUNCTIONS:
// ----------------------------------------------------------------
// load the frames in case they are not already there:
async function preloadInstructionImages(totalPages = settings.n_instruction_pages) {
	// load the instructions pages
	for (var i = 1; i < totalPages + 1; i++) {
		var elem = document.createElement('img');
		elem.setAttribute('id', 'instructionImage-' + i)
		elem.setAttribute('class', 'full_bg_image hidden')
		elem.setAttribute('src', "images/instructions/instructions_" + i + ".jpg")
		document.body.appendChild(elem);
	}
	// load the image used in the finish slide
	elem2 = document.createElement('img');
	elem2.setAttribute('class', 'hidden')
	elem2.setAttribute('src', "images/game_title_image.jpg")
	document.body.appendChild(elem2);
	// load the icon of the demo app icon element:
	elem3 = document.createElement('img');
	elem3.setAttribute("class", "hidden");
	elem3.setAttribute("src", "icons/android-icon-72x72.png");
	document.body.appendChild(elem3);
	// load the spaceship image (preventing a sometimes smaller apperance of it in the embedded demo):
	elem4 = document.createElement('img');
	elem4.setAttribute("class", "hidden");
	elem4.setAttribute("src", "images/spaceship_flying.png");
	document.body.appendChild(elem4);

	// make sure all images were appropriately loaded:
	// ********************************************************
	jsPsych.pauseExperiment();
	await Promise.all(Array.from(document.images).filter(img => !img.complete).map(img => new Promise(resolve => { img.onload = resolve; }))).then(() => {
		console.log('images finished loading');
		jsPsych.resumeExperiment();
	});
	if (!!Array.from(document.images).filter(img => img.id !== "installation_guide" && img.naturalHeight === 0).length) { // check that all images were successfully loaded - detects if there was an error in loading an image
		console.log('Problem in image loading');
		alert('There was a problem loading. Try closing the app completely and reopening it.')
		return
	}
};

var check_consent = function (elem) {
	if (document.getElementById('consent_checkbox').checked) {
		return true;
	}
	else {
		alert("If you wish to participate, check the box next to 'I agree to participate in this study.'");
		return false;
	}
	return false;
};

async function exitAppDemo(appDemoID) {
	console.log('Exit THE APP')
	dom_helper.remove_css_class(appDemoID, 'appOpen');
	dom_helper.add_css_class(appDemoID, 'appClose');
	wait(1000).then(() => dom_helper.hide(appDemoID));

	if (firstPressOnExitButton) {
		previousDemoTrialNum += 1;
		firstPressOnExitButton = false;
	}

	// check if demo cycle is finished:
	if (previousDemoTrialNum % Object.keys(settings.demoCycle).length === (Object.keys(settings.demoCycle).length - 1)) { // checking that this is the last trial in the demo cycle;
		dom_helper.removeElement(mainDemoTextDuplicateID) // remove demo text
		mainDemoTextDuplicateID = "mainDemoTextBox" // initialize in case user choose another round
		wait(500).then(() => removeSmartphoneApperance());
		await delay(750)
		data_helper.on_broadcast = undefined;
		jsPsych.resumeExperiment();
	} else {
		// construct here the demo instructions:
		var oldMainDemoTextDuplicateID = mainDemoTextDuplicateID
		mainDemoTextDuplicateID = dom_helper.duplicate(oldMainDemoTextDuplicateID);
		dom_helper.removeElement(oldMainDemoTextDuplicateID)
		dom_helper.set_text('mainDemoText', settings.demoCycleSupportingText[(previousDemoTrialNum % Object.keys(settings.demoCycle).length) + 1])
		dom_helper.show(mainDemoTextDuplicateID)
		// alow to load the app again:
		document.getElementById('demoLoadButton').onclick = loadAppDemo;
	}
}

async function loadAppDemo() {
	document.getElementById('demoLoadButton').onclick = '';
	// check when to present again the button that closes the demo app:
	subData = await data_helper.get_subject_data(true);
	target_n_data_points = !!Object.keys(subData).length ? subData.day.length + 1 : 1; // accounting for when there is no data yet

	var demoUrl = "index.html" + location.search;

	if (!document.getElementById("embedded_app")) { //i.e. it's the first time
		// embed the app for demo purposes:
		appDemoID = "embedded_app";
		embeddedElement = document.createElement('iframe');
		embeddedElement.setAttribute("id", appDemoID)
		embeddedElement.setAttribute("src", demoUrl)
		embeddedElement.className = "appInBigRectangle"
		document.body.appendChild(embeddedElement)
	} else {
		appDemoID = dom_helper.duplicate('embedded_app');
	}

	dom_helper.remove_css_class(appDemoID, 'appClose');
	dom_helper.add_css_class(appDemoID, 'appOpen');
	dom_helper.show(appDemoID);
	//dom_helper.hide('demoExitButton')
	dom_helper.add_css_class('demoExitButton', 'disabled');
	document.getElementById('demoExitButton').style.borderColor = 'rgba(85,85,85,0.2)'

	runMonitorChangesInIntervals = setInterval(() => {
		console.log('INTERVALSCUSH.......')
		monitorChangesInDemoAndReact({ broadcast: 'running_checks_on_intervals' })
	}, 1000);

	firstAppOpennedDetection = true; // this is to indicate when the button to open the was first pressed (for some relevant checks to rely on)
}

function createSmartphoneApperance() {
	// create text above the "smartphone sketch":
	demoText = document.createElement('h1');
	demoText.setAttribute("id", "mainDemoText");
	demoText.setAttribute("class", "demoText");
	demoText.innerHTML = app_settings.demoCycleSupportingText[0]['a'];
	demoText.appendChild(document.createTextNode(''));
	is_firstDemoScreen_SuportingInstructions_changed_1 = false;
	is_firstDemoScreen_SuportingInstructions_changed_2 = false;
	previousDemoTrialNum = -1;
	firstPressOnExitButton = true;
	// making the text box
	demoTextBox = document.createElement('div');
	demoTextBox.setAttribute("id", "mainDemoTextBox");
	demoTextBox.setAttribute("class", "demoTextBox");

	demoTextBox.appendChild(demoText);
	document.body.appendChild(demoTextBox);

	// outer rectangle:
	outerRectangle = document.createElement('div');
	outerRectangle.setAttribute("id", "outerRectangle");
	outerRectangle.setAttribute("class", "bigRectangle");
	document.body.appendChild(outerRectangle);

	// inner rectangles:
	appsLineContainerElement = document.createElement('div');
	appsLineContainerElement.setAttribute("id", "appsLineContainerElement");
	appsLineContainerElement.setAttribute("class", "appLine");
	innerRectangle = document.createElement('div');
	innerRectangle.setAttribute("id", "innerRectangle");
	innerRectangle.setAttribute("class", "smallRectangle");
	// put the inner rectangle in the outer rectangle
	appsLineContainerElement.appendChild(innerRectangle);
	outerRectangle.appendChild(appsLineContainerElement);
	// duplicate the small rectangles
	for (i = 0; i < 3; i++) { // make 4 icons in a line (add 3)
		dom_helper.duplicate('innerRectangle');
	}
	for (i = 0; i < 2; i++) { // create 3 lines (add 2)
		dom_helper.duplicate('appsLineContainerElement');
	}
	// create the line with the app
	lineWithRealAppContainerElement = document.createElement('div');
	lineWithRealAppContainerElement.setAttribute("id", "lineWithRealAppContainerElement");
	lineWithRealAppContainerElement.setAttribute("class", "appLine");
	innerRectangle = document.createElement('div');
	innerRectangle.setAttribute("id", "innerRectangle2");
	innerRectangle.setAttribute("class", "smallRectangle");
	lineWithRealAppContainerElement.appendChild(innerRectangle);
	outerRectangle.appendChild(lineWithRealAppContainerElement);
	dom_helper.duplicate('innerRectangle2');
	// add the icon of the REAL APP element:
	appIconElement = document.createElement('img');
	appIconElement.setAttribute("id", "appIcon");
	appIconElement.setAttribute("class", "appIconSpecifics");
	appIconElement.setAttribute("src", "icons/android-icon-72x72.png");
	lineWithRealAppContainerElement.appendChild(appIconElement);
	// another app:
	dom_helper.duplicate('innerRectangle2');
	// draw dots:
	dotContainerElement = document.createElement('div');
	dotContainerElement.setAttribute("id", "dotContainerElement");
	dotElement = document.createElement('span');
	dotElement.setAttribute("id", "homeScreenDots");
	dotElement.setAttribute("class", "dot");
	dotContainerElement.appendChild(dotElement);
	outerRectangle.appendChild(dotContainerElement);
	for (i = 0; i < 4; i++) {
		dom_helper.duplicate('homeScreenDots');
	}
	// another line of apps
	dom_helper.duplicate('appsLineContainerElement');

	// button of exit the app:
	exitAppElement = document.createElement('button');
	exitAppElement.setAttribute("id", 'demoExitButton');
	exitAppElement.setAttribute("onclick", "exitAppDemo(appDemoID)");
	document.body.appendChild(exitAppElement);
	dom_helper.add_css_class('demoExitButton', 'demoButton');
	dom_helper.add_css_class('demoExitButton', 'disabled');
	//document.getElementById('demoExitButton').style.borderColor='rgba(85,85,85,0.2)'

	// create smartphone button area:
	buttonAreaElement = document.createElement('div');
	buttonAreaElement.setAttribute("id", 'simulatedSmartphoneButtonArea');
	document.body.appendChild(buttonAreaElement);
}

function createLoadAppButton(elementIdName) {
	// button of openning the app:
	loadTheAppElement = document.createElement('button');
	loadTheAppElement.setAttribute("id", elementIdName);
	loadTheAppElement.setAttribute("onclick", "loadAppDemo()");
	loadTheAppElement.setAttribute("class", "loadButton");
	//loadTheAppElement.appendChild(document.createTextNode("Enter the app"));
	document.body.appendChild(loadTheAppElement);

	var appIconPosition = document.getElementById('appIcon').getBoundingClientRect()
	document.getElementById(elementIdName).style.top = String(appIconPosition.top) + "px"
	document.getElementById(elementIdName).style.left = String(appIconPosition.left) + "px"
	document.getElementById(elementIdName).style.height = String(appIconPosition.height) + "px"
	document.getElementById(elementIdName).style.width = String(appIconPosition.width) + "px"
}

function removeSmartphoneApperance(appDemoID) {
	//document.getElementById(appDemoID).remove();
	document.getElementById("outerRectangle").remove();
	document.getElementById("demoExitButton").remove();
	document.getElementById("demoLoadButton").remove();
	document.getElementById("simulatedSmartphoneButtonArea").remove();
}

async function monitorChangesInDemoAndReact(broadcastMessage) {
	console.log('> monitorChangesInDemoAndReact activated by: ' + broadcastMessage.broadcast)
	console.log('> check...')

	// present again the button that closes the demo app:
	if (document.getElementById(appDemoID).contentWindow.document.getElementById("welcome_msg") &&
		!document.getElementById(appDemoID).contentWindow.document.getElementById("welcome_msg").classList.contains('hidden')) {
		clearInterval(runMonitorChangesInIntervals) // stop monitoring in intervals
		subData = await data_helper.get_subject_data(true)
		wait(1000).then(() => {
			dom_helper.show('demoExitButton')
			dom_helper.remove_css_class('demoExitButton', 'disabled');
			document.getElementById('demoExitButton').style.borderColor = ''
			firstPressOnExitButton = true;
		});
	}

	// construct the SPECIAL CASE suporting instructions of the FIRST DEMO INTERACTION WITH THE APP which are long and are changed while the embedded app is running:
	if (!is_firstDemoScreen_SuportingInstructions_changed_1 &&
		document.getElementById(appDemoID).contentWindow.document.getElementById("lower_half") && //sometimes it does not exist yet and than an error is occuring on the next line (so this will prevent it)
		!document.getElementById(appDemoID).contentWindow.document.getElementById("lower_half").classList.contains('hidden') // check that the sequecne pressing (i.e., the line showing were to press) is presented				
	) {  // first detection when getting to the sequence pressing screen for the first time
		var oldMainDemoTextDuplicateID = mainDemoTextDuplicateID
		mainDemoTextDuplicateID = dom_helper.duplicate(oldMainDemoTextDuplicateID);
		dom_helper.removeElement(oldMainDemoTextDuplicateID)
		dom_helper.set_text('mainDemoText', app_settings.demoCycleSupportingText[0]['b'])
		dom_helper.show(mainDemoTextDuplicateID)
		is_firstDemoScreen_SuportingInstructions_changed_1 = true;
	}
	if (!is_firstDemoScreen_SuportingInstructions_changed_2 &&
		document.getElementById(appDemoID).contentWindow.document.getElementById("welcome_msg") &&
		!document.getElementById(appDemoID).contentWindow.document.getElementById("welcome_msg").classList.contains('hidden') // check that the trial was completed			
	) {  // first detection after app was closed
		var oldMainDemoTextDuplicateID = mainDemoTextDuplicateID
		mainDemoTextDuplicateID = dom_helper.duplicate(oldMainDemoTextDuplicateID);
		dom_helper.removeElement(oldMainDemoTextDuplicateID)
		dom_helper.set_text('mainDemoText', app_settings.demoCycleSupportingText[0]['c'])
		dom_helper.show(mainDemoTextDuplicateID)
		is_firstDemoScreen_SuportingInstructions_changed_2 = true;
	}
}

function cancelRedundantInvisibleButtonPress(event) {
	if (event.target.id !== "instructionsButtons") {
		event.preventDefault()
	}
}
// ****************************************************************
//                     INITIALIZE VARIABLES:
// ---------------------------------------------------------------
var appDemoID = null;
var subData = {};

var firstAppOpennedDetection = null;
var current_n_data_points = null; // used to navigate between embedded demo up states
var target_n_data_points = null; // used to navigate between embedded demo up states
var instructions_page = 1;
var previousDemoTrialNum;
var firstPressOnExitButton;
var mainDemoTextDuplicateID = "mainDemoTextBox";
var is_firstDemoScreen_SuportingInstructions_changed_1;
var is_firstDemoScreen_SuportingInstructions_changed_2;
var testPassed;
var timeline = [];
var durationToDisableInstructionsButtons = 1500
var showAppDemo = true
var askIfRepeatDemo = true
// a global var to comunicate with the handle_events.js:
tutorialCompleted = false;

var settings = Object.assign({}, app_settings);

// ****************************************************************
//                           PIPELINE:
// ---------------------------------------------------------------
(async () => {
	// get subject data from batch session:
	var timer = new Date();
	do {
		if (new Date() - timer < 5000) { // In case the data is taken before saving was completed from last session it will try for 5 seconds to get the data again and check that it's fine (measured by having a uniqueEntryID).
			var subData = await data_helper.get_subject_data(true).catch(function (e) {
				console.log('error getting subject data');
				console.log(e);
			});
		} else {
			Object.keys(subData).forEach(function (key) { // After 5 seconds in case there still no good data from what supposedly was the last run, it is probabale that a problem occured or that no data had the chance to be normally saved and the last "trial/s" will be removed.
				subData[key] = subData[key].slice(0, subData[key].length - 1);
			});
		}
	} while (subData.uniqueEntryID.length > 1 && !subData.uniqueEntryID[subData.uniqueEntryID.length - 1])

	data_helper.init_session('instructions', false);

	// Giving a unique entry ID (should be assigned only once on each entry). Creating it as a global variable:
	if (!subData.uniqueEntryID[subData.uniqueEntryID.length - 1]) {// should be assigned once every entry
		uniqueEntryID = 1;
	} else {
		uniqueEntryID = subData.uniqueEntryID[subData.uniqueEntryID.length - 1] + 1;
	}

	subject_data_worker.postMessage({ instructionsStartedFlag: true, instructionsStartTime: new Date(), commitSession: true }); // this is used to restart the demo cycle.
	// intialize test questions stuff:
	//---------------------------------
	var question_index = 0;
	var questions = settings.instructions_test_questions;
	var arrayOfQuestionNumbers = Object.keys(questions).map((x) => Number(x)).filter((x) => !isNaN(x))
	var n_questions = arrayOfQuestionNumbers.length;
	if (questions.toRandomizeQuestions) {
		shuffle(arrayOfQuestionNumbers)
	}
	var question_number = arrayOfQuestionNumbers[question_index]

	// PRE-LOADIMAGES:
	//------------------------------------------------------
	var preLoadImages = {
		type: 'call-function',
		func: preloadInstructionImages,
	};

	// SET INFORMED CONSENT:
	//------------------------------------------------------
	// var consentForm = {
	// 	type: 'external-html',
	// 	url: "informed_consent.html",
	// 	cont_btn: "start",
	// 	check_fn: check_consent
	// };

	// SET WRITTEN INSTRUCTIONS:
	//------------------------------------------------------
	var instructions = {
		data: {
			trialType: 'instruction',
		},
		type: 'html-button-response',
		trial_duration: undefined, // no time limit
		choices: ['Back', 'Continue'],
		timeline: [
			{
				stimulus: '',
				on_load: function () {
					document.body.addEventListener("touchend", cancelRedundantInvisibleButtonPress, false);
					dom_helper.show('instructionImage-' + String(instructions_page))
					// handle buttons:
					document.querySelectorAll('[id="instructionsButtons"]')[1].disabled = true;
					document.querySelectorAll('[id="instructionsButtons"]')[1].style.opacity = "0.5";
					setTimeout(function () {
						document.querySelectorAll('[id="instructionsButtons"]')[1].disabled = false
						document.querySelectorAll('[id="instructionsButtons"]')[1].style.opacity = "1";
					}, durationToDisableInstructionsButtons);
				},
				on_finish: function () {
					dom_helper.hide('instructionImage-' + String(instructions_page))
				}
			}
		],
		button_html: '<button id="instructionsButtons">%choice%</button>',
	};
	var instructionsLoop = {
		timeline: [instructions],
		loop_function: function (data) {
			document.body.removeEventListener("touchend", cancelRedundantInvisibleButtonPress, false);
			var goBack = !Number(jsPsych.data.get().last().select('button_pressed').values[0]); // check if participant pressed to go back (or 'next')
			if (!(instructions_page % settings.n_instruction_pages) && !goBack) { // check if they went over all the pages of the instructions (and they didn't want to go a page back)
				//dom_helper.removeElement('instructionsImage');
				document.body.style.backgroundColor = "white";
				instructions_page = 1; // initialize it to the original value in case instructions will be carried out again,
				durationToDisableInstructionsButtons = 0
				return false;
			} else if (settings.lastInstructionsPageExplainsDemo && instructions_page === settings.n_instruction_pages - 1 && durationToDisableInstructionsButtons == 0 && !goBack) { // This is to pass the "Demo is coming" when viewing the instructions again (durationToDisableInstructionsButtons == 0 is just used to check if it's not the first round).
				//dom_helper.removeElement('instructionsImage');
				document.body.style.backgroundColor = "white";
				instructions_page = 1; // initialize it to the original value in case instructions will be carried out again,
			} else {
				if (goBack && instructions_page > 1) {
					instructions_page--
				} else if (!goBack) {
					instructions_page++
				}
				return true;
			}
		}
	};

	// SET DEMO STUFF:
	//------------------------------------------------------
	var demo = {
		type: 'call-function',
		func: function () {
			if (showAppDemo) {
				// Operate the embedded demo:
				data_helper.on_broadcast = monitorChangesInDemoAndReact;
				createSmartphoneApperance()
				createLoadAppButton(elementIdName = 'demoLoadButton')
				jsPsych.pauseExperiment()
			}
		},
	};
	var continue_or_repeat_demo_cycle = {
		data: {
			trialType: 'continue_or_repeat_demo_cycle',
		},
		type: 'html-button-response',
		trial_duration: undefined, // no time limit
		choices: ['Another round', 'Continue'],
		button_html: '<button id="repeatOrContinueButtons">%choice%</button>',
		timeline: [
			{
				stimulus: '<p id="repeatOrContinueText">The demo is over.<br><br>Would you like to perform another round or continue?<br><br></p>',
			}
		]
	};
	var check_if_to_ask_if_continue_or_repeat_demo_cycle = {
		timeline: [continue_or_repeat_demo_cycle],
		conditional_function: function () {
			if (askIfRepeatDemo) {
				return true;
			} else {
				return false;
			}
		}
	}
	// adding an option to choose if to do or not do the demo again when repeating the instuctions:
	var redo_demo = {
		data: {
			trialType: 'redo_demo_cycle',
		},
		type: 'html-button-response',
		trial_duration: undefined, // no time limit
		choices: ['Demo', 'Skip'],
		button_html: '<button id="repeatOrContinueButtons">%choice%</button>',
		timeline: [
			{
				stimulus: '<p id="repeatOrContinueText">The instructions have been completed.<br><br>Do you want to do another demo round (of simulated logins to the app) or skip right to the questions?<br><br></p>',
				on_finish: function (data) {
					showAppDemo = !Number(jsPsych.data.get().last().select('button_pressed').values[0]);
					askIfRepeatDemo = !!showAppDemo
				}
			}
		]
	};
	var check_if_to_ask_to_redo_demo = {
		timeline: [redo_demo],
		conditional_function: function () {
			if (showAppDemo) {
				return false;
			} else {
				return true;
			}
		}
	}
	//
	var big_demo_loop = {
		timeline: [check_if_to_ask_to_redo_demo, demo, check_if_to_ask_if_continue_or_repeat_demo_cycle],
		loop_function: function (data) {
			const subPressedContinue = !jsPsych.data.get().last().select('button_pressed').values.length ? true : !!Number(jsPsych.data.get().last().select('button_pressed').values[0]);
			if (subPressedContinue) { // checking that this is the last trial in the demo cycle; Also making sure this trial has ended
				showAppDemo = false
				return false;
			} else {
				// Operate the embedded demo:
				return true;
			}
		}
	}

	// SET TEST:
	//------------------------------------------------------
	var get_ready_for_the_test = {
		data: {
			trialType: 'get_ready_for_the_test',
		},
		type: 'html-button-response',
		trial_duration: undefined, // no time limit
		choices: ['Begin'],
		button_html: '<button id="repeatOrContinueButtons">%choice%</button>',
		timeline: [
			{
				stimulus: '<p id="repeatOrContinueText">We will now ask you a few questions to make sure the instructions are clear.<br><br> \
				A correct answer will be marked in green. An incorrect answer will be marked in red and you will immediately see the correct answer marked in green.<br>\
				A reminder: to be able to start playing the game you must answer all the questions correctly.\
				If you do not answer everything correctly, you simply need to repeat the instructions and then the questions again.<br><br>\
				Click Start to begin the questions.<br>\
				</p>',
			}
		]
	};
	var test_question = {
		data: {
			trialType: 'test_question',
		},
		type: 'html-button-response-and-feedback_Rani',
		trial_duration: undefined, // no time limit
		timeline: [
			{
				stimulus: '',
				choices: '',
				correct_answer: '',
				on_start: function () {
					this.stimulus = '<p id="test_question_text">' + questions[arrayOfQuestionNumbers[question_index]].question + '</p>'
					this.choices = shuffle([questions[question_number].correct_answer, questions[question_number].distractor_1, questions[question_number].distractor_2, questions[question_number].distractor_3])
					this.choices.unshift(questions.dont_know_answer)
					this.button_html = '<button id="multipleChoiceQuestionsButtons">%choice%</button>'
					this.correct_answer = questions[question_number].correct_answer
				},
				on_finish: function (data) {
					data.correct = data.button_pressed == this.choices.indexOf(questions[question_number].correct_answer); // option B
				}
			},
		]
	};
	var testQuestionsSequenceManager = {
		timeline: [test_question],
		loop_function: function () {
			if (question_index === (n_questions - 1)) {
				// initialize stuff if more rounds of instructions will be run.
				question_index = 0;
				if (questions.toRandomizeQuestions) {
					shuffle(arrayOfQuestionNumbers)
				}
				question_number = arrayOfQuestionNumbers[question_index]
				return false;
			} else {
				question_index++
				question_number = arrayOfQuestionNumbers[question_index]
				return true;
			}
		}
	};

	var post_test_message = {
		data: {
			trialType: 'post_test_message',
		},
		type: 'instructions',
		trial_duration: undefined, // no time limit
		allow_keys: false,
		allow_backward: false,
		button_label_next: 'Continue',
		pages: [],
		on_start: function () {
			// check: if there is a single mistake return to start
			const lastTrialIndex = jsPsych.data.get().last().select('trial_index').values[0];
			const relevantData = jsPsych.data.get().filterCustom(x => x.trial_index > lastTrialIndex - n_questions)
			testPassed = !(relevantData.filter({ trialType: 'test_question', correct: false }).count() > 0)
			if (testPassed) {
				subject_data_worker.postMessage({ completedInstructions: true, commitSession: true });
				msg = 'You answered all questions correctly.<br><br> \
				Starting from this moment, you can access the app and try to acquire gold (and earn money).<br><br> \
				After exiting the app now, the next entries will already be part of the game.<br><br> \
				Good luck!<br><br> \
				 <img id="post_instructions_test_image" src="images/game_title_image.jpg" />';
				jsPsych.endExperiment('The experiment was ended because the user passed the test.');
			} else {
				msg = 'Not all questions were answered correctly.<br><br> \
				Please review the instructions and the demo again.';
				this.show_clickable_nav = true
			}
			this.pages = ['<h2 id="post_test_msg">' + msg + '</h2>']
		}
	};

	// SET THE MAIN LOOP OF THE TUTORIAL:
	//------------------------------------------------------
	var completeTutorialLoop = {
		timeline: [instructionsLoop, big_demo_loop, get_ready_for_the_test, testQuestionsSequenceManager, post_test_message],
		loop_function: function (data) {
			if (!testPassed) {
				return true;
			} else {
				return false;
			}
		}
	};

	timeline.push(preLoadImages);
	// timeline.push(consentForm);
	timeline.push(completeTutorialLoop);

	jsPsych.init({
		timeline: timeline,
		//display_element: 'jspsych-display-element',
		on_finish: function () {
			// saving the data
			// ---------------------
			var instructionDataObject = { Instructions_Data: { ...jsPsych.data.get().values() } }// get the data for the instructions after reducing all the check demo (every 400ms "trials") which can create thousand of trials and make problems when uploading the data.

			subject_data_worker.postMessage({ completedInstructions: true, commitSession: true });
			subject_data_worker.postMessage(instructionDataObject) // save the instructions data

			terminate_subject_data_worker = true;
			tutorialCompleted = true;
			console.log('Tutrial Completed')
		},
		on_close: function () { // in case the user gets out before it finishes.
			// saving the data
			// ---------------------
			var instructionDataObject = { Instructions_Data: { ...jsPsych.data.get().values() } }// get the data for the instructions after reducing all the check demo (every 400ms "trials") which can create thousand of trials and make problems when uploading the data.

			subject_data_worker.postMessage(instructionDataObject) // save the instructions data

			terminate_subject_data_worker = true;
			console.log('Tutrial Closed')
		}
	});
})();