window.app_settings = {
  server: {
    base_address: "https://test-iai8.onrender.com",
    ws_base_address: "wss://test-iai8.onrender.com"
  },
  app_base_adress: "https://github.com/de-zhou/Test",
  context: "Test_appli",
  one_time_link: true,
  downloadAllToLocalStorage: false,
  minDailyDataPointsToStoreLocally: 20,
  experimentalDayStartingHour: 5,
  pressesRequired: 2,
  rewards: {
    isRatioSchedule: false,
    winningRate: 3,
    winningChancePerUnit: function () {
			return 1 / this.winningRate;
		},
    isVariableReward: false,
    rewardConstantSum: 15,
    minWinningSum: 15,
    maxWinningSum: 15,
    winAnywayIfMultipleNonWins: false,
    RelativeNonWinUnitsBeforeSureWinning: function () {
			return this.winningRate * 2;
		},
    enforceFirstEntryNoWinSecondEntryWin: false,
    enforce_n_random_winnings_during_minimum_entries: false,
    n_random_winnings_during_minimum_entries: 2,
    notifyRewardContainerReset: true,
    includeAversiveOutcome: false,
    losingRate: 3,
    losingChancePerUnit: function () {
			return 1 / this.losingRate;
		},
    isVariableLoss: false,
    lossConstantSum: 15,
    minLosingSum: 20,
    maxLosingSum: 30
  },
  cost: {
    isCost: true,
    isCostPerPress: false,
    isVariableCost: false,
    minCostSum: 1,
    maxCostSum: 5,
    costConstantSum: 1,
    presentCost: true
  },
  forceDeval: null,
  group_vars: {
    group_A: {
      dayToFinishExperiment: 7,
      daysWithControlManipulations: [],
      daysWithDevaluationManipulations: []
    },
    group_B: {
      dayToFinishExperiment: 7,
      daysWithControlManipulations: [],
      daysWithDevaluationManipulations: []
    },
    group_C: {
      dayToFinishExperiment: 0,
      daysWithControlManipulations: [],
      daysWithDevaluationManipulations: []
    }
  },
  feedback_in_devalued_actions: false,
  entry_to_manipulate_in: 0,
  hour_at_day_to_manipulate_anyway: 14,
  referenceDayPrecentileForManipulation: 0.5,
  nTimesToShowCaveIfNotEntering: 2,
  maxSecsToShowCaveAgainIfNotEntering: 30,
  nTrialsBeforeNotifyGameOver: 3,
  nDailyEntriesRequired: function () { return this.entry_to_manipulate_in; },
  manipulationImageID: function (manipulationType) {
		if (manipulationType == 'devaluation') {
			return 'warehouse_full';
		} else if (manipulationType == 'still_valued' || manipulationType == 'still_valued_post_deval' || manipulationType == 'still_valued_replacing_devaluation') { // i.e., 'still_valued'
			return 'warehouse_half';
		}
	},
  msToRecordTimeSinceManipulationActivation: 500,
  use_warehouse_state_query: false,
  coinCollectionTask: {
    includeRocks: true,
    includeBombs: false,
    duration: 5,
    openningAnimTime: 1500,
    element_disappearing_time: 150,
    nStim: 30,
    bg_img_path: "images/cave.jpg",
    outcome_win_image_path: "images/outcome_win.png",
    outcome_loss_image_path: "images/outcome_loss.png",
    outcome_no_win_image_path: "images/outcome_no_win.png",
    outcomeImageHeightWidthRatio: 0.9312320916905444,
    stimSizeProportionOfScreen: 0.15,
    textSizeProportionOfScreenWidth: 0.15,
    ProportionOfScreenWidthToPlaceCounter: 0.9,
    ProportionOfScreenHeightToPlaceCounter: 0.05,
    counterTextColor: [0,0,255],
    finishMessageTextColor: [0,0,255],
    finishMessage: "Goodbye",
    costPerPress: 10,
    rewardPerCoinStash: function () { return app_settings.rewards.rewardConstantSum }
  },
  hideOutcome: {
    hide: true,
    hideOnlyUnderManipulationPeriods: false,
    daysToHideAt_UntilTomorrow: {
      group_A: [],
      group_B: [],
      group_C: []
    },
    entry_to_hideOutcome_in: 0,
    daysToHideAt_Randomly: {
      group_A: [],
      group_B: [],
      group_C: []
    },
    chance_to_begin_hiding_batch_when_Random: 0,
    n_entriesToHide_when_Random: 0
  },
  lottery_N_frames: 35,
  durations: {
    entranceMessage: 800,
    lotteryAnim: 3500,
    intervalBetweenLotteryAndOutcomeAnim: 2800,
    outcomeAnim: 2000,
    intervalBetweenOutcomeAndNextThing: 1000,
    costAnim: 1500,
    surface_disappearance: 700
  },
  text: {
    rewardContainerClearingMessage: "The cargo spaceship has depleted the warehouse and it is now ready to store gold.",
    manipulationMessage: function (manipulationType) {
			if (manipulationType == 'devaluation') {
				return 'The warehouse is full!<br>It cannot store any more gold until the cargo spaceship empties it.';
			} else if (manipulationType == 'still_valued' || manipulationType == 'still_valued_post_deval' || manipulationType == 'still_valued_replacing_devaluation') { // i.e., 'still_valued'
				return 'The warehouse is half full...';
			}
		},
    confirmationCodeTextMessage: "\nPlease enter the following letters to confirm that you have read the message: ",
    realGameBegins: "The real game starts now.<br>The gold you will accumulate from now on is worth real money.<br><br>Good Luck!",
    endExperiment: function (baselineAccumulatedReward) {
			return 'The game is over. Thank you for participating!' + '<br><br>' +
				'You managed to bring to earth '
				+ baselineAccumulatedReward // This was designed to replace the line below.
				// + logic.calculateReward(subData, app_settings.coinCollectionTask, dayToFinishExperiment)
				+ ' Gold units!'
		},
    noConnectionToEndExperiment: "Unable to connect to the server.<br><br>Please verify you have network connection and try again.",
    dialog_coinCollection: "You found a gold cave. There are rocks and gold in the cave. Each attempt to collect an item (clicking) costs 10 gold units. The gold collected will be kept in the warehouse if it has room. Once you enter the cave, you'll have 5 seconds to stay there.",
    dialog_warehouseStateQuery: "What is the current state of the warehouse?",
    dialog_warehouseStateQuery_allowed_answers: ["partiallyfull","completelyfull"],
    loadingDataError: "There is a problem!<br><br>A. Please make sure you are connected to the internet.<br>B. Try closing the app and reentering.<br><br>If it is still not working, please contact [NAME] at: [PHONENUMBER]."
  },
  allowInstructions: true,
  allowDemo: true,
  demoCycle: {
    0: {
      isWin: true,
      isLoss: false,
      whichManipulation: null,
      activateManipulation: false,
      isUnderManipulation: false,
      toHideOutcome: false,
      resetContainer: false,
      consumptionTest: false
    },
    1: {
      isWin: false,
      isLoss: false,
      whichManipulation: null,
      activateManipulation: false,
      isUnderManipulation: false,
      toHideOutcome: false,
      resetContainer: false,
      consumptionTest: false
    },
    2: {
      isWin: false,
      isLoss: false,
      whichManipulation: null,
      activateManipulation: false,
      isUnderManipulation: false,
      toHideOutcome: false,
      resetContainer: false,
      consumptionTest: true
    },
    3: {
      isWin: true,
      isLoss: false,
      whichManipulation: "still_valued",
      activateManipulation: true,
      isUnderManipulation: false,
      toHideOutcome: false,
      resetContainer: false,
      consumptionTest: false
    },
    4: {
      isWin: true,
      isLoss: false,
      whichManipulation: "devaluation",
      activateManipulation: true,
      isUnderManipulation: false,
      toHideOutcome: false,
      resetContainer: false,
      consumptionTest: false
    },
    5: {
      isWin: false,
      isLoss: false,
      whichManipulation: null,
      activateManipulation: false,
      isUnderManipulation: false,
      toHideOutcome: true,
      resetContainer: true,
      consumptionTest: false
    }
  },
  demoCycleSupportingText: {
    0: {
      a: "We prepared a demo for you with a virtual screen that simulates a smartphone.<br> Tap the app to launch your spaceship to a gold-seeking mission. First, you will see your spaceship landing, and in the top right corner, the cost of sending the spaceship to the mission will be displayed (-1).",
      b: "Now tap the bottom half of the screen and then on the top half to remove the ice layer and enable the gold search. After a few seconds of searching, the outcome will be presented.",
      c: "In this round you have found gold!<br>Immediately afterwards, the end message appears (\"See you next time\"). When this message appears, it means that the search result has been recorded and you can exit the app. To exit the app in this demo, tap the home button on the virtual smartphone."
    },
    1: "Now you will enter (and exit) the app a few times and we will demonstrate different task components.<br> You can now enter the app and remove the ice layers.<br> This time you won't find gold (only worthless rocks).",
    2: "In the next round you will encounter a cave rich in gold.<br>You will receive a message about this and then you will have 5 seconds inside it, during which you can collect from the items in the cave.",
    3: "In the next entry we will demonstrate receiving a report that the warehouse is half full.",
    4: "This time we will demonstrate receiving a report that the warehouse is full.",
    5: "At the beginning of the next round you will receive a report that the cargo spaceship (the one that empties the warehouse on the gold planet every 24 hours) has emptied the warehouse.<br>In addition, it will be cloudy and you will not be able to see the result of your gold search.<br>*Here, too, you would have to wait for the end message so that the search result is recorded."
  },
  instructionsFileName: "instructions.html",
  n_instruction_pages: 24,
  lastInstructionsPageExplainsDemo: true,
  instructions_test_questions: {
    1: {
      question: "Is there a cost to enter the app (that is, to try and find gold)?",
      correct_answer: "Yes, it costs 1 gold unit.",
      distractor_1: "There is no entry cost, there is a cost only on attempts to collect items in a cave.",
      distractor_2: "Yes, it costs 15 gold units.",
      distractor_3: "Yes, the cost varies each time."
    },
    2: {
      question: "Does the chance of finding gold vary at certain times?",
      correct_answer: "No, the chance of finding gold is always the same.",
      distractor_1: "The chance of finding gold changes all the time.",
      distractor_2: "The chance of finding gold changes when it is cloudy and it is not possible to see if I found gold.",
      distractor_3: "If I recently found a lot of gold, the chance of finding more gold is smaller and vice versa."
    },
    3: {
      question: "What happens if the warehouse is full?",
      correct_answer: "It is not possible to accumulate any more gold that will be taken to Earth and converted into real money for me until the warehouse is emptied at the end of the day (at 5:00 AM).",
      distractor_1: "I will need to directly and immediately send the gold to Earth.",
      distractor_2: "This means that the game is over.",
      distractor_3: "The warehouse cannot be filled completely but only partially."
    },
    4: {
      question: "What happens if the warehouse is partially full?",
      correct_answer: "Nothing, it's just an update. As long as the warehouse is not completely full, it is possible to continue accumulating gold in it.",
      distractor_1: "It's not something I would know about because there are no reports of the warehouse being only partially full.",
      distractor_2: "It is not possible to accumulate any more gold that will be taken to Earth and converted into real money for me until the warehouse is emptied at the end of the day (at 5:00 AM).",
      distractor_3: "I will need to directly and immediately send the gold to Earth."
    },
    5: {
      question: "What is the value of the gold piles I can find?",
      correct_answer: "15 gold units.",
      distractor_1: "The amount varies and will be displayed each time accordingly.",
      distractor_2: "1 gold unit.",
      distractor_3: "The amount varies and I have no way of knowing it."
    },
    6: {
      question: "After I enter the app, when can I exit it so that the search outcome will be counted for me?",
      correct_answer: "When the end message (saying \"See you next time\") appears.",
      distractor_1: "Immediately after I enter.",
      distractor_2: "Immediately upon the presentation of the search outcome.",
      distractor_3: "When clouds appear."
    },
    7: {
      question: "What happens when the gold planet is cloudy and I can't see the search outcomes?",
      correct_answer: "Everything continues exactly the same. There is no change except for the fact that I cannot see the search outcome.",
      distractor_1: "The game is not available at these times so it is better to try again later.",
      distractor_2: "There is no entry cost.",
      distractor_3: "I cannot acquire the gold in the warehouse."
    },
    8: {
      question: "How can I earn real money?",
      correct_answer: "Just enter the app to search for gold. If I find gold and there is room in the warehouse, the gold will be taken to Earth and converted into real money. The more gold I acqire, the more money I will earn.",
      distractor_1: "It is not possible to earn real money in the game.",
      distractor_2: "Just enter the app to search for rocks. If I find rocks and there is room in the warehouse, the rocks will be taken to Earth and converted into real money.",
      distractor_3: "Enter the app and wait as long as possible before I close it. The longer it is continuously open, the more I will earn."
    },
    9: {
      question: "How many entries can be made each day?",
      correct_answer: "As much as desired, but at least 5 entries per day in order to keep the gold planet available (and with it the ability to continue accumulating gold).",
      distractor_1: "As much as desired, but at least 2 entries per day in order to keep the gold planet available (and with it the ability to continue accumulating gold).",
      distractor_2: "As much as desired, but at most 100 entries per day in order to keep the gold planet available (and with it the ability to continue accumulating gold).",
      distractor_3: "As much as desired, but at most 300 entries per day in order to keep the gold planet available (and with it the ability to continue accumulating gold)."
    },
    10: {
      question: "Which of the following is not true regarding the rich-in-gold caves that I may occasionally encounter?",
      correct_answer: "All of the answers are correct (except for 'I don't know').",
      distractor_1: "I have only 5 seconds inside the cave, during which I can collect from the items placed in it.",
      distractor_2: "Each attempt (click) to collect an item inside the cave costs 10 gold units.",
      distractor_3: "The value of the gold and rock piles is equal to the value of the gold and rock piles in the regular gold searches."
    },
    11: {
      question: "What is the duration of the game?",
      correct_answer: "The duration of the game is not predetermined. It can range from a few days to one month.",
      distractor_1: "One day.",
      distractor_2: "A week.",
      distractor_3: "A month."
    },
    toRandomizeQuestions: false,
    dont_know_answer: "I don't know."
  },
  instructions_HTML_title: "Instructions",
  instructions_main_HTML_element: "instructions_iframe",
  App_HTML_title: function () { return this.context.replace(/_/g, ' ') },
  App_main_HTML_element: "main_container",
  dataVarList: ["serial","uniqueEntryID","subId","group","context","day","isWin","isLoss","reward","cost","baselineAccumulatedReward","resetContainer","resetContainerConfirmationTime","manipulationToday","activateManipulation","isUnderManipulation","hideOutcome","isFirstTime","todayInitialOutcomes","startTime","press1Time","press2Time","outcomeTime","endTime","manipulationAlertTime","showInstructions","instructionsStartedFlag","completedInstructions","isDemo","demoTrialNum","isDialogOn","coin_task_finish_status","endExperiment","manipulationConfirmationTime","manipCheckAlertTime","manipChecConfirmationTime","localSessionId"]
}