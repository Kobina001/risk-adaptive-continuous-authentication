# Risk Model

## 1. Overview

The Risk Model is the core decision-making component of the Risk-Adaptive Continuous Authentication system.

The model evaluates activity performed by an authenticated user while the user is actively interacting with the application. It is designed for **real-time continuous evaluation**, rather than analyzing activity after the fact.

The application is responsible for collecting activity and contextual information and sending the activity to the risk engine. The engine evaluates the activity, updates the user's session risk state and returns a risk decision that the application enforces before allowing a protected operation to proceed.

The implemented flow is:

```text
Authenticated User
        |
        v
Application Activity
        |
        v
Activity / Context Collection
        |
        v
Risk Signal Extraction
        |
        v
Risk Engine
        |
        +----------------------+
        |                      |
        v                      v
   Risk Score            Risk Decision
                              |
              +---------------+---------------+
              |               |               |
              v               v               v
            ALLOW          STEP-UP         TERMINATE
```

The engine is therefore intended to operate as a live risk evaluation component within an authenticated session rather than as an after-the-fact log analyzer.

---

## 2. Risk Score

The risk score is bounded between **0 and 100**.

```text
Minimum Score = 0
Maximum Score = 100
```

Every risk-producing signal increases the current session score according to its registered weight.

Correlation events provide additional points when their required signals have been accumulated during the session.

The score is clamped to the permitted range so that it cannot fall below 0 or exceed 100.

---

## 3. Risk Levels

The current implementation defines four risk levels:

| Risk Level | Score Range | Decision          |
| ---------- | ----------: | ----------------- |
| LOW        |        0–30 | ALLOW             |
| MEDIUM     |       31–59 | ALLOW             |
| HIGH       |       60–79 | STEP-UP           |
| CRITICAL   |      80–100 | TERMINATE_SESSION |

The risk level is recalculated whenever the session risk state is refreshed.

### LOW

LOW represents the normal operating range of the session.

The application allows protected operations while continuing to monitor activity.

### MEDIUM

MEDIUM represents an elevated level of accumulated risk.

The session remains active and operations are allowed while additional activity continues to be evaluated.

### HIGH

HIGH represents significant accumulated risk.

A HIGH risk state immediately produces a `STEP_UP` decision and requires additional authentication.

### CRITICAL

CRITICAL represents an unacceptable level of accumulated session risk.

A CRITICAL state produces a `TERMINATE_SESSION` decision. It does not request another step-up authentication.

The application is expected to terminate the affected session.

---

## 4. Risk Signals

All risk-producing signals are maintained in the authoritative signal registry.

A signal must not be silently scored elsewhere in the application. This ensures that the risk model has a single authoritative definition of signal names, categories and scores.

### 4.1 Baseline Signal

| Signal            | Category | Score |
| ----------------- | -------- | ----: |
| `NORMAL_ACTIVITY` | BASELINE |     0 |

Normal activity does not add risk points.

Normal activity is instead relevant to the risk-decay mechanism described later in this document.

---

### 4.2 Employee Directory Signals

| Signal                        | Category   | Score |
| ----------------------------- | ---------- | ----: |
| `CROSS_USER_EMPLOYEE_PROFILE` | BEHAVIORAL |    +1 |

This signal represents activity involving another user's employee profile.

---

### 4.3 Project Access Signals

| Signal                      | Category   | Score |
| --------------------------- | ---------- | ----: |
| `UNASSIGNED_PROJECT_ACCESS` | BEHAVIORAL |    +1 |

This signal represents access to a project that is not assigned to the authenticated user.

---

### 4.4 Resource Sensitivity

| Signal               | Category | Score |
| -------------------- | -------- | ----: |
| `SENSITIVE_RESOURCE` | RESOURCE |    +2 |

This signal represents access to a resource identified by the application as sensitive.

---

### 4.5 Document Actions

Document actions use progressively increasing weights based on the sensitivity of the operation.

| Signal              | Category | Score |
| ------------------- | -------- | ----: |
| `DOCUMENT_VIEW`     | DOCUMENT |    +1 |
| `DOCUMENT_COPY`     | DOCUMENT |    +2 |
| `DOCUMENT_DOWNLOAD` | DOCUMENT |    +3 |
| `DOCUMENT_SHARE`    | DOCUMENT |    +4 |
| `DOCUMENT_DELETE`   | DOCUMENT |    +5 |

The model therefore treats viewing a document as lower risk than copying, downloading, sharing, or deleting it.

---

### 4.6 Document Classification

| Signal                  | Category       | Score |
| ----------------------- | -------------- | ----: |
| `CONFIDENTIAL_DOCUMENT` | CLASSIFICATION |    +2 |
| `RESTRICTED_DOCUMENT`   | CLASSIFICATION |    +3 |

The classification signal is scored in addition to the document action signal.

For example, a restricted document download can involve:

```text
DOCUMENT_DOWNLOAD
        +
RESTRICTED_DOCUMENT
```

followed by any applicable correlation bonus.

---

### 4.7 Behavioral Anomaly

| Signal             | Category   | Score |
| ------------------ | ---------- | ----: |
| `UNUSUAL_ACTIVITY` | BEHAVIORAL |    +3 |

This signal represents activity identified by the application as unusual.

---

## 5. Correlation Model

Correlations provide additional risk points when multiple signals occur together during the same session.

A correlation **does not replace the individual signals**.

The individual signals are scored first after which the applicable correlation bonus is added.

Each defined correlation can only be applied **once per session**.

### Correlation Registry

| Correlation                    | Required Signals                                            | Bonus |
| ------------------------------ | ----------------------------------------------------------- | ----: |
| `RESTRICTED_DOCUMENT_DOWNLOAD` | `DOCUMENT_DOWNLOAD` + `RESTRICTED_DOCUMENT`                 |    +2 |
| `RESTRICTED_DOCUMENT_COPY`     | `DOCUMENT_COPY` + `RESTRICTED_DOCUMENT`                     |    +2 |
| `RESTRICTED_DOCUMENT_SHARE`    | `DOCUMENT_SHARE` + `RESTRICTED_DOCUMENT`                    |    +3 |
| `RESTRICTED_DOCUMENT_DELETE`   | `DOCUMENT_DELETE` + `RESTRICTED_DOCUMENT`                   |    +3 |
| `CONFIDENTIAL_DOCUMENT_SHARE`  | `DOCUMENT_SHARE` + `CONFIDENTIAL_DOCUMENT`                  |    +2 |
| `CONFIDENTIAL_DOCUMENT_DELETE` | `DOCUMENT_DELETE` + `CONFIDENTIAL_DOCUMENT`                 |    +2 |
| `CROSS_USER_UNASSIGNED_ACCESS` | `CROSS_USER_EMPLOYEE_PROFILE` + `UNASSIGNED_PROJECT_ACCESS` |    +2 |
| `CROSS_USER_SENSITIVE_ACCESS`  | `CROSS_USER_EMPLOYEE_PROFILE` + `SENSITIVE_RESOURCE`        |    +2 |
| `UNASSIGNED_SENSITIVE_ACCESS`  | `UNASSIGNED_PROJECT_ACCESS` + `SENSITIVE_RESOURCE`          |    +2 |

A correlation is applied when all of its required signals are present in the session's accumulated active signals and the correlation has not previously been applied.

---

## 6. Session Risk State

Risk is maintained on a per-session basis.

Each active research session has its own risk state containing:

* Session ID
* Username
* Current risk score
* Current risk level
* Current decision
* Step-up requirement
* Creation timestamp
* Last update timestamp
* Last activity timestamp
* Last decay timestamp
* Active signals
* Signal history
* Correlation history
* Decay history
* Step-up history
* Event history

This allows risk to remain associated with the authenticated session rather than being treated as a single global score.

---

## 7. Risk Evaluation

The main live evaluation function is `evaluateActivity()`.

For a submitted activity, the engine performs the following sequence:

```text
1. Obtain the session risk state
        |
        v
2. Determine whether normal-activity decay applies
        |
        v
3. Apply qualifying risk signals
        |
        v
4. Evaluate correlations
        |
        v
5. Refresh the risk level and decision
        |
        v
6. Return the risk and enforcement result
```

The returned evaluation contains:

* `sessionId`
* `username`
* `score`
* `riskLevel`
* `decision`
* `stepUpRequired`
* signal evaluation results
* correlation results
* enforcement information

The enforcement result identifies whether the protected operation should:

```text
ALLOW
STEP-UP
TERMINATE SESSION
```

---

## 8. Normal-Activity Risk Decay

The model includes a risk-decay mechanism to allow accumulated risk to decrease during legitimate activity.

Every qualifying **30-second period of normal activity reduces the accumulated risk by 1 point**.

```text
30 seconds of qualifying normal activity
                |
                v
          Risk Score −1
```

The score cannot fall below 0.

Importantly, the passage of 30 seconds by itself does **not** cause decay.

The activity must first qualify as normal activity.

Examples identified by the implementation include:

* Viewing the user's own employee profile
* Accessing an assigned project
* Ordinary workspace activity
* Other legitimate actions identified by `server.js` as normal

If an activity does not qualify as normal activity, the decay mechanism does not apply.

---

## 9. Step-Up Authentication

A HIGH risk state triggers step-up authentication.

```text
Risk Score 60–79
       |
       v
     HIGH
       |
       v
   STEP-UP
```

### Successful Step-Up

A successful step-up reduces the current risk score by **15 points**.

```text
HIGH
  |
  v
Step-Up Authentication
  |
  v
Authentication Successful
  |
  v
Risk Score −15
  |
  v
Continue Monitoring
```

The reduction cannot reduce the score below 0.

The successful step-up event is recorded in the session's step-up history and event history.

The engine also returns `returnToOriginalResource: true`, indicating that the application can return the user to the protected resource or action that was interrupted by the step-up requirement.

Successful step-up therefore reduces accumulated risk but does not destroy the session's risk state.

---

## 10. Failed Step-Up

A failed step-up does **not** reduce the risk score.

```text
HIGH
  |
  v
Step-Up Authentication
  |
  v
Authentication Failed
  |
  v
No Risk Reduction
  |
  v
Remain on Step-Up
```

The engine records the failed step-up event.

The resulting decision remains:

```text
STEP_UP
```

and:

```text
stepUpRequired = true
```

The engine therefore does not treat a failed additional authentication attempt as evidence that the session has regained trust.

---

## 11. CRITICAL Enforcement

CRITICAL begins at a score of 80.

```text
Score >= 80
    |
    v
CRITICAL
    |
    v
TERMINATE_SESSION
```

At CRITICAL:

* `stepUpRequired` is false.
* The decision is `TERMINATE_SESSION`.
* The application must terminate the session.

CRITICAL is therefore the terminal enforcement state of the risk model.

The risk engine also provides `destroyRiskState()` for removing the session's risk state when the application logs the user out or terminates the session because of CRITICAL risk.

---

## 12. Risk State Lifecycle

A session risk state is created when the engine receives a session that does not yet have an associated risk state.

The initial state is:

```text
Score       = 0
Risk Level  = LOW
Decision    = ALLOW
Step-Up     = false
```

As activity occurs, the state is updated continuously.

The lifecycle is:

```text
Session Created
      |
      v
LOW / ALLOW
      |
      v
Activity Evaluated
      |
      v
Risk Accumulates or Decays
      |
      +--------------------------+
      |                          |
      v                          v
 LOW / MEDIUM                 HIGH
      |                          |
      |                          v
      |                       STEP-UP
      |                          |
      |                 +--------+--------+
      |                 |                 |
      |                 v                 v
      |              SUCCESS           FAILURE
      |                 |                 |
      |              Score −15         No reduction
      |                 |                 |
      +-----------------+-----------------+
                        |
                        v
                 Continue Monitoring
                        |
                        v
                 CRITICAL (80–100)
                        |
                        v
                 TERMINATE SESSION
```

---

## 13. Risk History

The engine maintains several forms of historical information within each session:

### Signal History

Records risk signals applied during the session, including:

* Signal ID
* Signal name
* Category
* Score
* Previous score
* Resulting score
* Metadata
* Timestamp

### Correlation History

Records correlations applied during the session, including:

* Correlation ID
* Correlation name
* Required signals
* Bonus
* Previous score
* Resulting score
* Timestamp

### Decay History

Records normal-activity decay events, including:

* Number of qualifying intervals
* Reduction applied
* Previous score
* Resulting score
* Timestamp

### Step-Up History

Records successful and failed step-up events.

### Event History

Provides a chronological record of activity, signal, correlation, decay, and step-up events associated with the session.

---

### 14. Research Model Summary

The implemented risk model is based on the principle that **authentication establishes an initial identity context but trust in an active session must continue to be evaluated as the user's behavior changes**.

The system therefore does not rely solely on the user's initial successful login.

Instead:

```text
Initial Authentication
        |
        v
Authenticated Session
        |
        v
Continuous Activity Monitoring
        |
        v
Risk Signals
        |
        v
Risk Accumulation
        |
        v
  +-----------+
  |    LOW    |
  |  0–30     |
  |   ALLOW   |
  +-----------+
        |
        v
  +-----------+
  |  MEDIUM   |
  |  31–59    |
  |   ALLOW   |
  +-----------+
        |
        v
  +-----------+
  |    HIGH   |
  |  60–79    |
  |  STEP-UP  |
  +-----------+
        |
        v
  Step-Up Authentication
        |
        +-----------------------+
        |                       |
        v                       v
   Successful               Failed
   Authentication          Authentication
        |                       |
        v                       v
     Risk −15              No Reduction
        |                       |
        v                       v
Continue Monitoring      Remain at STEP-UP
        |                       
        | Risk continues increasing
        v
  +---------------+
  |   CRITICAL    |
  |    80–100     |
  |   TERMINATE   |
  +---------------+
```

This provides three distinct adaptive responses:

**ALLOW** — the session remains within an acceptable risk range covering the **LOW and MEDIUM** risk levels.

**STEP-UP** — the accumulated risk reaches the **HIGH** range and requires additional authentication. A successful step-up reduces the risk score by **15 points** and allows the session to continue. A failed step-up does **not** reduce the risk score and the user remains at the step-up authentication stage.

**TERMINATE** — the accumulated risk reaches the **CRITICAL** range and the session must be terminated.

The model therefore combines identity assurance with continuous session-risk evaluation rather than treating the initial login as permanent proof of trust.
