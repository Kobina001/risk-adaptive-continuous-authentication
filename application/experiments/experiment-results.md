### Experiment Results



#### 1\. Overview



This document records the experimental results obtained from the Risk-Adaptive Continuous Authentication research prototype.



The experiments were designed to determine whether changes in authenticated user activity can continuously influence the risk state of an active session and produce adaptive security responses.



The results cover:



* baseline authentication
* individual risk signals
* document sensitivity and action severity
* correlated activity
* risk accumulation
* normal-activity decay
* HIGH-risk step-up authentication
* successful and failed step-up authentication
* session lifecycle and risk-state isolation.



Experiments that were not empirically confirmed are explicitly identified as "**PENDING"** rather than being presented as completed results.







#### 2\. Risk Model Reference



The experiments use the following risk thresholds:



| Risk Score | Risk Level | System Response |

| ---------: | ---------- | --------------- |

|       0–30 | LOW        | ALLOW           |

|      31–59 | MEDIUM     | ALLOW           |

|      60–79 | HIGH       | STEP-UP         |

|     80–100 | CRITICAL   | TERMINATE       |



Normal activity can reduce the risk score by "**1 point after a qualifying 30-second interval**".



A successful step-up authentication reduces the risk score by "**15 points**".



A failed step-up authentication produces "**no risk reduction**".







#### 3\. Experiment Results



##### Experiment 1 — Fresh Login / Baseline



**"Status: PASS"**



###### Activity



A new user authenticated through Keycloak and returned to the application.



###### Result



The application successfully established an authenticated session and generated the session context required for continuous risk evaluation.



###### Finding



The baseline authentication process successfully establishes the starting point from which continuous session-risk evaluation occurs.







##### Experiment 2 — Normal Activity



**"Status: PASS"**



###### Activity



The authenticated user performed normal application activity.



###### Observed Result



The terminal monitor reported:





**SIGNALS: NONE**

**QUALIFIES NORMAL: YES**

**RISK LEVEL: LOW**

**DECISION: ALLOW**





###### Finding



Normal activity can qualify for risk decay without itself generating a risk-producing signal.



This demonstrates that "**normal-activity qualification and risk-signal generation are separate concepts"** in the model.







##### Experiment 3 — Cross-User Employee Profile



**"Status: PASS"**



###### Activity



The authenticated user accessed another employee's profile.



###### Risk Signal





CROSS\_USER\_EMPLOYEE\_PROFILE = +1





###### Finding



Accessing information associated with another user generated the expected contextual risk contribution.







##### Experiment 4 — Unassigned Project Access



**"Status: PASS"**



###### Activity



The authenticated user accessed a project to which they were not assigned.



###### Risk Signal





UNASSIGNED\_PROJECT\_ACCESS = +1





###### Finding



The system successfully identified access outside the user's assigned project context and increased the session risk accordingly.







##### Experiment 5 — Sensitive Resource



**"Status: PASS"**



###### Activity



The authenticated user accessed a sensitive resource.



###### Risk Signal





SENSITIVE\_RESOURCE = +2





###### Finding



The system successfully increased the risk score based on resource sensitivity.





##### 

#### 4\. Document Activity Results



##### Experiment 6 — Document Actions



"**Status: PASS"**



Different document operations were tested to determine whether action severity affected the risk score.



| Document Activity | Risk Contribution |

| ----------------- | ----------------: |

| View              |                +1 |

| Copy              |                +2 |

| Download          |                +3 |

| Share             |                +4 |

| Delete            |                +5 |



###### Finding



The system differentiated document operations according to their defined risk weights.



This demonstrates that the model considers not only **"what resource is accessed"**, but also **"what action is performed on that resource"**.





##### Experiment 7 — Confidential Document



**"Status: PASS"**



###### Activity



The authenticated user accessed a confidential document.



###### Risk Signal





CONFIDENTIAL\_DOCUMENT = +2





###### Finding



The document's sensitivity level contributed additional risk to the session.







###### Experiment 8 — Restricted Document



**"Status: PASS"**



###### Activity



The authenticated user accessed a restricted document.



###### Risk Signal





RESTRICTED\_DOCUMENT = +3





###### Finding



Restricted resources generated a higher sensitivity contribution than confidential resources.







#### 5\. Correlation Results



##### Experiment 9 — Restricted Document Download



**"Status: PASS"**



###### Activity



The user accessed a restricted document and downloaded it.



###### Observed Risk Contributions





DOCUMENT\_VIEW                 +1

RESTRICTED\_DOCUMENT           +3

DOCUMENT\_DOWNLOAD             +3

RESTRICTED\_DOCUMENT           +3

RESTRICTED\_DOCUMENT\_DOWNLOAD  +2

\--------------------------------

TOTAL                         12





###### Result



The final observed risk contribution was:





+12





###### Finding



The experiment demonstrated that the system can combine individual activity signals with a higher-level correlation rule.



The correlation therefore adds contextual risk beyond the individual signals generated by the activities.







##### Experiment 10 — Correlation Applies Once



**"Status: PASS"**



###### Activity



The same correlated activity pattern was repeated during the same session.



###### Result



The correlation bonus was not repeatedly added to the session risk state.



###### Finding



Correlation rules are session-aware and are designed to prevent the same correlation from being applied repeatedly during the same session.







##### Experiment 12 — Restricted Document Share



**"Status: PASS"**



###### Activity



The user shared a restricted document.



###### Correlation





RESTRICTED\_DOCUMENT\_SHARE = +3





###### Finding



The restricted-document sharing correlation operated as defined.







##### Experiment 13 — Restricted Document Delete



**"Status: PASS"**



###### Activity



The user deleted a restricted document.



###### Correlation





RESTRICTED\_DOCUMENT\_DELETE = +3





###### Finding



The restricted-document deletion correlation operated as defined.







##### Experiment 14 — Confidential Document Share



**"Status: PASS"**



###### Activity



The user shared a confidential document.



###### Correlation





CONFIDENTIAL\_DOCUMENT\_SHARE = +2





###### Finding



The confidential-document sharing correlation operated as defined.







##### Experiment 15 — Confidential Document Delete



**"Status: PASS"**



###### Activity



The user deleted a confidential document.



###### Correlation





CONFIDENTIAL\_DOCUMENT\_DELETE = +2





###### Finding



The confidential-document deletion correlation operated as defined.







#### 6\. Cross-Context Correlation Results



##### Experiment 16 — Cross-User + Unassigned Access



**"Status: PASS"**

###### 

###### Activity Sequence



The user:



1\. accessed another employee's profile

2\. accessed an unassigned project.



###### Observed Risk





CROSS\_USER\_EMPLOYEE\_PROFILE  +1

UNASSIGNED\_PROJECT\_ACCESS    +1

CROSS\_USER\_UNASSIGNED\_ACCESS +2

\--------------------------------

TOTAL                         4





###### Result



The combined activity produced a total contribution of:



+4





###### Finding



The system successfully identified the relationship between cross-user activity and unassigned project access.







##### Experiment 17 — Cross-User + Sensitive Access



**"Status: PASS"**



###### Activity Sequence



The user:



1\. accessed another employee's profile;

2\. accessed a sensitive resource.



###### Result



The expected cross-user/sensitive correlation was triggered.



###### Finding



The experiment demonstrated that contextual risk can increase when multiple individually meaningful activities occur within the same session.





#### 

#### 7\. Adaptive Authentication Results



##### Experiment 19 — HIGH Risk → Step-Up



**"Status: PASS"**



###### Objective



Determine whether the system changes its enforcement response when the session enters the HIGH risk range.



###### Expected Threshold





60–79 = HIGH





###### Result



The application detected HIGH risk and redirected the user to the step-up authentication flow.



The protected operation was not allowed to continue normally.



###### Finding



The experiment confirmed that continuous risk evaluation can change the authentication requirement **"after the initial login has already succeeded"**.







##### \## Experiment 20 — Successful Step-Up



**"Status: PASS"**



###### Activity



The user successfully completed the additional authentication challenge after HIGH risk was reached.

###### 

###### Expected Risk Change





Risk Score → Risk Score − 15





###### Result



The risk score was reduced by 15 points and the session was allowed to continue.



###### Finding



Additional authentication can restore a limited amount of trust to an elevated-risk session without resetting the entire risk state.







###### Experiment 21 — Failed Step-Up



**"Status: PASS"**



###### Activity



The user failed the additional authentication challenge.



###### Expected Risk Change





Risk Score → unchanged





###### Result



The accumulated risk was not reduced.



The user remained at the step-up authentication stage.



###### Finding



A failed authentication attempt does not restore trust or reduce the previously accumulated risk.







#### 8\. Risk Decay Results



##### Experiment 23 — Risk Decay



**"Status: PASS"**



###### Activity



The session performed qualifying normal activity over the required time interval.



###### Expected Behavior





Risk Score → Risk Score − 1





for each qualifying 30-second interval.



###### Result



The implemented decay mechanism reduced risk as expected.



###### Finding



The system can gradually restore trust when the session returns to qualifying normal behavior.







##### Experiment 24 — No Decay Without Qualifying Activity



**"Status: PASS"**



###### Activity



The user remained inactive after risk had been accumulated.



###### Result



The risk score did not automatically decrease merely because time passed.



###### Finding



Risk decay depends on **"qualifying normal activity"**, rather than passive passage of time.



This prevents a risky session from automatically becoming trusted simply by remaining open.







#### 9\. Session Lifecycle Results



##### Experiment 25 — Logout Destroys Risk State



**"Status: PASS"**



###### Activity



The authenticated user logged out.

###### 

###### Result



The application destroyed the risk state associated with the active research session.



###### Finding



Risk state is tied to the lifecycle of the authenticated session.







##### Experiment 26 — New Session ID



**"Status: PASS"**



###### Activity



The user logged out and subsequently authenticated again.



###### Result



A new research session ID was generated.



###### Finding



The new session does not reuse the previous research session identifier.



This supports session-level isolation of accumulated risk.





#### 10\. Pending Experiments



##### Experiment 22 — CRITICAL Session Termination



**"Status: PENDING EMPIRICAL CONFIRMATION"**



###### Objective



Verify that reaching CRITICAL risk immediately terminates the authenticated session.



###### Expected Behavior





Risk ≥ 80

&#x20;    |

&#x20;    v

CRITICAL

&#x20;    |

&#x20;    v

Protected Operation Denied

&#x20;    |

&#x20;    v

Risk State Destroyed

&#x20;    |

&#x20;    v

Application Session Destroyed





The CRITICAL state is designed as a terminal state.



However, the empirical result has not been recorded as a confirmed PASS in this experiment record.



###### Finding



**"Pending final empirical validation."**





##### \## Experiment 27 — Detailed Risk State



**"Status: PASS"**



###### Objective



Verify that the application can retrieve and display the detailed risk state associated with the authenticated session.



The detailed risk state includes information such as:



* session identifier
* username
* current risk score
* risk level
* active signals
* correlations
* risk history
* related timestamps.



###### Implementation Note



During development, the risk-state lookup initially used the wrong session property.



The correct session identifier is obtained from:





**req.session.sessionId**





and the username is obtained from the authenticated session user information.



The implementation was corrected and the final experiment has been recorded as PASS because it has been verified.



###### Finding



**"Gave detailed info about the users session"**







#### 11\. Consolidated Results



The completed experiments provide evidence for the following behaviors:



| Research Behavior                            | Evidence            |

| -------------------------------------------- | ------------------- |

| Initial authentication establishes a session | Experiment 1        |

| Normal activity can qualify for decay        | Experiment 2        |

| Cross-user activity increases risk           | Experiment 3        |

| Unassigned access increases risk             | Experiment 4        |

| Resource sensitivity affects risk            | Experiments 5, 7, 8 |

| Action severity affects risk                 | Experiment 6        |

| Correlated activity produces additional risk | Experiments 9–17    |

| Correlations are not repeatedly applied      | Experiment 10       |

| Risk can decay                               | Experiment 23       |

| Risk does not decay from time alone          | Experiment 24       |

| HIGH risk triggers step-up                   | Experiment 19       |

| Successful step-up reduces risk              | Experiment 20       |

| Failed step-up does not reduce risk          | Experiment 21       |

| Logout destroys risk state                   | Experiment 25       |

| New authentication creates a new session ID  | Experiment 26       |

| CRITICAL termination                         | Pending             |

| Detailed risk-state inspection               | Pass                |







## 12\. Key Experimental Findings



##### Finding 1 — Initial Authentication Does Not Permanently Establish Trust



The experiments demonstrate that successful authentication is only the starting point for the session.



Subsequent authenticated activity can increase the risk state.







##### Finding 2 — Different Activities Produce Different Levels of Risk



The system distinguishes between different activities rather than assigning the same risk value to every action.



For example:





**View      → +1**

**Copy      → +2**

**Download  → +3**

**Share     → +4**

**Delete    → +5**





This provides a basic representation of activity severity.







##### Finding 3 — Context Changes Risk



The same general concept of "**access**" can have different implications depending on context.



Cross-user access, unassigned project access, sensitive resources, confidential documents and restricted documents all contribute differently to the risk state.







##### Finding 4 — Activity Sequences Can Produce Additional Risk



Correlation experiments demonstrated that combinations of activities can trigger additional risk beyond the individual signals.



For example:





**Restricted Document**

&#x20;       **+**

**Download**

&#x20;       **+**

**Correlation**

&#x20;       **=**

**Additional Risk**





This allows the prototype to represent behavioral patterns rather than isolated events only.





##### Finding 5 — Risk Is Dynamic



The risk state is not permanently fixed after authentication.



It can:





Increase

&#x20;  ↓

Remain Elevated

&#x20;  ↓

Trigger Step-Up

&#x20;  ↓

Decrease After Successful Step-Up

&#x20;  ↓

Decrease Through Qualifying Normal Activity







##### 

##### Finding 6 — Authentication Requirements Can Change During a Session



The HIGH-risk experiment demonstrated that an already authenticated user can be required to authenticate again when the session becomes sufficiently risky.



This is the central adaptive behavior being investigated by the project.







##### Finding 7 — Failed Additional Authentication Does Not Restore Trust



A failed step-up leaves the accumulated risk unchanged.



This prevents an unsuccessful authentication attempt from artificially lowering the session's risk level.







##### Finding 8 — Risk Is Associated With the Session Lifecycle



The logout and new-session experiments demonstrate that risk state follows the research session lifecycle.



A new authenticated session receives a new session identifier rather than inheriting the previous session identifier.







#### 13\. Research Interpretation



The experimental results provide implementation-level evidence supporting the central research proposition:



> "**Authentication establishes an initial identity context, but trust in an active session must continue to be evaluated as user activity and context change."**



The prototype demonstrates this through a continuous sequence:





Initial Authentication

&#x20;       |

&#x20;       v

Authenticated Session

&#x20;       |

&#x20;       v

Continuous Activity

Monitoring

&#x20;       |

&#x20;       v

Risk Signals

&#x20;       |

&#x20;       v

Risk Accumulation

&#x20;       |

&#x20;       v

Risk Evaluation

&#x20;       |

&#x20;       +---------------------+

&#x20;       |                     |

&#x20;       v                     v

&#x20;   Acceptable              Elevated

&#x20;     Risk                    Risk

&#x20;       |                     |

&#x20;       v                     v

&#x20;     ALLOW                STEP-UP

&#x20;                             |

&#x20;                             v

&#x20;                   Additional Authentication

&#x20;                             |

&#x20;                   +---------+---------+

&#x20;                   |                   |

&#x20;                   v                   v

&#x20;                Success             Failure

&#x20;                   |                   |

&#x20;                   v                   v

&#x20;                Risk −15          No Reduction

&#x20;                   |

&#x20;                   v

&#x20;            Continue Monitoring





The experiments therefore demonstrate the feasibility of continuously adapting session trust based on observed activity rather than treating successful initial authentication as permanent proof of trust.





#### 

#### 14\. Conclusion



The completed experiments show that the prototype successfully implements the major behavioral components of the proposed risk-adaptive continuous authentication model.



In particular, the system demonstrated:



* continuous evaluation of authenticated activity
* risk accumulation
* contextual risk signals
* sensitivity-aware resource evaluation
* action-specific risk weighting
* correlation-based risk increases
* risk decay through qualifying normal activity
* HIGH-risk step-up authentication
* successful and failed step-up handling
* session-bound risk state
* session lifecycle handling.



One experiments remain explicitly pending empirical confirmation:



1\. \*\*CRITICAL session termination\*\*



Overall, the completed results support the research concept that **"session trust should be continuously evaluated after authentication and adapted according to changes in user behavior and context**".



