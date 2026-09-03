// ==================================================
// REAL-TIME CONTINUOUS RISK ENGINE
// ==================================================
//
// This engine evaluates authenticated activity while
// the user is actively using the application.
//
// IMPORTANT:
// --------------------------------------------------
// This is NOT an after-the-fact log analyzer.
//
// server.js should:
//
//   1. Receive the request
//   2. Collect the activity/context
//   3. Send the activity to this engine
//   4. Receive the risk decision
//   5. Enforce the decision
//   6. Only perform the protected operation when allowed
//
// ==================================================
//
// RISK LEVELS
// --------------------------------------------------
// LOW       = 0 - 30
// MEDIUM    = 31 - 59
// HIGH      = 60 - 79
// CRITICAL  = 80 - 100
//
// ==================================================
//
// DECAY
// --------------------------------------------------
// Every qualifying 30-second period of normal activity
// reduces accumulated risk by 1.
//
// ==================================================
//
// STEP-UP
// --------------------------------------------------
// HIGH immediately triggers step-up.
// Successful step-up reduces score by 15.
// Failed step-up does not reduce the score.
//
// ==================================================
//
// CRITICAL
// --------------------------------------------------
// CRITICAL immediately requires session termination.
//
// ==================================================


/* ==================================================
   CONSTANTS
   ================================================== */

const RISK_LEVELS = Object.freeze({

  LOW:
    "LOW",

  MEDIUM:
    "MEDIUM",

  HIGH:
    "HIGH",

  CRITICAL:
    "CRITICAL"

});


const RISK_THRESHOLDS = Object.freeze({

  LOW_MAX:
    30,

  MEDIUM_MAX:
    59,

  HIGH_MAX:
    79,

  CRITICAL_MAX:
    100

});


const SCORE_MIN =
  0;


const SCORE_MAX =
  100;


const DECAY_INTERVAL_MS =
  30 * 1000;


const NORMAL_ACTIVITY_DECAY =
  1;


const SUCCESSFUL_STEP_UP_REDUCTION =
  15;


/* ==================================================
   SIGNAL REGISTRY
   ==================================================
   
   Every risk-producing signal is registered here.

   IMPORTANT:
   A signal MUST NOT be silently scored somewhere
   else in the application.

   This registry is the authoritative signal list.
   ================================================== */

const SIGNALS = Object.freeze({

  // -----------------------------------------------
  // BASELINE
  // -----------------------------------------------

  NORMAL_ACTIVITY: {

    id:
      1,

    name:
      "NORMAL_ACTIVITY",

    score:
      0,

    category:
      "BASELINE"

  },


  // -----------------------------------------------
  // EMPLOYEE DIRECTORY
  // -----------------------------------------------

  CROSS_USER_EMPLOYEE_PROFILE: {

    id:
      2,

    name:
      "CROSS_USER_EMPLOYEE_PROFILE",

    score:
      1,

    category:
      "BEHAVIORAL"

  },


  // -----------------------------------------------
  // PROJECT ACCESS
  // -----------------------------------------------

  UNASSIGNED_PROJECT_ACCESS: {

    id:
      3,

    name:
      "UNASSIGNED_PROJECT_ACCESS",

    score:
      1,

    category:
      "BEHAVIORAL"

  },


  // -----------------------------------------------
  // RESOURCE SENSITIVITY
  // -----------------------------------------------

  SENSITIVE_RESOURCE: {

    id:
      4,

    name:
      "SENSITIVE_RESOURCE",

    score:
      2,

    category:
      "RESOURCE"

  },


  // -----------------------------------------------
  // DOCUMENT ACTIONS
  // -----------------------------------------------
  //
  // FINALIZED WEIGHTS:
  //
  // VIEW     = 1
  // COPY     = 2
  // DOWNLOAD = 3
  // SHARE    = 4
  // DELETE   = 5
  //
  // -----------------------------------------------

  DOCUMENT_VIEW: {

    id:
      5,

    name:
      "DOCUMENT_VIEW",

    score:
      1,

    category:
      "DOCUMENT"

  },


  DOCUMENT_COPY: {

    id:
      6,

    name:
      "DOCUMENT_COPY",

    score:
      2,

    category:
      "DOCUMENT"

  },


  DOCUMENT_DOWNLOAD: {

    id:
      7,

    name:
      "DOCUMENT_DOWNLOAD",

    score:
      3,

    category:
      "DOCUMENT"

  },


  DOCUMENT_SHARE: {

    id:
      8,

    name:
      "DOCUMENT_SHARE",

    score:
      4,

    category:
      "DOCUMENT"

  },


  DOCUMENT_DELETE: {

    id:
      9,

    name:
      "DOCUMENT_DELETE",

    score:
      5,

    category:
      "DOCUMENT"

  },


  // -----------------------------------------------
  // DOCUMENT CLASSIFICATION
  // -----------------------------------------------

  CONFIDENTIAL_DOCUMENT: {

    id:
      10,

    name:
      "CONFIDENTIAL_DOCUMENT",

    score:
      2,

    category:
      "CLASSIFICATION"

  },


  RESTRICTED_DOCUMENT: {

    id:
      11,

    name:
      "RESTRICTED_DOCUMENT",

    score:
      3,

    category:
      "CLASSIFICATION"

  },


  // -----------------------------------------------
  // BEHAVIORAL ANOMALY
  // -----------------------------------------------

  UNUSUAL_ACTIVITY: {

    id:
      12,

    name:
      "UNUSUAL_ACTIVITY",

    score:
      3,

    category:
      "BEHAVIORAL"

  }

});


/* ==================================================
   CORRELATION BONUS REGISTRY
   ==================================================
   
   Correlations are ADDITIONAL points.

   The individual signals are still scored.

   Example:

      DOCUMENT_DOWNLOAD
             +
      RESTRICTED_DOCUMENT

   The download score is added first.

   Then the correlation bonus is added.

   This means correlation does not replace the
   original signal.

   ================================================== */

const CORRELATIONS = Object.freeze({

  // -----------------------------------------------
  // RESTRICTED DOCUMENT + DOWNLOAD
  // -----------------------------------------------

  RESTRICTED_DOCUMENT_DOWNLOAD: {

    id:
      1,

    name:
      "RESTRICTED_DOCUMENT_DOWNLOAD",

    signals: [

      "DOCUMENT_DOWNLOAD",

      "RESTRICTED_DOCUMENT"

    ],

    bonus:
      2

  },


  // -----------------------------------------------
  // RESTRICTED DOCUMENT + COPY
  // -----------------------------------------------

  RESTRICTED_DOCUMENT_COPY: {

    id:
      2,

    name:
      "RESTRICTED_DOCUMENT_COPY",

    signals: [

      "DOCUMENT_COPY",

      "RESTRICTED_DOCUMENT"

    ],

    bonus:
      2

  },


  // -----------------------------------------------
  // RESTRICTED DOCUMENT + SHARE
  // -----------------------------------------------

  RESTRICTED_DOCUMENT_SHARE: {

    id:
      3,

    name:
      "RESTRICTED_DOCUMENT_SHARE",

    signals: [

      "DOCUMENT_SHARE",

      "RESTRICTED_DOCUMENT"

    ],

    bonus:
      3

  },


  // -----------------------------------------------
  // RESTRICTED DOCUMENT + DELETE
  // -----------------------------------------------

  RESTRICTED_DOCUMENT_DELETE: {

    id:
      4,

    name:
      "RESTRICTED_DOCUMENT_DELETE",

    signals: [

      "DOCUMENT_DELETE",

      "RESTRICTED_DOCUMENT"

    ],

    bonus:
      3

  },


  // -----------------------------------------------
  // CONFIDENTIAL DOCUMENT + SHARE
  // -----------------------------------------------

  CONFIDENTIAL_DOCUMENT_SHARE: {

    id:
      5,

    name:
      "CONFIDENTIAL_DOCUMENT_SHARE",

    signals: [

      "DOCUMENT_SHARE",

      "CONFIDENTIAL_DOCUMENT"

    ],

    bonus:
      2

  },


  // -----------------------------------------------
  // CONFIDENTIAL DOCUMENT + DELETE
  // -----------------------------------------------

  CONFIDENTIAL_DOCUMENT_DELETE: {

    id:
      6,

    name:
      "CONFIDENTIAL_DOCUMENT_DELETE",

    signals: [

      "DOCUMENT_DELETE",

      "CONFIDENTIAL_DOCUMENT"

    ],

    bonus:
      2

  },


  // -----------------------------------------------
  // CROSS-USER + UNASSIGNED PROJECT
  // -----------------------------------------------

  CROSS_USER_UNASSIGNED_ACCESS: {

    id:
      7,

    name:
      "CROSS_USER_UNASSIGNED_ACCESS",

    signals: [

      "CROSS_USER_EMPLOYEE_PROFILE",

      "UNASSIGNED_PROJECT_ACCESS"

    ],

    bonus:
      2

  },


  // -----------------------------------------------
  // CROSS-USER + SENSITIVE RESOURCE
  // -----------------------------------------------

  CROSS_USER_SENSITIVE_ACCESS: {

    id:
      8,

    name:
      "CROSS_USER_SENSITIVE_ACCESS",

    signals: [

      "CROSS_USER_EMPLOYEE_PROFILE",

      "SENSITIVE_RESOURCE"

    ],

    bonus:
      2

  },


  // -----------------------------------------------
  // UNASSIGNED PROJECT + SENSITIVE RESOURCE
  // -----------------------------------------------

  UNASSIGNED_SENSITIVE_ACCESS: {

    id:
      9,

    name:
      "UNASSIGNED_SENSITIVE_ACCESS",

    signals: [

      "UNASSIGNED_PROJECT_ACCESS",

      "SENSITIVE_RESOURCE"

    ],

    bonus:
      2

  }

});


/* ==================================================
   SESSION RISK STATES
   ================================================== */

const riskStates =
  new Map();


/* ==================================================
   UTILITY: CLAMP SCORE
   ================================================== */

function clampScore(
  score
) {

  return Math.max(

    SCORE_MIN,

    Math.min(

      SCORE_MAX,

      score

    )

  );

}


/* ==================================================
   UTILITY: RISK LEVEL
   ================================================== */

function calculateRiskLevel(
  score
) {

  if (
    score <=
    RISK_THRESHOLDS.LOW_MAX
  ) {

    return RISK_LEVELS.LOW;

  }


  if (
    score <=
    RISK_THRESHOLDS.MEDIUM_MAX
  ) {

    return RISK_LEVELS.MEDIUM;

  }


  if (
    score <=
    RISK_THRESHOLDS.HIGH_MAX
  ) {

    return RISK_LEVELS.HIGH;

  }


  return RISK_LEVELS.CRITICAL;

}


/* ==================================================
   UTILITY: DECISION
   ================================================== */

function calculateDecision(
  score
) {

  const riskLevel =
    calculateRiskLevel(
      score
    );


  // -----------------------------------------------
  // CRITICAL
  // -----------------------------------------------

  if (
    riskLevel ===
    RISK_LEVELS.CRITICAL
  ) {

    return {

      action:
        "TERMINATE_SESSION",

      stepUpRequired:
        false

    };

  }


  // -----------------------------------------------
  // HIGH
  // -----------------------------------------------

  if (
    riskLevel ===
    RISK_LEVELS.HIGH
  ) {

    return {

      action:
        "STEP_UP",

      stepUpRequired:
        true

    };

  }


  // -----------------------------------------------
  // LOW / MEDIUM
  // -----------------------------------------------

  return {

    action:
      "ALLOW",

    stepUpRequired:
      false

  };

}


/* ==================================================
   CREATE SESSION STATE
   ================================================== */

function createRiskState(
  sessionId,
  username
) {

  const now =
    Date.now();


  const state = {

    sessionId,

    username,

    score:
      0,

    riskLevel:
      RISK_LEVELS.LOW,

    decision:
      "ALLOW",

    stepUpRequired:
      false,

    createdAt:
      now,

    updatedAt:
      now,

    lastActivityAt:
      now,

    lastDecayAt:
      now,

    activeSignals: [],

    signalHistory: [],

    correlationHistory: [],

    decayHistory: [],

    stepUpHistory: [],

    eventHistory: []

  };


  riskStates.set(

    sessionId,

    state

  );


  return state;

}


/* ==================================================
   GET SESSION STATE
   ================================================== */

function getRiskState(
  sessionId,
  username = "unknown"
) {

  if (
    !sessionId
  ) {

    throw new Error(
      "Risk Engine requires a session ID."
    );

  }


  let state =
    riskStates.get(
      sessionId
    );


  if (!state) {

    state =
      createRiskState(

        sessionId,

        username

      );

  }


  return state;

}


/* ==================================================
   INTERNAL: REFRESH DECISION
   ================================================== */

function refreshDecision(
  state
) {

  state.score =
    clampScore(
      state.score
    );


  state.riskLevel =
    calculateRiskLevel(
      state.score
    );


  const decision =
    calculateDecision(
      state.score
    );


  state.decision =
    decision.action;


  state.stepUpRequired =
    decision.stepUpRequired;


  state.updatedAt =
    Date.now();

}


/* ==================================================
   APPLY SIGNAL
   ==================================================
   
   This is the main scoring function.

   server.js sends the event to this function.

   ================================================== */

function applySignal(
  sessionId,
  username,
  signalName,
  metadata = {}
) {

  const state =
    getRiskState(

      sessionId,

      username

    );


  const signal =
    SIGNALS[
      signalName
    ];


  if (!signal) {

    throw new Error(

      `Unknown risk signal: ${signalName}`

    );

  }


  const previousScore =
    state.score;


  const newScore =
    clampScore(

      previousScore +
      signal.score

    );


  state.score =
    newScore;


  state.activeSignals.push(
    signalName
  );


  const signalRecord = {

    signalId:
      signal.id,

    signal:
      signal.name,

    category:
      signal.category,

    score:
      signal.score,

    previousScore,

    resultingScore:
      newScore,

    metadata,

    timestamp:
      new Date().toISOString()

  };


  state.signalHistory.push(
    signalRecord
  );


  state.eventHistory.push({

    type:
      "SIGNAL",

    signal:
      signal.name,

    timestamp:
      new Date().toISOString()

  });


  state.lastActivityAt =
    Date.now();


  refreshDecision(
    state
  );


  return {

    score:
      state.score,

    riskLevel:
      state.riskLevel,

    decision:
      state.decision,

    stepUpRequired:
      state.stepUpRequired,

    signal:
      signalRecord

  };

}


/* ==================================================
   CORRELATION CHECK
   ==================================================
   
   Correlations are evaluated against the signals
   accumulated during the current session.

   Each correlation is applied only once.

   ================================================== */

function evaluateCorrelations(
  sessionId,
  username
) {

  const state =
    getRiskState(

      sessionId,

      username

    );


  const results = [];


  for (
    const correlation
    of Object.values(
      CORRELATIONS
    )
  ) {

    const alreadyApplied =
      state.correlationHistory.some(

        record =>
          record.correlation ===
          correlation.name

      );


    if (
      alreadyApplied
    ) {

      continue;

    }


    const matched =
      correlation.signals.every(

        requiredSignal =>

          state.activeSignals.includes(
            requiredSignal
          )

      );


    if (!matched) {

      continue;

    }


    const previousScore =
      state.score;


    state.score =
      clampScore(

        state.score +
        correlation.bonus

      );


    const record = {

      correlationId:
        correlation.id,

      correlation:
        correlation.name,

      signals:
        correlation.signals,

      bonus:
        correlation.bonus,

      previousScore,

      resultingScore:
        state.score,

      timestamp:
        new Date().toISOString()

    };


    state.correlationHistory.push(
      record
    );


    state.eventHistory.push({

      type:
        "CORRELATION",

      correlation:
        correlation.name,

      timestamp:
        new Date().toISOString()

    });


    results.push(
      record
    );

  }


  refreshDecision(
    state
  );


  return {

    applied:
      results.length > 0,

    correlations:
      results,

    score:
      state.score,

    riskLevel:
      state.riskLevel,

    decision:
      state.decision,

    stepUpRequired:
      state.stepUpRequired

  };

}


/* ==================================================
   RECORD LIVE ACTIVITY
   ==================================================
   
   Updates the user's active session telemetry.

   ================================================== */

function recordActivity(
  sessionId,
  username,
  activity = {}
) {

  const state =
    getRiskState(

      sessionId,

      username

    );


  state.lastActivityAt =
    Date.now();


  state.updatedAt =
    Date.now();


  state.eventHistory.push({

    type:
      "ACTIVITY",

    activity,

    timestamp:
      new Date().toISOString()

  });


  return {

    score:
      state.score,

    riskLevel:
      state.riskLevel,

    decision:
      state.decision,

    stepUpRequired:
      state.stepUpRequired

  };

}


/* ==================================================
   NORMAL ACTIVITY DECAY
   ==================================================
   
   IMPORTANT:
   
   Decay is NOT automatically applied simply because
   30 seconds have passed.
   
   The activity must qualify as normal activity.
   
   Examples in this application include:
   
   - viewing own employee profile
   - accessing an assigned project
   - ordinary workspace activity
   - other legitimate actions that server.js
     identifies as normal
   
   ================================================== */

function applyNormalActivityDecay(
  sessionId,
  username,
  qualifiesAsNormal = false
) {

  const state =
    getRiskState(

      sessionId,

      username

    );


  if (
    !qualifiesAsNormal
  ) {

    return {

      applied:
        false,

      reason:
        "Activity does not qualify for normal-activity decay.",

      score:
        state.score,

      riskLevel:
        state.riskLevel,

      decision:
        state.decision

    };

  }


  const now =
    Date.now();


  const elapsed =
    now -
    state.lastDecayAt;


  const intervals =
    Math.floor(

      elapsed /
      DECAY_INTERVAL_MS

    );


  if (
    intervals <= 0
  ) {

    return {

      applied:
        false,

      reason:
        "30-second decay interval has not elapsed.",

      score:
        state.score,

      riskLevel:
        state.riskLevel,

      decision:
        state.decision

    };

  }


  const previousScore =
    state.score;


  const maximumReduction =
    intervals *
    NORMAL_ACTIVITY_DECAY;


  const actualReduction =
    Math.min(

      previousScore,

      maximumReduction

    );


  state.score =
    clampScore(

      previousScore -
      actualReduction

    );


  state.lastDecayAt =
    now;


  state.lastActivityAt =
    now;


  const decayRecord = {

    type:
      "NORMAL_ACTIVITY_DECAY",

    intervals,

    reduction:
      actualReduction,

    previousScore,

    resultingScore:
      state.score,

    timestamp:
      new Date().toISOString()

  };


  state.decayHistory.push(
    decayRecord
  );


  state.eventHistory.push(
    decayRecord
  );


  refreshDecision(
    state
  );


  return {

    applied:
      true,

    reduction:
      actualReduction,

    intervals,

    score:
      state.score,

    riskLevel:
      state.riskLevel,

    decision:
      state.decision,

    stepUpRequired:
      state.stepUpRequired

  };

}


/* ==================================================
   SUCCESSFUL STEP-UP
   ==================================================
   
   Finalized behavior:
   
   HIGH
      ↓
   Step-Up
      ↓
   Authentication succeeds
      ↓
   Score -15
      ↓
   Return user to original page/action
   
   ================================================== */

function applySuccessfulStepUp(
  sessionId,
  username,
  metadata = {}
) {

  const state =
    getRiskState(

      sessionId,

      username

    );


  const previousScore =
    state.score;


  const reduction =
    Math.min(

      previousScore,

      SUCCESSFUL_STEP_UP_REDUCTION

    );


  state.score =
    clampScore(

      previousScore -
      reduction

    );


  const stepUpRecord = {

    type:
      "STEP_UP_SUCCESS",

    reduction,

    previousScore,

    resultingScore:
      state.score,

    metadata,

    timestamp:
      new Date().toISOString()

  };


  state.stepUpHistory.push(
    stepUpRecord
  );


  state.eventHistory.push(
    stepUpRecord
  );


  refreshDecision(
    state
  );


  return {

    success:
      true,

    score:
      state.score,

    riskLevel:
      state.riskLevel,

    decision:
      state.decision,

    stepUpRequired:
      state.stepUpRequired,

    returnToOriginalResource:
      true

  };

}


/* ==================================================
   FAILED STEP-UP
   ==================================================
   
   Finalized behavior:
   
   Step-Up fails
      ↓
   User remains on step-up/login page
      ↓
   No risk reduction
   ================================================== */

function applyFailedStepUp(
  sessionId,
  username,
  metadata = {}
) {

  const state =
    getRiskState(

      sessionId,

      username

    );


  const failedRecord = {

    type:
      "STEP_UP_FAILURE",

    reduction:
      0,

    score:
      state.score,

    metadata,

    timestamp:
      new Date().toISOString()

  };


  state.stepUpHistory.push(
    failedRecord
  );


  state.eventHistory.push(
    failedRecord
  );


  refreshDecision(
    state
  );


  return {

    success:
      false,

    score:
      state.score,

    riskLevel:
      state.riskLevel,

    decision:
      "STEP_UP",

    stepUpRequired:
      true,

    remainOnStepUp:
      true

  };

}


/* ==================================================
   COMPLETE LIVE EVALUATION
   ==================================================
   
   This is the function server.js will normally call
   for an activity.
   
   It:
   
      1. Records activity
      2. Applies signal
      3. Evaluates correlations
      4. Refreshes risk
      5. Returns enforcement decision
   
   ================================================== */

function evaluateActivity(
  sessionId,
  username,
  signalNames = [],
  options = {}
) {

  const state =
    getRiskState(

      sessionId,

      username

    );


  const {

    metadata = {},

    qualifiesAsNormal = false,

    applyDecay = true,

    evaluateCorrelation = true

  } = options;


  const signalResults = [];


  // -----------------------------------------------
  // NORMAL ACTIVITY DECAY
  // -----------------------------------------------

  if (
    applyDecay &&
    qualifiesAsNormal
  ) {

    applyNormalActivityDecay(

      sessionId,

      username,

      true

    );

  }


  // -----------------------------------------------
  // APPLY SIGNALS
  // -----------------------------------------------

  for (
    const signalName
    of signalNames
  ) {

    const result =
      applySignal(

        sessionId,

        username,

        signalName,

        metadata

      );


    signalResults.push(
      result
    );

  }


  // -----------------------------------------------
  // CORRELATIONS
  // -----------------------------------------------

  let correlationResult = {

    applied:
      false,

    correlations:
      []

  };


  if (
    evaluateCorrelation
  ) {

    correlationResult =
      evaluateCorrelations(

        sessionId,

        username

      );

  }


  // -----------------------------------------------
  // FINAL DECISION
  // -----------------------------------------------

  refreshDecision(
    state
  );


  return {

    sessionId,

    username,

    score:
      state.score,

    riskLevel:
      state.riskLevel,

    decision:
      state.decision,

    stepUpRequired:
      state.stepUpRequired,

    signals:
      signalResults,

    correlations:
      correlationResult.correlations,

    enforcement: {

      allow:
        state.decision ===
        "ALLOW",

      requireStepUp:
        state.decision ===
        "STEP_UP",

      terminateSession:
        state.decision ===
        "TERMINATE_SESSION"

    }

  };

}


/* ==================================================
   GET CURRENT RISK
   ================================================== */

function getCurrentRisk(
  sessionId,
  username
) {

  const state =
    getRiskState(

      sessionId,

      username

    );


  refreshDecision(
    state
  );


  return {

    sessionId:
      state.sessionId,

    username:
      state.username,

    score:
      state.score,

    riskLevel:
      state.riskLevel,

    decision:
      state.decision,

    stepUpRequired:
      state.stepUpRequired,

    lastActivityAt:
      state.lastActivityAt,

    lastDecayAt:
      state.lastDecayAt,

    updatedAt:
      state.updatedAt

  };

}


/* ==================================================
   GET COMPLETE SESSION STATE
   ==================================================
   
   Useful for the research dashboard and experiments.
   
   ================================================== */

function getDetailedRiskState(
  sessionId,
  username
) {

  const state =
    getRiskState(

      sessionId,

      username

    );


  refreshDecision(
    state
  );


  return {

    sessionId:
      state.sessionId,

    username:
      state.username,

    score:
      state.score,

    riskLevel:
      state.riskLevel,

    decision:
      state.decision,

    stepUpRequired:
      state.stepUpRequired,

    createdAt:
      state.createdAt,

    updatedAt:
      state.updatedAt,

    lastActivityAt:
      state.lastActivityAt,

    lastDecayAt:
      state.lastDecayAt,

    activeSignals: [
      ...state.activeSignals
    ],

    signalHistory: [
      ...state.signalHistory
    ],

    correlationHistory: [
      ...state.correlationHistory
    ],

    decayHistory: [
      ...state.decayHistory
    ],

    stepUpHistory: [
      ...state.stepUpHistory
    ],

    eventHistory: [
      ...state.eventHistory
    ]

  };

}


/* ==================================================
   RESET RISK STATE
   ================================================== */

function resetRiskState(
  sessionId
) {

  riskStates.delete(
    sessionId
  );

}


/* ==================================================
   REMOVE SESSION
   ==================================================
   
   Alias used when server.js logs the user out or
   terminates the session because of CRITICAL risk.
   
   ================================================== */

function destroyRiskState(
  sessionId
) {

  return resetRiskState(
    sessionId
  );

}


/* ==================================================
   SIGNAL LOOKUP
   ================================================== */

function getSignal(
  signalName
) {

  return SIGNALS[
    signalName
  ] || null;

}


/* ==================================================
   CORRELATION LOOKUP
   ================================================== */

function getCorrelation(
  correlationName
) {

  return CORRELATIONS[
    correlationName
  ] || null;

}


/* ==================================================
   EXPORTS
   ================================================== */

export {

  // Constants
  RISK_LEVELS,

  RISK_THRESHOLDS,

  SCORE_MIN,

  SCORE_MAX,

  DECAY_INTERVAL_MS,

  NORMAL_ACTIVITY_DECAY,

  SUCCESSFUL_STEP_UP_REDUCTION,


  // Registries
  SIGNALS,

  CORRELATIONS,


  // State
  createRiskState,

  getRiskState,

  getCurrentRisk,

  getDetailedRiskState,

  resetRiskState,

  destroyRiskState,


  // Scoring
  applySignal,

  evaluateCorrelations,

  evaluateActivity,

  recordActivity,


  // Decay
  applyNormalActivityDecay,


  // Step-Up
  applySuccessfulStepUp,

  applyFailedStepUp,


  // Utilities
  calculateRiskLevel,

  calculateDecision,

  getSignal,

  getCorrelation

};