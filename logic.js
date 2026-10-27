// ****************************************************************
//                           FUNCTIONS:
// ---------------------------------------------------------------
function setCounterBalancedStuff(subID, settings) {
  // initiate relevant stimuli:
  let group;

  // Determine group:
  if (subID % 300 > 100 && subID % 300 < 200) {
    group = 'group_A'; // subject numbers 101-199, 401-499, 701-799 etc
  } else if (subID % 300 > 200 && subID % 300 < 300) {
    group = 'group_B'; // subject numbers 201-299, 501-599, 801-899 etc
  } else if (subID % 300 < 100) {
    group = 'group_C'; // subject numbers 301-399, 601-699, 901-999 etc.
  }

  let devalDays = settings.group_vars[group].daysWithDevaluationManipulations;
  let controlDays = settings.group_vars[group].daysWithControlManipulations;
  let dayToFinishExperiment = settings.group_vars[group].dayToFinishExperiment;

  return [group, devalDays, controlDays, dayToFinishExperiment];
}

function getTimeFromLastEntryInSec(timePoint) {
  const currentTime = new Date();
  const diffTime = Math.abs(currentTime - timePoint);
  const diffSeconds = Math.floor(diffTime / (1000));
  return diffSeconds;
}

function checkWinning(subData, isRatioSchedule, winningChancePerUnit, winAnywayIfMultipleNonWins, enforceFirstEntryNoWinSecondEntryWin) {
  if (enforceFirstEntryNoWinSecondEntryWin &&
    ((subData.resetContainer[subData.resetContainer.length - 1] && !!subData.resetContainerConfirmationTime[subData.resetContainerConfirmationTime.length - 1]) ||
      (subData.isFirstTime[subData.isFirstTime.length - 1] && !!subData.endTime[subData.endTime.length - 1])) &&
    (!subData.isWin[subData.isWin.length - 1])) { // check first if it's the second entry today (where a reward must be given). [* the last line is just for the case of when a manipulation is initiated on the first entry that day and isWin is True.]
    return true
  }
  if (isRatioSchedule) { // VR schedule
    if (winAnywayIfMultipleNonWins && subData.endTime && subData.endTime.filter((x, i) => !subData.isDemo[i] && !!x).length >= app_settings.rewards.RelativeNonWinUnitsBeforeSureWinning()) { // If sure win following no wins is on and it's not the beginning check last wins
      const indicesWithEndTime = subData.endTime.map((x) => !!x).multiIndexOf(true)
      const relevantIndicesToCheck = indicesWithEndTime.slice(0 - app_settings.rewards.RelativeNonWinUnitsBeforeSureWinning())
      if (!relevantIndicesToCheck.filter((x) => subData.isWin[x]).length) { // this checks if there was no win in the relevant times.
        return true
      }
    }
    return Math.random() < winningChancePerUnit;
  } else { // namely a VI schedule
    if (!!Object.keys(subData).length) { // if there is some data for this subject
      if (winAnywayIfMultipleNonWins && subData.endTime) { // If sure win following no wins is on and if there is some data already
        const ms_per_second = 1000;
        const timeToCheckBack = new Date(new Date() - ms_per_second * app_settings.rewards.RelativeNonWinUnitsBeforeSureWinning())
        const firstEntryAfterTimeToCheck = subData.outcomeTime.filter((x, i) => subData.isDemo[i] === false).find((x) => new Date(x) > timeToCheckBack)
        const relevantentries = subData.isWin.slice(subData.outcomeTime.indexOf(firstEntryAfterTimeToCheck))
        if (!!firstEntryAfterTimeToCheck && !relevantentries.some((x) => !!x)) { // if there was at least one entry after the time to check and there was no winning since the time to check
          return true
        }
      }
      // create an array of subData.outcomeTime but ignoring indices where subData.isLose was not true () and subData.isDemo not false:
      const outcomeTimeArray = subData.outcomeTime.filter((x, i) => subData.isLoss[i] != true && subData.isDemo[i] === false)
      const lastEntryTime = new Date(outcomeTimeArray.reverse().find(element => !!element));
      var secsFromLastEntry = getTimeFromLastEntryInSec(lastEntryTime);
    } else { // i.e., first entry
      var secsFromLastEntry = 1;
    }
    chanceOfWinning = 1 - Math.pow(1 - winningChancePerUnit, secsFromLastEntry);
    return Math.random() < chanceOfWinning;
  }
}

function checkLosing(subData, isRatioSchedule, losingChancePerUnit) {
  if (isRatioSchedule) { // VR schedule
    return Math.random() < losingChancePerUnit;
  } else { // namely a VI schedule
    if (!!Object.keys(subData).length) { // if there is some data for this subject
      const outcomeTimeArray = subData.outcomeTime.filter((x, i) => subData.isWin[i] != true && subData.isDemo[i] === false)
      const lastEntryTime = new Date(outcomeTimeArray.reverse().find(element => !!element));
      var secsFromLastEntry = getTimeFromLastEntryInSec(lastEntryTime);
    } else { // i.e., first entry
      var secsFromLastEntry = 1;
    }
    chanceOfLosing = 1 - Math.pow(1 - losingChancePerUnit, secsFromLastEntry);
    return Math.random() < chanceOfLosing;
  }
}

function assignReward(rewardsData) {
  if (!rewardsData.isVariableReward) {
    return rewardsData.rewardConstantSum
  }
  else {
    let non_rounded_reward = Math.random() * (rewardsData.maxWinningSum - rewardsData.minWinningSum) + rewardsData.minWinningSum;
    return Math.round(non_rounded_reward * 100) / 100 // just making it rounded to two decimal points.
  }
}

function assignLoss(lossData) {
  if (!lossData.isVariableLoss) {
    return -1 * lossData.lossConstantSum
  }
  else {
    let non_rounded_loss = Math.random() * (lossData.maxLosingSum - lossData.minLosingSum) + lossData.minLosingSum;
    return -1 * (Math.round(non_rounded_loss * 100) / 100) // just making it rounded to two decimal points.
  }
}

function getBaselineAccumulatedReward(subData, settings) {
  try {
    if (!!subData.baselineAccumulatedReward) {
      let relevantTrials = subData.baselineAccumulatedReward.filter((x, i) => x !== undefined && x !== null && subData.isDemo[i] === false);
      if (!relevantTrials.length) { return 0 }; // return 0 in case there are no relevant trials.
      let li = subData.baselineAccumulatedReward.lastIndexOf(relevantTrials.slice().reverse()[0]) // get the last valid index (that had)
      // if it is the first time there is an endExperiment message just use the same value.
      if (!!subData['endExperiment'][li]) {
        return subData.baselineAccumulatedReward[li];
      }
      // calculate reward accounting for previous trial
      // --------------------------------------------------------
      let accumulator = subData.baselineAccumulatedReward[li]

      // handle COST [may need adaptation if cost is splited to entry and each press]:
      !!subData['cost'][li] ? accumulator -= subData['cost'][li].reduce((a, b) => a + b, 0) : null;

      // handle REWARD:
      if (!!subData['endTime'][li] && !(!!subData.isUnderManipulation[li] && subData.manipulationToday[li] === 'devaluation')) {
        accumulator += subData['reward'][li];
      }

      // handle CAVE:
      if (!!subData['endTime'][li] && !!subData.coin_task_finish_status[li]) {
        // reduce cave's cost
        accumulator -= subData.coin_task_finish_status[li].total_presses * settings.coinCollectionTask.costPerPress;
        console.log('with cave cost: ' + accumulator)
        // add cave's reward
        subData.manipulationToday[li] !== 'devaluation' ? accumulator += subData.coin_task_finish_status[li].total_gold_collected * settings.coinCollectionTask.rewardPerCoinStash() : null;
        console.log('with cave reward: ' + accumulator)
      }

      return !accumulator ? 0 : accumulator //prevent errors if accumulator does not get a value after all
    } else {
      return 0
    }

  } catch (error) {
    console.error(error);
    return 0
  }
}

function InitializeCost(cost_settings) {
  if (cost_settings.isCost) { // the syntax is based on the assignReward function defined above.
    if (!cost_settings.isVariableCost) {
      return cost_settings.isCostPerPress ? new Array(app_settings.pressesRequired + 1).fill(cost_settings.costConstantSum) : [cost_settings.costConstantSum];
    } else {
      let cost = [];
      const n_costs = cost_settings.isCostPerPress ? app_settings.pressesRequired + 1 : 1;
      for (i = 0; i < n_costs; i++) {
        let non_rounded_cost = Math.random() * (cost_settings.maxCostSum - cost_settings.minCostSum) + cost_settings.minCostSum;
        cost.push(Math.round(non_rounded_cost * 100) / 100); // just making it rounded to two decimal points.
      }
      return cost
    }
  } else {
    return [0]
  }
}

function checkIfToHideOutcome(subData, hideOutcome, dayOfExperiment, isUnderManipulation, group, completeEntriesToday) {
  if (hideOutcome.hide) { // If to hide outcomes
    if (isUnderManipulation && hideOutcome.hideOnlyUnderManipulationPeriods) { // If it's manipulation time and hiding is set to only during manipulations.
      return true;
      // first gives precedence to daysToHideAt_UntilTomorrow (which are typically used for the manipulation days):
    } else if (!hideOutcome.hideOnlyUnderManipulationPeriods && hideOutcome.daysToHideAt_UntilTomorrow[group].includes(dayOfExperiment)) {
      if (completeEntriesToday >= hideOutcome.entry_to_hideOutcome_in - 1) { return true }
      // now refer to the daysToHideAt_Randomly:
    } else if (!hideOutcome.hideOnlyUnderManipulationPeriods && hideOutcome.daysToHideAt_Randomly[group].includes(dayOfExperiment)) {
      // check if outcome was not hidden in the last trials (according to subData.hideOutcome last entry - false or undefined):
      if (subData.hideOutcome.length) {
        // check if the outcome was not hidden on the previous entry:
        if (!subData.hideOutcome[subData.hideOutcome.length - 1]) {
          // randomly decide if to hide outcome:
          if (Math.random() < hideOutcome.chance_to_begin_hiding_batch_when_Random) {
            return true;
          }
        } else { // check if to continue to hide the outcome or not: ***
          let hiddenOutcomeOccurences = subData.hideOutcome.map(val => val === undefined ? false : val);
          let n_consecutive_trials = hiddenOutcomeOccurences.reverse().indexOf(false);
          // if hidden outcomes were not presented n_entriesToHide_when_Random  
          if (n_consecutive_trials < hideOutcome.n_entriesToHide_when_Random) {
            return true;
          }
        }
      }
    }
  }
  return false;
}

function checkIfResetContainer(subData, dayOfExperiment) {
  if (!subData.resetContainerConfirmationTime.filter((x, i) => !!x && subData.day[i] === dayOfExperiment).length) { // if there were no completed entries today
    return true
  } else {
    return false
  }
}

function finishExperiment(subData, dayOfExperiment, dayToFinishExperiment, nTrialsBeforeNotifyGameOver) {
  // *** I DECIDED NOT TO EXCLUDE AT ALL BUT RATHER CREATED A NEW FUNCTION BELOW THAT WILL TELL US IF THE SUBJECT SHOULD HAVE BEEN EXCLUDED ***

  // var n_entriesToday = subData.day.filter((x, i) => x == dayOfExperiment && !!subData.endTime[i]).length

  // Check if the experiment is over
  // if (dayOfExperiment >= dayToFinishExperiment && n_entriesToday >= nTrialsBeforeNotifyGameOver) { // added the latter to show game over only after a few entries (to allow online fixes when necessary [and before game ver message is shown])
  if (dayOfExperiment >= dayToFinishExperiment) { return true }
  if (typeof (subjects_exclude_online) !== "undefined" && String(subjects_exclude_online).includes(data_helper.get_subject_id())) { return true } // for online manual exclusions
  // if (subData["endExperiment"].includes(true)) { return true } // If there was already a notification about the game ending.

  // Exclusions:
  // -------------------------------------------
  // // Check if the participant entered EVERY DAY:
  // const daysWithEntries = subData.day.filter((x, i, self) => !!x && x < dayOfExperiment && !!subData.endTime[i]).filter((v, i, a) => a.indexOf(v) === i).length;
  // const possibleDaysWithEntries = [...Array(dayOfExperiment - 1).keys()].length;
  // if ((daysWithEntries !== possibleDaysWithEntries || (typeof (subjects_exclude_online) !== "undefined" && String(subjects_exclude_online).includes(data_helper.get_subject_id()))) && n_entriesToday >= nTrialsBeforeNotifyGameOver) { // added the latter to show game over only after a few entries (to allow online fixes when necessary [and before game ver message is shown])
  //   return true
  // }

  // // Check if there was a day where the MANIPULATION WAS NOT ACTIVATED:
  // //const daysOfManipulation = [firstComparableValDay, firstDevalDay, firstComparableValDay_PostDeval, lastComparableValDay, lastDevalDay, lastComparableValDay_PostDeval]
  // const daysOfManipulation = subData.group.includes('short_training') ? [firstComparableValDay, firstDevalDay, firstComparableValDay_PostDeval] : [lastComparableValDay, lastDevalDay, lastComparableValDay_PostDeval];
  // const daysToCheckManipulationActivated = daysOfManipulation.filter(x => !!x && x < dayOfExperiment)
  // const manipulationActivationdays = subData.day.filter((x, i) => daysToCheckManipulationActivated.includes(x) && subData.activateManipulation[i] == true && !!subData.endTime[i])
  // // const manipulationActivationdays2 = subData.day.filter((x, i) => daysToCheckManipulationActivated.includes(x) && subData.activateManipulation[i] == true && !!subData.manipulationConfirmationTime[i]).filter((x, i, s) => s.indexOf(x) === i) // the last part just takes the unique values
  // const manipulationActivationdays2 = subData.day.filter((x, i) => daysToCheckManipulationActivated.includes(x) && subData.activateManipulation[i] == true && !!subData.manipulationAlertTime[i]).filter((x, i, s) => s.indexOf(x) === i) // the last part just takes the unique values
  // if ((daysToCheckManipulationActivated.length !== manipulationActivationdays.length && daysToCheckManipulationActivated.length !== manipulationActivationdays2.length) && n_entriesToday >= nTrialsBeforeNotifyGameOver) { // added the latter to show game over only after a few entries (to allow online fixes when necessary [and before game ver message is shown])
  //   return true
  // }

  return false
}

function recordIfShouldBeExcluded(subData, dayOfExperiment, dayToFinishExperiment, nDailyEntriesRequired) {
  let shouldBeExcluded = false;
  let exclusionReason = [];
  if (dayOfExperiment < dayToFinishExperiment) {
    // Check if the participant entered EVERY DAY:
    const entriesByDay = subData.day.filter((x, i, self) => !!x && x < dayOfExperiment && (!!subData.outcomeTime[i] || !!subData.endTime[i]))
    const possibleDaysWithEntries = Array.from({ length: dayOfExperiment - 1 }, (_, i) => i + 1)
    const countsPerDAY = possibleDaysWithEntries.map(val => entriesByDay.reduce((a, v) => (v === val ? a + 1 : a), 0))
    if (countsPerDAY.some(x => x < nDailyEntriesRequired)) {
      exclusionReason.push(`No${nDailyEntriesRequired}EntriesEveryDay`);
      shouldBeExcluded = true;
    }

    // Check if there was a day where the MANIPULATION WAS NOT ACTIVATED:
    const daysOfManipulation = controlDays.concat(devalDays);
    const daysToCheckManipulationActivated = daysOfManipulation.filter(x => !!x && x < dayOfExperiment)
    const manipulationActivationdays = subData.day.filter((x, i) => daysToCheckManipulationActivated.includes(x) && subData.activateManipulation[i] == true && !!subData.endTime[i])
    // const manipulationActivationdays2 = subData.day.filter((x, i) => daysToCheckManipulationActivated.includes(x) && subData.activateManipulation[i] == true && !!subData.manipulationConfirmationTime[i]).filter((x, i, s) => s.indexOf(x) === i) // the last part just takes the unique values
    const manipulationActivationdays2 = subData.day.filter((x, i) => daysToCheckManipulationActivated.includes(x) && subData.activateManipulation[i] == true && !!subData.manipulationAlertTime[i]).filter((x, i, s) => s.indexOf(x) === i) // the last part just takes the unique values
    if ((daysToCheckManipulationActivated.length !== manipulationActivationdays.length && daysToCheckManipulationActivated.length !== manipulationActivationdays2.length)) { // added the latter to show game over only after a few entries (to allow online fixes when necessary [and before game ver message is shown])
      exclusionReason.push(`DidNotSeeAllManipulatinos`);
      shouldBeExcluded = true;
    }
  }
  return { shouldBeExcluded: shouldBeExcluded, exclusionReason: exclusionReason };
}

// ****************************************************************
//           LOGIC / Run Data (calculate run parameters):
// ----------------------------------------------------------------
var logic = {
  isCalledFromInstructions: function () {
    return !!document.getElementById('instructions_iframe') || document.referrer.includes(settings.instructionsFileName)
  },
  initialize: function (subData, settings) {
    const noDataYet = !Object.keys(subData).length; // check if this is the first entry

    // check if running localy or on the server and determine if called from within the instructions (for the the embedded demo):
    var isCalledFromInstructions = this.isCalledFromInstructions();

    // CHECK IF INSTRUCTIONS
    // -------------------------------------------------------
    if (settings.allowInstructions) {
      if (!noDataYet) {
        var instructionCompletion = subData.completedInstructions.filter((x) => x !== undefined);
        instructionCompletion = instructionCompletion[instructionCompletion.length - 1];
      }
      if (!isCalledFromInstructions && (noDataYet || !instructionCompletion)) {
        var dataToSave = {
          subId: data_helper.get_subject_id(),
          showInstructions: true,
        };
        return dataToSave;
      }
    }
    // CHECK AND SET DEMO
    // -------------------------------------------------------
    // demo vars defaults:
    let isDemo = null;
    let demoTrialNum = null

    if (settings.allowDemo) { // check if demo is available and set variables accordingly
      if (isCalledFromInstructions) {  //check if demo;//if it's the first time the app is loaded for that subject or if it was demo the last time but the demo is still not completed
        isDemo = true;

        if (subData.instructionsStartedFlag[subData.instructionsStartedFlag.length - 1] || // I think those below are redundant after I added this condition
          noDataYet || subData.demoTrialNum[subData.demoTrialNum.length - 1] === null || subData.demoTrialNum[subData.demoTrialNum.length - 1] === undefined) { // if this is the first demo trial after instructions
          demoTrialNum = 0
        } else {
          demoTrialNum = subData.demoTrialNum[subData.demoTrialNum.length - 1] + 1
        }
      } else {
        isDemo = false;
      }
    }
    // CHECK IF THIS IS THE FIRST REAL TRIAL
    // -------------------------------------------------------
    if (settings.allowDemo) { // if there is no demo (and instructions)
      var isFirstTime = !noDataYet && ((subData.isDemo[subData.isDemo.length - 1] && !isCalledFromInstructions) || (subData.isFirstTime[subData.isFirstTime.length - 1] && !subData.endTime[subData.endTime.length - 1])) ? true : false;
    } else {
      var isFirstTime = noDataYet || (subData.isFirstTime[subData.isFirstTime.length - 1] && !subData.endTime[subData.endTime.length - 1]);
    }
    // -------------------------------------------------------

    if (isDemo) {

      var dayOfExperiment = null;
      let demoVars = settings.demoCycle[demoTrialNum % Object.keys(settings.demoCycle).length];
      // assign the variables for the demo:
      isWin = demoVars.isWin;
      isLoss = demoVars.isLoss;
      whichManipulation = demoVars.whichManipulation;
      activateManipulation = demoVars.activateManipulation;
      isUnderManipulation = demoVars.isUnderManipulation;
      consumptionTest = demoVars.consumptionTest;
      var toHideOutcome = demoVars.toHideOutcome;
      var resetContainer = demoVars.resetContainer;
      var giveFeedbackOnDevaluedOutcome = false;
      var group = 'irrelevant';
      var endExperiment = false;
      var shouldBeExcluded = false;
      var exclusionReason = [];
      var todayInitialOutcomes = [];

    } else {

      // Get counter-balanced stuff and Initialize variables:
      [group, devalDays, controlDays, dayToFinishExperiment] = setCounterBalancedStuff(data_helper.get_subject_id(), app_settings);
      var isUnderManipulation = false;
      var whichManipulation = null;
      var activateManipulation = false;
      var consumptionTest = false;
      var giveFeedbackOnDevaluedOutcome = false;
      var todayInitialOutcomes = [];
      isLoss = false;

      // Get the day of the experiment:
      const expStartingTime = new Date(subData["startTime"].find((x) => !!x)); // finds the first element with a valid IDBCursorWithValue.
      daysFromBeginning = !isNaN(expStartingTime.getTime()) ? dateDiff(expStartingTime, new Date(), settings.experimentalDayStartingHour) : 0; // "new Date()" is getting the current time.
      dayOfExperiment = daysFromBeginning + 1;
      console.log(`DAY OF EXPERIMENT: ${dayOfExperiment}`)

      if (!isFirstTime) { // if there is some data for this subject (i.e., not the first entry)

        // DEVALUATION / STILL-VALUED tests(check and set)
        // -------------------------------------------------------
        completeEntriesToday = subData.endTime.filter((x, i) => (!!x || !!subData.outcomeTime[i]) && subData.day[i] === dayOfExperiment).length; // number of entries TODAY that got to the END [* reffers to the experimental day 24h - could be form 5:00 to 5:00 for example]
        devalueToday = devalDays.includes(dayOfExperiment) ? true : false;
        controlManipToday = controlDays.includes(dayOfExperiment) ? true : false;
        if (devalueToday || controlManipToday) {
          whichManipulation = ['devaluation', 'still_valued'].filter((item, i) => [devalueToday, controlManipToday][i])[0];
        };

        // End experiment & Exclusions
        // ---------------------------
        var endExperiment = finishExperiment(subData, dayOfExperiment, dayToFinishExperiment, settings.nTrialsBeforeNotifyGameOver);

        // Check if the subject should have been excluded (Was added when I decided not to use ongoing exclusions)
        // ----------------------------------------------
        var { shouldBeExcluded, exclusionReason } = recordIfShouldBeExcluded(subData, dayOfExperiment, dayToFinishExperiment, settings.nDailyEntriesRequired())

        // Reset container
        // ---------------------------
        var resetContainer = settings.rewards.notifyRewardContainerReset && dayOfExperiment > 1 && !endExperiment ? checkIfResetContainer(subData, dayOfExperiment) : false; // check if reset container

        // Check if win
        // ---------------------------
        isWin = settings.rewards.enforceFirstEntryNoWinSecondEntryWin && resetContainer ? false : checkWinning(subData, settings.rewards.isRatioSchedule, settings.rewards.winningChancePerUnit(), settings.rewards.winAnywayIfMultipleNonWins, settings.rewards.enforceFirstEntryNoWinSecondEntryWin);
        if (settings.rewards.includeAversiveOutcome) {
          isLoss = checkLosing(subData, settings.rewards.isRatioSchedule, settings.rewards.losingChancePerUnit());
          if (isLoss && isWin) {
            // if both win and loss, do 50/50 and change the other to false:
            isWin = Math.random() < 0.5 ? true : false;
            isLoss = !isWin;
          }
        }

        //  override if enforce_n_random_winnings_during_minimum_entries is true and the minimum number of entries is not reached:
        if (settings.rewards.enforce_n_random_winnings_during_minimum_entries && completeEntriesToday < settings.entry_to_manipulate_in) {
          if (!completeEntriesToday) {
            // create today's initial outcomes
            if (!!whichManipulation) {
              // if there is manipulation (array shorter, because the manipulation trial is fixed to be a win)
              todayInitialOutcomes = shuffle(Array(settings.rewards.n_random_winnings_during_minimum_entries - 1).fill(true).concat(Array(settings.entry_to_manipulate_in - settings.rewards.n_random_winnings_during_minimum_entries).fill(false)))
            } else {
              // if there is no manipulation
              todayInitialOutcomes = shuffle(Array(settings.rewards.n_random_winnings_during_minimum_entries).fill(true).concat(Array(settings.entry_to_manipulate_in - settings.rewards.n_random_winnings_during_minimum_entries).fill(false)))
            }
          } else {
            if (subData.todayInitialOutcomes && subData.todayInitialOutcomes.length > 0) { // just in case make sure it exists
              todayInitialOutcomes = subData.todayInitialOutcomes[subData.todayInitialOutcomes.length - 1];
            }
          }
          if (todayInitialOutcomes[completeEntriesToday] !== undefined) {
            isWin = todayInitialOutcomes[completeEntriesToday]
          }
        }

        // OPERATE MANIPULATION DAY (DEVALUATION)
        // ---------------------------------------
        if (!endExperiment && (devalueToday || controlManipToday)) {
          if (completeEntriesToday >= settings.entry_to_manipulate_in - 1) { // checks if in manipulation period
            // check if this is the first time the outcome should be manipulation that day
            if (!subData.activateManipulation.filter((x, i) => x === true && subData.day[i] === dayOfExperiment && !!subData.manipulationConfirmationTime[i]).length) { // There was no trial with ACTIVATION on this DAY that was confirmed by the user
              activateManipulation = true;
              consumptionTest = true;
              isWin = true; // On the devaluation indication time there is a certain win...
              isLoss = false; // ... and no loss
            } else if (!subData.manipChecConfirmationTime.filter((x, i) => !!x && subData.day[i] === dayOfExperiment).length && // if there is no confirmation of found the cave today
              subData.manipCheckAlertTime.filter((x, i) => !!x && subData.day[i] === dayOfExperiment).length < settings.nTimesToShowCaveIfNotEntering && // and there was a presentation of the cave that do not exceed a nTimesToShowCaveIfNotEntering.
              (new Date) - (new Date(subData.manipCheckAlertTime.filter((x, i) => !!x && subData.day[i] === dayOfExperiment).slice(-1)[0])) < settings.maxSecsToShowCaveAgainIfNotEntering * 1000) { // and the time past since the previous presentation is less than maxTimeToShowCaveAgainIfNotEntering
              consumptionTest = true;
              isUnderManipulation = true;
            } else {
              isUnderManipulation = true;
            };
          }
        }

        var giveFeedbackOnDevaluedOutcome = settings.feedback_in_devalued_actions && isUnderManipulation;

        // Hide outcome
        // ---------------------------
        var toHideOutcome = !endExperiment ? checkIfToHideOutcome(subData, settings.hideOutcome, dayOfExperiment, isUnderManipulation, group, completeEntriesToday) : false;

      } else { // if it is the first entry
        isWin = settings.rewards.enforceFirstEntryNoWinSecondEntryWin ? false : checkWinning(subData, settings.rewards.isRatioSchedule, settings.rewards.winningChancePerUnit(), settings.rewards.winAnywayIfMultipleNonWins);
        if (settings.includeAversiveOutcome) {
          isLoss = checkLosing(subData, settings.rewards.isRatioSchedule, settings.rewards.losingChancePerUnit());
          if (isLoss && isWin) {
            // if both win and loss, do 50/50 and change the other to false:
            isWin = Math.random() < 0.5 ? true : false;
            isLoss = !isWin;
          }
        }

        // override isWin if enforce_n_random_winnings_during_minimum_entries is true:
        if (settings.rewards.enforce_n_random_winnings_during_minimum_entries) {
          // create today's initial outcomes
          if (!!whichManipulation) {
            // if there is manipulation (array shorter, because the manipulation trial is fixed to be a win)
            todayInitialOutcomes = shuffle(Array(settings.rewards.n_random_winnings_during_minimum_entries - 1).fill(true).concat(Array(settings.entry_to_manipulate_in - settings.rewards.n_random_winnings_during_minimum_entries).fill(false)))
          } else {
            // if there is no manipulation
            todayInitialOutcomes = shuffle(Array(settings.rewards.n_random_winnings_during_minimum_entries).fill(true).concat(Array(settings.entry_to_manipulate_in - settings.rewards.n_random_winnings_during_minimum_entries).fill(false)))
          }
          isWin = todayInitialOutcomes[0]
        }

        // dayOfExperiment = 1;
        var resetContainer = false;
      }
    }
    let cost = InitializeCost(settings.cost)
    let reward = isWin ? assignReward(settings.rewards) : 0; // set reward value if winning, or set to 0 if not
    reward = isLoss ? assignLoss(settings.rewards) : reward; // set reward value if winning, or set to 0 if not
    let baselineAccumulatedReward = getBaselineAccumulatedReward(subData, settings); // Get Accumulated Reward Baseline (i.e., before this trial)

    var dataToSave = {
      subId: data_helper.get_subject_id(),
      group: group,
      day: dayOfExperiment,
      isWin: isWin,
      isLoss: isLoss,
      reward: reward,
      cost: cost,
      baselineAccumulatedReward: baselineAccumulatedReward,
      resetContainer: resetContainer,
      manipulationToday: whichManipulation,
      activateManipulation: activateManipulation,
      isUnderManipulation: isUnderManipulation,
      giveFeedbackOnDevaluedOutcome: giveFeedbackOnDevaluedOutcome,
      consumptionTest: consumptionTest,
      hideOutcome: toHideOutcome,
      isFirstTime: isFirstTime,
      todayInitialOutcomes: todayInitialOutcomes,
      endExperiment: endExperiment,
      showInstructions: false,
      isDemo: isDemo,
      demoTrialNum: demoTrialNum,
      shouldBeExcluded: shouldBeExcluded,
      exclusionReason: exclusionReason,
    };
    return dataToSave;
  },
  isManipulation: function (runData, settings) {
    if (!!settings.forceDeval)
      return settings.forceDeval;

    if (runData.activateManipulation)
      return runData.manipulationToday;

    return null;
  },
  getCost: function (runData, settings, cost_on) {
    return settings.cost.isCost
      && settings.cost.presentCost
      && (runData.cost.length > cost_on)
      && runData.cost[cost_on];
  },
  cost_on: {
    entrance: 0,
    click1: 1,
    click2: 2
  }
};
