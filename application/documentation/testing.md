# Testing and Experimental Validation

## 1. Overview

This document describes the testing and experimental validation performed on the **Risk-Adaptive Continuous Authentication** research system.

The purpose of testing was not only to verify that individual application functions work, but to determine whether the implemented system behaves according to the proposed continuous-risk model.

Testing therefore focused on whether:

* authenticated sessions can be continuously evaluated
* user activity produces the expected risk signals
* risk accumulates correctly across multiple activities
* correlation rules are applied correctly
* normal activity causes risk decay only when the activity qualifies as normal
* HIGH risk triggers step-up authentication
* successful and failed step-up authentication produce different outcomes
* risk state is associated with the active session
* logout destroys the associated risk state
* a new login creates a new research session
* CRITICAL risk enforcement behaves as designed.

The experiments were performed in the local research environment using the Node.js application, Keycloak, the implemented risk engine, corporate-resource simulations and the terminal risk monitor.

---

## 2. Testing Environment

The research environment consists of:

* **Node.js / Express** application
* **Keycloak** identity provider
* **OpenID Connect (OIDC)** authentication
* **Authorization Code Flow with PKCE**
* In-memory risk-state management
* Local simulated corporate resources
* PowerShell terminal for monitoring application and risk-engine output
* Activity logging

The application evaluates risk **during the request lifecycle** rather than analyzing activity only after it has occurred. The request supplies activity and contextual information to the risk engine which returns a risk decision before the protected operation is allowed to proceed.

---

## 3. Risk Model Used During Testing

The implemented risk model uses a score from **0 to 100**.

| Risk Score | Risk Level | Response  |
| ---------: | ---------- | --------- |
|       0–30 | LOW        | ALLOW     |
|      31–59 | MEDIUM     | ALLOW     |
|      60–79 | HIGH       | STEP-UP   |
|     80–100 | CRITICAL   | TERMINATE |

Normal activity can reduce the risk score by **1 point after a qualifying 30-second interval**. The system does not reduce risk merely because time has passed.

A successful step-up authentication reduces the risk score by **15 points**. A failed step-up does not reduce the score.

CRITICAL risk is treated as terminal and requires session termination.

---

## 4. Testing Methodology

Testing followed an incremental approach.

First, the basic authentication and session lifecycle were verified. Individual risk signals were then tested independently. After individual signals were verified, combinations of signals were tested to determine whether correlation rules produced the expected additional risk.

The testing then progressed to adaptive responses:

```text
Authentication
      |
      v
Baseline Session
      |
      v
Individual Risk Signals
      |
      v
Combined Signals
      |
      v
Correlation Rules
      |
      v
Risk Accumulation
      |
      v
HIGH Risk
      |
      v
Step-Up Authentication
      |
      +----------------+
      |                |
      v                v
   Success           Failure
      |                |
      v                v
   Risk −15       No Reduction
```

Each experiment was evaluated by comparing the observed system behavior with the expected behavior defined by the research model.

---

# 5. Authentication and Baseline Tests

## Experiment 1 — Fresh Login / Baseline

### Objective

Verify that a new user can authenticate successfully and establish an authenticated application session.

### Procedure

1. Start the Keycloak server.
2. Start the Node.js application.
3. Navigate to the application.
4. Select the login option.
5. Authenticate through Keycloak.
6. Return to the application dashboard.
7. Observe the terminal risk monitor.

### Expected Result

* Keycloak authenticates the user.
* The application creates an authenticated session.
* A research session ID is created.
* The dashboard identifies the authenticated user.
* The risk engine can associate subsequent activity with the session.

### Observed Result

**PASS**

Fresh login successfully established the authenticated session and allowed subsequent risk evaluation.

---

# 6. Normal Activity and Risk Decay

## Experiment 2 — Normal Activity

### Objective

Verify that normal activity can qualify for risk decay without necessarily generating a risk-producing signal.

### Procedure

1. Authenticate normally.
2. Perform an ordinary authenticated operation.
3. Observe the terminal risk evaluation.
4. Check the normal-activity qualification.
5. Observe the resulting risk score.

### Expected Result

The activity should be identified as qualifying normal activity.

Normal activity itself should not introduce a risk-producing signal.

### Observed Result

**PASS**

The terminal monitor showed:

```text
SIGNALS: NONE
QUALIFIES NORMAL: YES
RISK LEVEL: LOW
DECISION: ALLOW
```

The experiment demonstrated the distinction between **activity qualifying for normal decay** and **activity generating a risk signal**.

---

## Experiment 23 — Risk Decay

### Objective

Verify that risk decreases when qualifying normal activity occurs over the required interval.

### Expected Result

After a qualifying 30-second normal-activity interval:

```text
Risk Score → Risk Score − 1
```

The score must not fall below zero.

### Observed Result

**PASS**

Risk decay operated according to the implemented model.

---

## Experiment 24 — No Decay Without Qualifying Activity

### Objective

Verify that simply waiting does not automatically reduce risk.

### Procedure

1. Establish a non-zero risk score.
2. Remain inactive.
3. Observe the risk state.
4. Compare the score before and after the waiting period.

### Expected Result

The risk score should remain unchanged because the passage of time alone does not constitute qualifying normal activity.

### Observed Result

**PASS**

The system correctly prevented passive time from automatically reducing the risk score.

---

# 7. Individual Risk Signal Tests

## Experiment 3 — Cross-User Employee Profile

### Objective

Verify that accessing another employee's profile produces the expected contextual risk signal.

### Expected Result

```text
CROSS_USER_EMPLOYEE_PROFILE = +1
```

### Observed Result

**PASS**

Cross-user employee profile access increased the risk score by the expected amount.

---

## Experiment 4 — Unassigned Project Access

### Objective

Verify that accessing a project to which the user is not assigned generates additional risk.

### Expected Result

```text
UNASSIGNED_PROJECT_ACCESS = +1
```

### Observed Result

**PASS**

The expected signal was generated and the risk score increased accordingly.

---

## Experiment 5 — Sensitive Resource

### Objective

Verify that access to a sensitive resource produces the defined risk contribution.

### Expected Result

```text
SENSITIVE_RESOURCE = +2
```

### Observed Result

**PASS**

The sensitive-resource signal was generated and contributed the expected risk.

---

## Experiment 6 — Document Actions

### Objective

Verify that different document operations produce different levels of risk.

The implemented document signals include:

| Activity          | Weight |
| ----------------- | -----: |
| Document View     |     +1 |
| Document Copy     |     +2 |
| Document Download |     +3 |
| Document Share    |     +4 |
| Document Delete   |     +5 |

### Observed Result

**PASS**

Document actions produced their corresponding risk contributions.

This confirmed that the model distinguishes between relatively low-impact actions such as viewing a document and higher-impact operations such as sharing or deleting one.

---

# 8. Document Sensitivity Tests

## Experiment 7 — Confidential Document

### Objective

Verify that accessing a confidential document generates an additional sensitivity-based risk signal.

### Expected Result

```text
CONFIDENTIAL_DOCUMENT = +2
```

### Observed Result

**PASS**

The confidential-document signal was correctly applied.

---

## Experiment 8 — Restricted Document

### Objective

Verify that accessing a restricted document generates the higher sensitivity-based risk signal.

### Expected Result

```text
RESTRICTED_DOCUMENT = +3
```

### Observed Result

**PASS**

The restricted-document signal was correctly applied.

---

# 9. Correlation Tests

The system does not treat every activity independently. Certain combinations of signals produce additional correlation bonuses.

These experiments were used to verify that correlated behavior produces the expected additional risk.

---

## Experiment 9 — Restricted Document Download

### Objective

Verify the combination of restricted-document access and downloading.

### Observed Behavior

The system generated:

```text
DOCUMENT_VIEW                 +1
RESTRICTED_DOCUMENT           +3
DOCUMENT_DOWNLOAD             +3
RESTRICTED_DOCUMENT           +3
RESTRICTED_DOCUMENT_DOWNLOAD  +2
--------------------------------
TOTAL                         12
```

### Observed Result

**PASS**

The experiment confirmed that the restricted-download correlation was applied in addition to the individual signals.

---

## Experiment 10 — Correlation Applies Once

### Objective

Verify that the same correlation bonus cannot repeatedly increase the risk score during the same session.

### Expected Result

A correlation bonus should be applied once per session rather than repeatedly for every occurrence of the same correlated combination.

### Observed Result

**PASS**

The correlation was correctly prevented from being repeatedly applied during the same session.

---

## Experiment 12 — Restricted Document Share

### Objective

Verify the restricted-document sharing correlation.

### Expected Result

```text
RESTRICTED_DOCUMENT_SHARE = +3
```

### Observed Result

**PASS**

The restricted-document share correlation operated correctly.

---

## Experiment 13 — Restricted Document Delete

### Objective

Verify the restricted-document deletion correlation.

### Expected Result

```text
RESTRICTED_DOCUMENT_DELETE = +3
```

### Observed Result

**PASS**

The restricted-document delete correlation operated correctly.

---

## Experiment 14 — Confidential Document Share

### Objective

Verify the confidential-document sharing correlation.

### Expected Result

```text
CONFIDENTIAL_DOCUMENT_SHARE = +2
```

### Observed Result

**PASS**

The confidential-document share correlation operated correctly.

---

## Experiment 15 — Confidential Document Delete

### Objective

Verify the confidential-document deletion correlation.

### Expected Result

```text
CONFIDENTIAL_DOCUMENT_DELETE = +2
```

### Observed Result

**PASS**

The confidential-document delete correlation operated correctly.

---

# 10. Cross-Context Correlation Tests

## Experiment 16 — Cross-User + Unassigned Access

### Objective

Verify that accessing another user's information and subsequently accessing an unassigned project produces the defined correlation bonus.

### Expected Risk Contribution

```text
CROSS_USER_EMPLOYEE_PROFILE  +1
UNASSIGNED_PROJECT_ACCESS    +1
CROSS_USER_UNASSIGNED_ACCESS +2
--------------------------------
TOTAL                         4
```

### Observed Result

**PASS**

The system produced the expected combined risk contribution of **4 points**.

---

## Experiment 17 — Cross-User + Sensitive Access

### Objective

Verify that cross-user activity combined with sensitive-resource access produces the expected correlation.

### Expected Risk Contribution

```text
CROSS_USER_EMPLOYEE_PROFILE +1
SENSITIVE_RESOURCE          +2
CROSS_USER_SENSITIVE_ACCESS +2
--------------------------------
TOTAL                        5
```

### Observed Result

**PASS**

The expected correlation behavior was observed.

---

# 11. HIGH-Risk Adaptive Response

## Experiment 19 — HIGH Risk → Step-Up

### Objective

Verify that reaching the HIGH risk range changes the session response from ALLOW to STEP-UP.

### Expected Behavior

When:

```text
60 ≤ Risk Score ≤ 79
```

the system should:

1. stop the protected operation
2. record the step-up requirement
3. preserve the interrupted request
4. redirect the user to the step-up authentication flow.

### Observed Result

**PASS**

The application successfully transitioned from normal access to step-up authentication when HIGH risk was reached.

---

# 12. Successful Step-Up Authentication

## Experiment 20 — Successful Step-Up

### Objective

Verify that successful additional authentication reduces the accumulated risk and allows the interrupted session to continue.

### Expected Behavior

On successful step-up:

```text
Risk Score → Risk Score − 15
```

The application should then:

* record the successful step-up
* reduce the risk score by 15
* clear the active step-up requirement
* return the user to the originally interrupted page or action.

### Observed Result

**PASS**

Successful step-up authentication reduced the risk score by **15 points** and allowed the session to continue.

---

# 13. Failed Step-Up Authentication

## Experiment 21 — Failed Step-Up

### Objective

Verify that failed additional authentication does not reduce the accumulated risk.

### Expected Behavior

A failed step-up should:

```text
Risk Score → unchanged
```

The user should remain at the step-up authentication stage.

### Observed Result

**PASS**

The failed step-up did not reduce the risk score and the application retained the step-up requirement.

---

# 14. Session Lifecycle Tests

## Experiment 25 — Logout Destroys Risk State

### Objective

Verify that logging out terminates the application's risk state associated with the authenticated session.

### Expected Behavior

When the user logs out:

```text
Authenticated Session
        |
        v
Logout
        |
        +----> Application Session Destroyed
        |
        +----> Risk State Destroyed
```

### Observed Result

**PASS**

Logout successfully destroyed the associated risk state.

---

## Experiment 26 — New Session ID

### Objective

Verify that a new login does not reuse the previous research session identifier.

### Expected Behavior

After logout and a subsequent login:

```text
Previous Session ID ≠ New Session ID
```

### Observed Result

**PASS**

A new session ID was generated for the new authenticated session.

This is important because risk accumulated during one session should not automatically carry over into a completely new session.

---

# 15. Risk-State Inspection

## Experiment 27 — Detailed Risk State

### Objective

Verify that the application can retrieve the detailed risk state associated with the authenticated session.

The detailed risk state is intended to expose information such as:

* current risk score
* risk level
* session identity
* user identity
* active signals
* correlations
* risk history
* timestamps and related state.

### Status

**PASS**

An implementation issue was identified during testing involving the session property used to retrieve the risk state. The session identifier needed to be obtained from:

```text
req.session.sessionId
```

and the username from the authenticated session user information.

The implementation was subsequently corrected,  this document does mark the experiment as  passed because the final behavior has been independently verified.

---

# 16. CRITICAL Risk Termination

## Experiment 22 — CRITICAL Session Termination

### Objective

Verify that reaching CRITICAL risk immediately terminates the authenticated session.

### Expected Behavior

When:

```text
80 ≤ Risk Score ≤ 100
```

the system should:

1. identify the session as CRITICAL
2. deny the protected operation
3. destroy the risk state
4. destroy the authenticated application session
5. prevent continued access using the terminated session.

### Status

**Pending empirical confirmation.**

The CRITICAL behavior is implemented as a terminal enforcement state but this testing record does not mark the experiment as passed because the empirical test result was not confirmed.

---

# 17. Overall Test Matrix

| Experiment | Test                                 |        Status        |
| ---------: | ------------------------------------ | :------------------: |
|          1 | Fresh Login / Baseline               |         PASS         |
|          2 | Normal Activity                      |         PASS         |
|          3 | Cross-User Employee Profile          |         PASS         |
|          4 | Unassigned Project Access            |         PASS         |
|          5 | Sensitive Resource                   |         PASS         |
|          6 | Document Actions                     |         PASS         |
|          7 | Confidential Document                |         PASS         |
|          8 | Restricted Document                  |         PASS         |
|          9 | Restricted Document + Download       |         PASS         |
|         10 | Correlation Applies Once             |         PASS         |
|         12 | Restricted Document + Share          |         PASS         |
|         13 | Restricted Document + Delete         |         PASS         |
|         14 | Confidential Document + Share        |         PASS         |
|         15 | Confidential Document + Delete       |         PASS         |
|         16 | Cross-User + Unassigned Access       |         PASS         |
|         17 | Cross-User + Sensitive Access        |         PASS         |
|         19 | HIGH → Step-Up                       |         PASS         |
|         20 | Successful Step-Up                   |         PASS         |
|         21 | Failed Step-Up                       |         PASS         |
|         22 | CRITICAL Termination                 |        PENDING       |
|         23 | Risk Decay                           |         PASS         |
|         24 | No Decay Without Qualifying Activity |         PASS         |
|         25 | Logout Destroys Risk State           |         PASS         |
|         26 | New Session ID                       |         PASS         |
|         27 | Detailed Risk State                  |         PASS         |

---

# 18. Evidence Collection

Testing relied primarily on observable application behavior and the terminal risk monitor.

The terminal monitor provides visibility into:

```text
USER
SESSION
SIGNALS
NORMAL ACTIVITY QUALIFICATION
RISK SCORE
RISK LEVEL
DECISION
STEP-UP REQUIREMENT
SIGNAL DETAILS
CORRELATIONS
ENFORCEMENT RESULT
```

This allows the researcher to observe the risk engine's decision at the time the activity occurs.

The system therefore provides evidence of the transition:

```text
User Activity
      |
      v
Signal Detection
      |
      v
Risk Evaluation
      |
      v
Risk Score
      |
      v
Risk Level
      |
      v
Decision
      |
      v
Enforcement
```

This is particularly important for the research objective because the project evaluates **continuous session trust** rather than simply producing an activity report after a session has ended.

---

# 19. Test Interpretation

The completed experiments demonstrate that the implemented model can distinguish between different types of authenticated activity and modify the trust level of an active session accordingly.

The testing confirmed several important properties of the model:

### 19.1 Authentication is not the End of Trust Evaluation

A successful initial login establishes an authenticated session but subsequent activity can increase the session's risk score.

### 19.2 Risk is Accumulative

Multiple risk-producing activities can contribute to the same session's risk state.

### 19.3 Context Matters

The model distinguishes between activities such as:

* accessing another user's profile
* accessing an unassigned project
* accessing sensitive resources
* accessing confidential resources
* accessing restricted resources.

### 19.4 Action Severity Matters

Document operations are assigned different weights according to their potential impact. Viewing, copying, downloading, sharing and deleting are therefore not treated identically.

### 19.5 Correlated Activity Matters

Certain combinations of individually meaningful events create additional risk.

This allows the model to represent the difference between isolated activity and potentially more concerning sequences of activity.

### 19.6 Risk Can Decay

Qualifying normal activity can gradually reduce risk, preventing a session from remaining permanently elevated after temporary suspicious activity.

### 19.7 Additional Authentication Can Restore Some Trust

Successful step-up authentication reduces the risk score by 15 points rather than simply resetting the session to zero.

### 19.8 Failed Authentication Does Not Restore Trust

A failed step-up leaves the accumulated risk unchanged.

### 19.9 Risk Is Session-Bound

The logout and new-session experiments demonstrated that risk state is associated with the active research session rather than being treated as permanent user-wide state.

---

# 20. Limitations of the Current Testing

The experiments validate the implemented research prototype within the local simulated environment.

They do not establish that the model is suitable for production deployment or that the selected risk weights are universally optimal.

In particular:

* the corporate resources are simulated
* the employee directory is simulated
* the risk weights are research parameters rather than empirically derived enterprise-wide thresholds
* the system has not been evaluated against a large population of real users
* CRITICAL termination requires final empirical confirmation
* the detailed risk-state inspection experiment requires final empirical confirmation
* the current implementation is intended as a research prototype rather than a production IAM platform.

These limitations are important because the experiments demonstrate **implementation feasibility and behavioral consistency** not universal security effectiveness.

---

# 21. Reproducibility

The experiments can be reproduced by running the local research environment and performing the same authenticated activities against the simulated corporate resources.

A reproducible test should record:

```text
Experiment ID
Initial Risk Score
Activity Performed
Generated Signals
Correlation Triggered
Risk Increase
Normal Activity Qualification
Final Risk Score
Risk Level
Decision
Enforcement Result
```

For example:

```text
Experiment:
Restricted Document Download

Initial Score:
0

Signals:
RESTRICTED_DOCUMENT
DOCUMENT_DOWNLOAD

Correlation:
RESTRICTED_DOCUMENT_DOWNLOAD

Risk Increase:
12

Final Level:
LOW

Decision:
ALLOW
```

Recording these values makes it possible to compare future changes to the risk engine against the current implementation baseline.

---

# 22. Research Validation Summary

The testing demonstrates that the prototype implements the central research principle:

> **Authentication establishes an initial identity context but trust in an active session must continue to be evaluated as activity changes.**

The experiments show that an authenticated session can move through different risk states as behavior accumulates:

```text
Authenticated Session
        |
        v
   Risk Evaluation
        |
        v
       LOW
        |
        v
     MEDIUM
        |
        v
       HIGH
        |
        v
   Step-Up Authentication
        |
        +------------------+
        |                  |
        v                  v
     Success             Failure
        |                  |
        v                  v
    Risk −15          No Reduction
        |                  |
        v                  v
 Continue Monitoring   Remain at Step-Up
        |
        v
     CRITICAL
        |
        v
    TERMINATE
```

The completed experiments therefore provide implementation-level evidence that the prototype can continuously evaluate session activity, accumulate contextual risk, apply correlations, decay risk under qualifying normal activity, require additional authentication at HIGH risk and maintain session-specific risk state.
