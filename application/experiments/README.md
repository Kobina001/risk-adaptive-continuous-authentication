# Experiments

## 1. Purpose

This directory contains the experimental records used to validate the **Risk-Adaptive Continuous Authentication** research prototype.

The experiments are designed to evaluate how an authenticated session's risk state changes in response to user activity and contextual conditions.

The experiments focus on the central research principle:

> **Authentication establishes an initial identity context but trust in an active session must continue to be evaluated as activity and context change.**

---

## 2. Experiment Structure

The experiments are organized around the main components of the implemented risk-adaptive model:

```text
Authentication
      |
      v
Baseline Session
      |
      v
Activity
      |
      v
Risk Signals
      |
      v
Risk Accumulation
      |
      v
Correlation Evaluation
      |
      v
Risk Decision
      |
      +----------------------+
      |                      |
      v                      v
   ALLOW                 STEP-UP
                             |
                             v
                   Additional Authentication
                             |
                       +-----+-----+
                       |           |
                       v           v
                    Success      Failure
                       |           |
                       v           v
                    Risk −15    No Reduction
```

The experiments also evaluate risk decay and session lifecycle behavior.

---

## 3. Experiment Categories

The experiments are divided into the following categories.

### Authentication and Baseline

Tests the initial authentication process and creation of an authenticated research session.

### Individual Risk Signals

Tests individual activities that contribute to the session risk score.

Examples include:

* cross-user employee profile access
* unassigned project access
* sensitive-resource access
* document activities.

### Document Sensitivity and Actions

Tests how resource sensitivity and document actions influence risk.

The tested actions include:

* view
* copy
* download
* share
* delete.

### Correlation Rules

Tests whether combinations of activities produce additional risk beyond their individual signal contributions.

### Adaptive Authentication

Tests the transition from normal access to HIGH-risk step-up authentication and evaluates successful and failed step-up attempts.

### Risk Decay

Tests whether qualifying normal activity reduces risk and confirms that passive passage of time does not automatically reduce risk.

### Session Lifecycle

Tests the relationship between authentication sessions and their associated risk state, including logout and creation of a new session.

---

## 4. Risk Levels

All experiments use the implemented risk bands:

| Risk Score | Risk Level | Response  |
| ---------: | ---------- | --------- |
|       0–30 | LOW        | ALLOW     |
|      31–59 | MEDIUM     | ALLOW     |
|      60–79 | HIGH       | STEP-UP   |
|     80–100 | CRITICAL   | TERMINATE |

Normal qualifying activity can reduce risk by **1 point after a 30-second interval**.

Successful step-up authentication reduces the score by **15 points**.

Failed step-up authentication produces **no risk reduction**.

---

## 5. Running the Experiments

The experiments are performed against the local research environment.

### Prerequisites

The following components must be available:

* Keycloak
* Node.js
* the project application
* the configured research realm
* the simulated corporate resources
* the test users
* a browser
* a terminal for observing risk-engine output.

### General Procedure

1. Start Keycloak.
2. Start the Node.js application.
3. Authenticate through the application's login flow.
4. Perform the activity associated with the experiment.
5. Observe the application behavior.
6. Observe the terminal risk monitor.
7. Record the resulting signals, risk score, risk level, decision and enforcement result.
8. Compare the observed behavior with the expected behavior defined by the risk model.

The application should be run in the local research environment rather than against production systems.

---

## 6. Evidence Collected

The primary experimental evidence comes from observable application behavior and the terminal risk monitor.

Where applicable, experimental records should capture:

```text
Experiment ID
Initial Risk Score
Activity Performed
Generated Signals
Correlation
Risk Contribution
Final Risk Score
Risk Level
Decision
Enforcement Result
```

For example:

```text
Experiment:
Restricted Document Download

Initial Risk Score:
0

Activity:
Restricted document download

Signals:
DOCUMENT_VIEW
RESTRICTED_DOCUMENT
DOCUMENT_DOWNLOAD
RESTRICTED_DOCUMENT

Correlation:
RESTRICTED_DOCUMENT_DOWNLOAD

Total Risk Contribution:
12

Decision:
ALLOW
```

---

## 7. Experiment Status

The detailed results are recorded in:

`experiment-results.md`

The current validation record distinguishes between experiments that have been empirically confirmed and experiments that remain pending confirmation.

### Confirmed

The completed experiments include:

* fresh login / baseline
* normal activity
* individual contextual risk signals
* document activity
* confidential and restricted resources
* correlation rules
* cross-context correlations
* HIGH-risk step-up
* successful step-up
* failed step-up
* risk decay
* no decay without qualifying activity
* logout and risk-state destruction
* new session ID.

### Pending Confirmation

The experiment below require final empirical confirmation before being presented as completed results:

* CRITICAL session termination.

---

## 8. Relationship to Other Documentation

The experiment files have different purposes within the project.

| File                                   | Purpose                                                        |
| -------------------------------------- | -------------------------------------------------------------- |
| `experiments/README.md`                | Explains the experiment directory and reproduction process     |
| `experiments/experiment-results.md`    | Records the actual experimental results                        |
| `documentation/testing.md`             | Describes the testing methodology and validation procedures    |
| `documentation/risk-model.md`          | Defines the risk model, signals, correlations and responses   |
| `documentation/architecture.md`        | Describes the technical architecture                           |
| `documentation/authentication-flow.md` | Describes the authentication and adaptive-authentication flows |

This separation prevents the research documentation from becoming a single large document containing methodology, implementation details, and experimental evidence together.

---

## 9. Research Reproducibility

The experiments are intended to be reproducible within the project's local research environment.

A future modification to the risk engine should be evaluated against the existing experiments to determine whether the change affects:

* signal generation
* signal weights
* correlation behavior
* risk accumulation
* risk decay
* risk thresholds
* step-up behavior
* session lifecycle
* enforcement decisions.

When the implementation changes, affected experiments should be rerun and their results updated accordingly.

---

## 10. Interpretation of Results

The experiments should be interpreted as validation of the behavior of the research prototype.

They demonstrate that the implemented system can continuously evaluate activity within an authenticated session and adapt the session's risk state based on defined signals and contextual relationships.

The experiments do **not** establish that the selected risk weights or thresholds are universally optimal for real-world enterprise environments.

The current results therefore support:

**implementation feasibility and behavioral validation**

rather than:

**production security effectiveness or universal risk-model validity.**

---

## 11. Research Focus

The experiments ultimately investigate the transition from:

```text
Initial Authentication
        |
        v
Authenticated Session
```

to:

```text
Authenticated Session
        |
        v
Continuous Activity Evaluation
        |
        v
Changing Risk State
        |
        v
Adaptive Security Response
```

The purpose is to demonstrate that authentication should not necessarily be treated as a permanent indication of trust throughout the entire lifetime of a session.

Instead, the session can be continuously evaluated as the user's activity and context change.

---

## 12. Summary

This directory provides the experimental evidence supporting the project's research objective.

The experiments demonstrate the behavior of a session-risk model that:

* starts with an authenticated identity
* observes activity continuously
* assigns risk to relevant activities
* recognizes correlated activity
* allows risk to decay under qualifying normal behavior
* requires additional authentication when risk becomes HIGH
* reduces risk after successful step-up authentication
* does not reduce risk after failed step-up authentication
* associates risk with the active session lifecycle
* is designed to terminate sessions that reach CRITICAL risk.

The detailed experimental observations are maintained in:

`experiment-results.md`
