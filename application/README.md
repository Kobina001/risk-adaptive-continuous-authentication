### Risk-Adaptive Continuous Authentication



A research prototype investigating how "**continuous session-risk evaluation"** can complement initial authentication by adapting trust according to changes in user activity and context.







#### 1\. Research Overview



Traditional authentication primarily establishes that a user can successfully prove their identity at the beginning of a session.



However, successful authentication does not necessarily mean that the session should remain trusted indefinitely.



A user's activity may change after authentication. They may begin accessing resources outside their assigned responsibilities, accessing another employee's information, interacting with sensitive documents or performing increasingly risky operations.



This project investigates a simple research question:



> "**How can an authenticated session continuously adapt its trust level as user behavior and context change"**



The prototype addresses this by continuously evaluating activity during an authenticated session and maintaining a session-specific risk score.



As risk changes, the system can:



* allow the session to continue
* require additional authentication
* or terminate the session when risk becomes critical.







#### 2\. Research Principle



The project is based on the principle that:



> "**Authentication establishes an initial identity context, but trust in an active session must continue to be evaluated as activity and context change."**



The system therefore separates:





Initial Authentication

&#x20;       |

&#x20;       v

Authenticated Identity

&#x20;       |

&#x20;       v

Continuous Session Evaluation

&#x20;       |

&#x20;       v

Changing Risk State

&#x20;       |

&#x20;       v

Adaptive Security Response





Initial authentication establishes the user's identity.



Continuous evaluation determines whether the behavior of the authenticated session remains within an acceptable level of risk.







#### 3\. What Was Built



The project implements a local research environment consisting of:



* "**Keycloak"** as the identity provider
* "**OpenID Connect (OIDC)"** for authentication
* "**Authorization Code Flow with PKCE**"
* a "**Node.js / Express**" research application
* a real-time "**risk engine**"
* session-bound risk state
* simulated corporate resources
* employee profiles
* project assignments
* document sensitivity levels
* document activity monitoring
* risk correlations
* adaptive step-up authentication
* risk decay
* session lifecycle handling
* terminal-based risk monitoring
* activity logging.



The application evaluates risk "**during the request lifecycle"** before the protected operation is allowed to proceed.







#### 4\. High-Level Architecture





&#x20;                        +------------------+

&#x20;                        |     Keycloak     |

&#x20;                        |  Identity        |

&#x20;                        |    Provider      |

&#x20;                        +--------+---------+

&#x20;                                 |

&#x20;                                 | OIDC + PKCE

&#x20;                                 v

&#x20;                   +-------------+-------------+

&#x20;                   |       Node.js             |

&#x20;                   |          Application      |

&#x20;                   +-------------+-------------+

&#x20;                                 |

&#x20;                                 v

&#x20;                   +-------------+-------------+

&#x20;                   | Continuous Risk Evaluation|

&#x20;                   |        Risk Engine        |

&#x20;                   +-------------+-------------+

&#x20;                                 |

&#x20;                   +-------------+-------------+

&#x20;                   |                           |

&#x20;                   v                           v

&#x20;            Risk Signals                Correlation Rules

&#x20;                   |                           |

&#x20;                   +-------------+-------------+

&#x20;                                 |

&#x20;                                 v

&#x20;                          Risk Score

&#x20;                                 |

&#x20;                                 v

&#x20;                        +--------+--------+

&#x20;                        |   Risk Level    |

&#x20;                        +--------+--------+

&#x20;                                 |

&#x20;            +--------------------+--------------------+

&#x20;            |                    |                    |

&#x20;            v                    v                    v

&#x20;          ALLOW               STEP-UP             TERMINATE





#### 

#### 5\. Risk Model



The prototype uses a risk score ranging from "**0 to 100"**.



|  Score | Risk Level | Response  |

| -----: | ---------- | --------- |

|   0–30 | LOW        | ALLOW     |

|  31–59 | MEDIUM     | ALLOW     |

|  60–79 | HIGH       | STEP-UP   |

| 80–100 | CRITICAL   | TERMINATE |



The model does not treat every activity equally.



Risk contributions depend on the activity and its context.



##### Example Signals



| Signal                      | Weight |

| --------------------------- | -----: |

| Cross-user employee profile |     +1 |

| Unassigned project access   |     +1 |

| Sensitive resource          |     +2 |

| Document view               |     +1 |

| Document copy               |     +2 |

| Document download           |     +3 |

| Document share              |     +4 |

| Document delete             |     +5 |

| Confidential document       |     +2 |

| Restricted document         |     +3 |

| Unusual activity            |     +3 |



The system also evaluates combinations of activities through correlation rules.



For example:





Restricted Document

&#x20;       +

Download

&#x20;       +

Correlation

&#x20;       |

&#x20;       v

Additional Risk









#### 6\. Adaptive Responses



The prototype uses three main responses.



##### ALLOW



LOW and MEDIUM risk sessions remain permitted to continue.



##### STEP-UP



When the risk score reaches the HIGH range, the system interrupts the protected operation and requires additional authentication.



A successful step-up:





Risk Score → Risk Score − 15





and allows the session to continue.



A failed step-up does not reduce the accumulated risk.



##### TERMINATE



When the session reaches CRITICAL risk, the system is designed to terminate the authenticated session and destroy its associated risk state.







#### 7\. Risk Decay



Risk is not intended to remain permanently elevated after a temporary change in behavior.



The prototype therefore supports normal-activity decay.



After a qualifying "**30-second normal-activity interval**", the risk score decreases by:





−1





However, the passage of time alone does not reduce risk.



The session must perform activity that qualifies as normal.



This creates a distinction between:





Time Passing

&#x20;    ≠

Normal Activity









#### 8\. Experimental Validation



The prototype was validated through a series of controlled experiments.



The experiments covered:



* fresh authentication
* normal activity
* cross-user access
* unassigned project access
* sensitive-resource access
* document actions
* confidential documents
* restricted documents
* correlated document activity
* cross-context correlations
* HIGH-risk transitions
* successful step-up authentication
* failed step-up authentication
* risk decay
* absence of decay without qualifying activity
* logout and risk-state destruction
* creation of a new session ID.



For example, a restricted-document download produced:





DOCUMENT\_VIEW                 +1

RESTRICTED\_DOCUMENT           +3

DOCUMENT\_DOWNLOAD             +3

RESTRICTED\_DOCUMENT           +3

RESTRICTED\_DOCUMENT\_DOWNLOAD  +2

\--------------------------------

TOTAL                         12





This demonstrated that the prototype can combine individual signals with contextual correlation rules.







#### 9\. Experimental Findings



The completed experiments demonstrated that the prototype can:



1\. establish an authenticated session

2\. continuously evaluate activity after authentication

3\. accumulate risk within the active session

4\. distinguish activities according to severity

5\. incorporate resource sensitivity

6\. identify contextual relationships between activities

7\. apply correlation-based risk

8\. reduce risk through qualifying normal activity

9\. prevent passive time from automatically reducing risk

10\. trigger step-up authentication at HIGH risk

11\. reduce risk after successful step-up authentication

12\. retain the accumulated risk after failed step-up authentication

13\. destroy risk state during logout

14\. create a new research session identifier after a new login.



One experiment remain explicitly pending empirical confirmation:



* CRITICAL session termination





It is not presented as completed experimental findings.







#### 10\. Project Structure



The repository is organized around the research application, simulated corporate resources, documentation, experiments and Keycloak configuration.





risk-adaptive-continuous-authentication/

│

└── application/

&#x20;   │

&#x20;   ├── corporate\_documents/

&#x20;   │   ├── PUBLIC/

&#x20;   │   ├── INTERNAL/

&#x20;   │   ├── CONFIDENTIAL/

&#x20;   │   └── RESTRICTED/

&#x20;   │

&#x20;   ├── documentation/

&#x20;   │   ├── architecture.md

&#x20;   │   ├── risk-model.md

&#x20;   │   ├── authentication-flow.md

&#x20;   │   └── testing.md

&#x20;   │

&#x20;   ├── experiments/

&#x20;   │   ├── README.md

&#x20;   │   └── experiment-results.md

&#x20;   │

&#x20;   ├── keycloak/

&#x20;   │   └── realm-export.json

&#x20;   │

&#x20;   ├── logs/

&#x20;   │

&#x20;   ├── public/

&#x20;   │   ├── document.html

&#x20;   │   ├── employee.html

&#x20;   │   ├── project.html

&#x20;   │   ├── styless.css

&#x20;   │   └── workspace.html

&#x20;   │

&#x20;   ├── views/

&#x20;   │   ├── dashboard.html

&#x20;   │   ├── home.html

&#x20;   │   ├── privileged.html

&#x20;   │   ├── protected.html

&#x20;   │   └── sensitive.html

&#x20;   │

&#x20;   ├── .env.example

&#x20;   ├── .gitignore

&#x20;   ├── package.json

&#x20;   ├── package-lock.json

&#x20;   ├── riskengine.js

&#x20;   └── server.js





##### Directory Descriptions



| Directory / File       | Purpose                                                                                        |

| ---------------------- | ---------------------------------------------------------------------------------------------- |

| `corporate\_documents/` | Simulated corporate documents organized according to sensitivity level                         |

| `documentation/`       | Technical and research documentation                                                           |

| `experiments/`         | Experimental methodology and recorded results                                                  |

| `keycloak/`            | Sanitized Keycloak realm configuration used to reproduce the authentication environment        |

| `logs/`                | Local application activity logs generated during research experiments                          |

| `public/`              | Static HTML/CSS resources served by the Express application                                    |

| `views/`               | Application pages rendered or served by the research application                               |

| `.env.example`         | Example environment configuration without secrets                                              |

| `.gitignore`           | Files and directories excluded from version control                                            |

| `package.json`         | Node.js project metadata and dependencies                                                      |

| `package-lock.json`    | Locked dependency versions                                                                     |

| `riskengine.js`        | Core continuous risk-evaluation engine                                                         |

| `server.js`            | Express application, authentication flow, protected resources, telemetry, and risk enforcement |



The `application/` directory contains the complete executable research environment.







#### 11\. Documentation



The project documentation is divided according to purpose.



| Document                               | Description                                                                        |

| -------------------------------------- | ---------------------------------------------------------------------------------- |

| `documentation/architecture.md`        | Technical architecture of the research prototype                                   |

| `documentation/risk-model.md`          | Risk scoring, signals, correlations, thresholds, decay and adaptive responses     |

| `documentation/authentication-flow.md` | Initial authentication, session creation, step-up authentication and logout flows |

| `documentation/testing.md`             | Testing methodology and validation procedures                                      |

| `experiments/README.md`                | Guide to the experimental environment and experiment records                       |

| `experiments/experiment-results.md`    | Recorded experimental results and findings                                         |





#### 

#### 12\. Technology Stack



##### Identity



* Keycloak
* OpenID Connect
* OAuth 2.0
* Authorization Code Flow
* PKCE



##### Application



* Node.js
* Express
* JavaScript
* "**openid-client**"
* Express Session



##### Research Components



* Custom risk engine
* Session-bound risk state
* Contextual activity signals
* Correlation rules
* Adaptive step-up authentication
* Risk decay
* Activity logging
* Terminal risk monitoring







#### 13\. Running the Research Environment



##### Prerequisites



The local environment requires:



* Node.js
* Java / a compatible Java runtime for Keycloak
* Keycloak
* a configured Keycloak realm and client
* a browser
* the project source code.



##### Application Setup



Navigate to the application directory:





cd application



Install dependencies:





npm install





Create a local environment configuration from the provided example:





copy .env.example .env





Configure the required Keycloak and application settings in `.env`.







Start the application using the project's configured start command.



After startup, access the local application through the configured localhost address.







#### 14\. Reproducing the Experiments



##### The experiments can be reproduced by:



1\. starting Keycloak

2\. starting the Node.js application

3\. authenticating through Keycloak

4\. performing the activity associated with an experiment

5\. observing the application's response

6\. observing the terminal risk monitor

7\. recording the generated signals and risk score

8\. comparing the result with the expected behavior.



##### Experimental evidence should record:





Experiment ID

Initial Risk Score

Activity

Generated Signals

Correlation

Risk Contribution

Final Risk Score

Risk Level

Decision

Enforcement Result





The detailed procedures and results are documented in the `experiments/` directory.







#### 15\. Security and Scope



This project is a "**local research prototype**".



The corporate environment represented by the application is simulated for research purposes.



The project does not attempt to implement a complete enterprise IAM platform.



The research scope intentionally focuses on:



> **"Continuous evaluation of trust within an already authenticated session."**



The prototype does not attempt to solve every aspect of adaptive access control, identity management or enterprise security.



The selected risk weights and thresholds are experimental parameters used to demonstrate the behavior of the model. They should not be interpreted as universally optimal production values.







#### 16\. Research Limitations



The current prototype has several limitations:



* the corporate resources are simulated
* the employee and project data are simulated
* risk weights are manually defined research parameters
* the experiments are performed in a controlled local environment
* the prototype has not been evaluated against a large real-world user population
* the model has not been statistically validated against enterprise security incidents
* the current implementation is not intended for production deployment.



Consequently, the results demonstrate "**prototype feasibility and behavioral validation**" rather than universal security effectiveness.







#### 17\. Research Contribution



The primary contribution of this project is an implemented and experimentally evaluated prototype demonstrating how an authenticated session can maintain a changing trust state rather than treating successful login as permanent trust.



The prototype connects:





Identity

&#x20;  +

Activity

&#x20;  +

Context

&#x20;  +

Risk Evaluation

&#x20;  +

Adaptive Authentication





into a single session-oriented research model.



Rather than asking only:



> "**Is this user authenticated?**"



the system continuously evaluates:



> "**Given what this authenticated session is doing now, should the current level of trust remain unchanged?**"



This distinction forms the basis of the project's investigation into risk-adaptive continuous authentication.







#### 18\. Future Research



Potential future research can investigate:



* empirical calibration of risk weights
* larger-scale behavioral datasets
* additional contextual signals
* comparative evaluation of risk models
* false-positive and false-negative analysis
* usability impact of repeated step-up authentication
* evaluation against realistic enterprise activity patterns
* alternative methods for restoring or reducing session risk.



These are potential extensions and are outside the current prototype scope.











#### 19\. Summary



This project investigates the idea that "**successful authentication should establish identity, but not necessarily permanent trust**."



The implemented prototype continuously evaluates authenticated session activity, assigns contextual risk, detects correlated behavior, allows risk to decay under qualifying normal activity and adapts its security response as risk changes.



The resulting model is:





&#x20;                AUTHENTICATION

&#x20;                      |

&#x20;                      v

&#x20;             AUTHENTICATED SESSION

&#x20;                      |

&#x20;                      v

&#x20;            CONTINUOUS MONITORING

&#x20;                      |

&#x20;                      v

&#x20;                 RISK SIGNALS

&#x20;                      |

&#x20;                      v

&#x20;             RISK ACCUMULATION

&#x20;                      |

&#x20;                      v

&#x20;              RISK EVALUATION

&#x20;                      |

&#x20;         +------------+------------+

&#x20;         |            |            |

&#x20;         v            v            v

&#x20;        LOW        MEDIUM        HIGH

&#x20;         |            |            |

&#x20;         +------ALLOWED-----------+

&#x20;                                  |

&#x20;                                  v

&#x20;                              STEP-UP

&#x20;                                  |

&#x20;                      +-----------+-----------+

&#x20;                      |                       |

&#x20;                      v                       v

&#x20;                  SUCCESS                  FAILURE

&#x20;                      |                       |

&#x20;                      v                       v

&#x20;                   Risk −15              No Reduction

&#x20;                      |

&#x20;                      v

&#x20;               CONTINUE SESSION

&#x20;                      |

&#x20;                      v

&#x20;                  CRITICAL

&#x20;                      |

&#x20;                      v

&#x20;                 TERMINATE





The experiments provide implementation-level evidence that session trust can be continuously evaluated and adapted after initial authentication based on changes in user activity and context.



