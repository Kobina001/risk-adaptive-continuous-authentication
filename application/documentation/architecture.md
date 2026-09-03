### System Architecture



#### 1\. Overview



The Risk-Adaptive Continuous Authentication Research Environment is a Node.js and Express-based application integrated with Keycloak through OpenID Connect (OIDC).



The architecture is designed to demonstrate that authentication establishes an initial identity context, while the security of an active session can continue to be evaluated as activity and contextual conditions change.



The application acts as the enforcement layer between the authenticated user and protected resources. User activity is evaluated by the continuous risk engine before protected operations are allowed to proceed.



The main application components are:



* Keycloak / OpenID Connect identity provider
* Node.js / Express application
* Application session management
* Continuous risk engine
* Client-context and activity telemetry
* Corporate resource environment
* Activity logging
* Risk monitoring and research APIs







#### 2\. High-Level Architecture





&#x20;                        +----------------------+

&#x20;                        |       Keycloak       |

&#x20;                        |   Identity Provider   |

&#x20;                        |       OIDC/PKCE      |

&#x20;                        +----------+-----------+

&#x20;                                   |

&#x20;                                   | Authentication

&#x20;                                   v

+----------------+        +---------+----------+

|                |        |                    |

|     User       +------->|   Node.js /        |

|    Browser     |        |   Express Server   |

|                |        |                    |

+----------------+        +---------+----------+

&#x20;                                   |

&#x20;                +------------------+------------------+

&#x20;                |                  |                  |

&#x20;                v                  v                  v

&#x20;       +----------------+  +---------------+  +----------------+

&#x20;       | Application    |  | Telemetry \&   |  | Activity       |

&#x20;       | Session        |  | Client        |  | Logging        |

&#x20;       | Management     |  | Context       |  |                |

&#x20;       +-------+--------+  +-------+-------+  +----------------+

&#x20;               |                   |                  |

&#x20;               +-------------------+------------------+

&#x20;                                   |

&#x20;                                   v

&#x20;                        +----------+-----------+

&#x20;                        |                      |

&#x20;                        | Continuous Risk      |

&#x20;                        | Engine               |

&#x20;                        |  riskengine.js       |

&#x20;                        |                      |

&#x20;                        +----------+-----------+

&#x20;                                   |

&#x20;                                   | Risk Result

&#x20;                                   v

&#x20;                        +----------+-----------+

&#x20;                        | Live Risk Enforcement|

&#x20;                        |                      |

&#x20;                        | ALLOW                |

&#x20;                        | STEP-UP              |

&#x20;                        | TERMINATE            |

&#x20;                        +----------+-----------+

&#x20;                                   |

&#x20;                 +-----------------+-----------------+

&#x20;                 |                 |                 |

&#x20;                 v                 v                 v

&#x20;          +-------------+   +-------------+   +-------------+

&#x20;          | Corporate   |   | Project /   |   | Document    |

&#x20;          | Workspace   |   | Employee    |   | Resources   |

&#x20;          |             |   | Resources   |   |             |

&#x20;          +-------------+   +-------------+   +-------------+



&#x20;                        +----------------------+

&#x20;                        | Research / Risk APIs |

&#x20;                        | and Terminal Monitor |

&#x20;                        +----------------------+

```



The architecture separates **identity establishment**, **session management**, **risk evaluation** and **risk enforcement**. The application imports the risk evaluation and session-risk functions from **"riskengine.js"**, allowing the server to submit activity to the authoritative risk engine and enforce the returned decision.







#### 3\. System Components



##### 3.1 Keycloak Identity Provider



Keycloak provides the identity layer for the research environment.



The application discovers the OIDC configuration from the configured issuer and uses the Keycloak client configuration to establish authentication.



Keycloak is responsible for authenticating the user and returning the OIDC authentication result to the application.



The application uses:



* OpenID Connect
* Authorization Code flow
* PKCE
* OIDC state validation
* User information retrieval
* ID tokens and access tokens



The application requests the **openid profile email** scopes during authentication.







##### 3.2 Node.js / Express Application



**"server.js**" is the main application and enforcement layer.



It provides:



* HTTP routes
* authentication handling
* application sessions
* resource access
* activity telemetry
* risk evaluation
* risk enforcement
* step-up authentication
* document operations
* project operations
* employee directory operations
* risk-state APIs
* logging
* logout handling



The application uses Express middleware for JSON requests, URL-encoded requests, static resources and session management.







##### 3.3 Application Session



After successful initial authentication, the application stores the authenticated user information in the application session.



A unique research session identifier is generated using "**crypto.randomUUID()**".



The session therefore provides the link between:





Authenticated Identity

&#x20;       +

Application Session

&#x20;       +

Research Session ID

&#x20;       +

Risk Engine State





The session also stores information required for OIDC and step-up authentication.



The initial authentication callback stores the user information, generates the session ID, stores the ID token, initializes client context, records the successful login and redirects the user to the dashboard.







#### 4\. Authentication Architecture



The normal authentication sequence is:





User

&#x20; |

&#x20; v

Application /login

&#x20; |

&#x20; v

Generate PKCE Verifier

&#x20; |

&#x20; v

Generate PKCE Challenge

&#x20; |

&#x20; v

Generate OIDC State

&#x20; |

&#x20; v

Redirect to Keycloak

&#x20; |

&#x20; v

User Authentication

&#x20; |

&#x20; v

Keycloak Callback

&#x20; |

&#x20; v

Authorization Code Grant

&#x20; |

&#x20; v

Fetch User Information

&#x20; |

&#x20; v

Create Application Session

&#x20; |

&#x20; v

Generate Research Session ID

&#x20; |

&#x20; v

Initialize Risk Context

&#x20; |

&#x20; v

Dashboard





During login, the application generates a PKCE verifier and challenge and a random state value before redirecting the user to Keycloak.



The callback validates the authorization response using the stored PKCE verifier and expected state before retrieving user information.







#### 5\. Authentication and Continuous Risk Evaluation



Authentication and risk evaluation perform different functions.





Authentication

&#x20;     |

&#x20;     v

"Who is the user?"

&#x20;     |

&#x20;     v

Authenticated Session

&#x20;     |

&#x20;     v

Continuous Risk Evaluation

&#x20;     |

&#x20;     v

"Should this active session

continue to be trusted?"





Initial authentication does not permanently establish trust for every subsequent action.



Instead, protected operations can invoke the live risk evaluation process using the current session ID, authenticated username, activity signals, metadata, and normal-activity qualification.



The "**evaluateLiveRisk()"** function obtains the current session ID and normalized username and passes the activity to the risk engine with decay and correlation evaluation enabled.



\---



#### 6\. Live Risk Evaluation Layer



The live risk evaluation layer is implemented inside "**server.js"** through **evaluateLiveRisk()**.



The process is:





Protected Request

&#x20;      |

&#x20;      v

Identify Session

&#x20;      |

&#x20;      v

Identify Authenticated User

&#x20;      |

&#x20;      v

Collect Activity Signals

&#x20;      |

&#x20;      v

Collect Context Metadata

&#x20;      |

&#x20;      v

Determine Normal-Activity Qualification

&#x20;      |

&#x20;      v

riskengine.evaluateActivity()

&#x20;      |

&#x20;      v

Risk Result

&#x20;      |

&#x20;      v

Live Enforcement





The risk engine receives:



* session ID
* username
* risk signals
* metadata
* normal-activity qualification
* decay enabled
* correlation evaluation enabled



This means risk evaluation occurs as part of the request-processing path rather than being performed only after activity has been logged.



\---



#### 7\. Live Risk Enforcement



After the risk engine returns a result, "**enforceLiveRisk()"** determines whether the requested operation can proceed.



The enforcement layer has three principal outcomes:





&#x20;                 Risk Result

&#x20;                      |

&#x20;         +------------+------------+

&#x20;         |            |            |

&#x20;         v            v            v

&#x20;       ALLOW        STEP-UP     TERMINATE

&#x20;         |            |            |

&#x20;         v            v            v

&#x20;    Operation      Additional   Session

&#x20;     Proceeds     Authentication Terminated





###### LOW / MEDIUM



For LOW and MEDIUM risk states, the enforcement function returns "**true**", allowing the protected operation to proceed.



###### HIGH



When step-up is required, the application stores the interrupted resource path and risk information in the session, records the step-up event and redirects the user to the step-up page.



###### CRITICAL



When the risk engine returns a termination decision, the application records the event, destroys the corresponding risk state, destroys the application session and returns a session-terminated response.







#### 8\. Protected Resource Architecture



Protected resources are placed behind authentication and, where appropriate, live risk evaluation.



Examples include:



* sensitive resources
* privileged operations
* employee profiles
* projects
* corporate documents
* document actions



For example, access to a sensitive resource invokes "**evaluateLiveRisk()"** with the "**SENSITIVE\_RESOURCE"** signal before the resource is returned to the user.



Similarly, a privileged operation evaluates an "**UNUSUAL\_ACTIVIT"** signal before allowing the operation to proceed.



This creates the following enforcement pattern:





Request

&#x20;  |

&#x20;  v

Authenticated?

&#x20;  |

&#x20;  +---- No ----> Reject / Redirect

&#x20;  |

&#x20; Yes

&#x20;  |

&#x20;  v

Collect Context

&#x20;  |

&#x20;  v

Evaluate Risk

&#x20;  |

&#x20;  v

Enforce Decision

&#x20;  |

&#x20;  +---- ALLOW ------> Protected Operation

&#x20;  |

&#x20;  +---- STEP-UP ----> Additional Authentication

&#x20;  |

&#x20;  +---- TERMINATE --> Destroy Session

```



\---



#### 9\. Behavioral and Contextual Telemetry



The system records activity and contextual information associated with the authenticated session.



The activity logger records information including:



* timestamp
* session ID
* username
* event
* action
* resource
* operating system
* browser
* device
* IP address
* access hour
* location
* additional event details



The resulting records are written to "**logs/activity.log"**.



Client location can also be submitted through the telemetry context endpoint. Valid latitude and longitude values are stored in the session's client context and the update is logged.



The telemetry therefore provides contextual information that can accompany activity evaluation.







#### 10\. Employee Directory Architecture



The employee directory provides a controlled research environment for examining identity-context changes.



When a user views another employee's profile, the application identifies that the target employee is different from the authenticated user and generates the:





**CROSS\_USER\_EMPLOYEE\_PROFILE** signal.





The application then evaluates the signal before allowing the profile operation to proceed.



This allows the research environment to distinguish between:





User views own profile

&#x20;       |

&#x20;       v

Normal contextual activity



User views another employee

&#x20;       |

&#x20;       v

Cross-user contextual activity

&#x20;       |

&#x20;       v

Risk signal









#### 11\. Project Access Architecture



Projects contain an assigned user.



When a user accesses a project, the application compares the authenticated username with the project's assigned user.



If the identities do not match, the application generates:





**UNASSIGNED\_PROJECT\_ACCESS**





The resulting activity is evaluated by the risk engine before the project operation is allowed to continue.



The assignment mismatch is also recorded as telemetry.



This creates a contextual distinction between:





Assigned Project

&#x20;      |

&#x20;      v

Normal contextual access



Unassigned Project

&#x20;      |

&#x20;      v

Assignment mismatch

&#x20;      |

&#x20;      v

Risk signal









#### 12\. Corporate Document Architecture



The application provides a simulated corporate document environment containing documents with different classifications and sensitivity levels.



The document environment includes:



* PUBLIC
* INTERNAL
* CONFIDENTIAL
* RESTRICTED



Document access is integrated with the live risk engine.



When a document is opened, the application generates "**DOCUMENT\_VIEW"** and for higher classifications, adds the corresponding classification signal.



The application also evaluates whether the activity qualifies as normal activity. PUBLIC and INTERNAL document access can qualify as normal document activity, while higher-classification document access does not.



Document operations can also be evaluated individually, including actions such as:



* View
* Download
* Copy
* Share
* Delete



The delete operation, for example, performs a separate live risk evaluation before modifying the document state.







#### 13\. Step-Up Authentication Architecture



Step-up authentication is initiated when the risk engine determines that the current session requires additional authentication.



The sequence is:





Protected Operation

&#x20;      |

&#x20;      v

Risk Evaluation

&#x20;      |

&#x20;      v

HIGH

&#x20;      |

&#x20;      v

STEP-UP Required

&#x20;      |

&#x20;      v

Store Original Resource

&#x20;      |

&#x20;      v

Step-Up Authentication

&#x20;      |

&#x20;      +----------------------+

&#x20;      |                      |

&#x20;      v                      v

&#x20;   Success                 Failure

&#x20;      |                      |

&#x20;      v                      v

&#x20;  Risk −15              No Reduction

&#x20;      |                      |

&#x20;      v                      v

Return to Original       Remain Protected

Resource                 / Try Again





The application stores the original requested path when step-up is triggered so that a successful authentication can return the user to the interrupted resource.



The step-up authentication process generates a new PKCE verifier, challenge and state and uses "**prompt: "login""** to require an additional authentication interaction.



After successful step-up authentication, the application verifies that the authenticated identity matches the identity associated with the current session before applying the successful step-up operation.



A successful step-up reduces the risk score by 15 and redirects the user to the original resource.



A failed step-up does not reduce the risk score. The application records the failure and informs the user that the current session remains protected.







#### 14\. CRITICAL Session Termination



CRITICAL risk represents the terminal enforcement condition.



When the risk result requires session termination:



1\. The termination event is logged.

2\. The risk-engine state associated with the session is destroyed.

3\. The application session is destroyed.

4\. The protected request is denied.

5\. The user receives a session-termination response.



The implementation explicitly destroys the risk state before destroying the application session.



This prevents the application from continuing to treat a terminated session as an active research risk state.







15\. Risk-State APIs



The application exposes research-oriented endpoints for inspecting the current risk state.



The current-risk endpoint retrieves the current risk associated with the authenticated session:





GET /risk/current





The detailed risk endpoint provides the complete risk state:





GET /risk/details





Both endpoints require authentication and use the current application session ID and normalized username when querying the risk engine.



A separate research endpoint provides detailed session risk information using the session's actual "**sessionI"**` and authenticated username.



These endpoints make the internal risk state observable for research and experimentation without requiring direct access to the risk engine implementation.







#### 16\. Terminal Risk Monitor



The application includes a terminal-based research monitor that displays each live risk evaluation.



The monitor reports:



* user
* session
* signals
* normal-activity qualification
* risk score
* risk level
* decision
* step-up requirement
* signal details
* correlations
* enforcement result



For signal and correlation events, it also displays the score transition.



The enforcement output explicitly identifies:





* ALLOW
* STEP-UP
* TERMINATE





and indicates whether the protected operation may proceed, requires additional authentication or requires session termination.



This monitor provides direct observable evidence that risk evaluation is occurring during active requests.







#### 17\. Activity Logging



Activity logging operates as a separate observability component.



The logger collects both authentication/session information and contextual request information before writing structured JSON records to the activity log.



The general logging flow is:





Application Event

&#x20;      |

&#x20;      v

Collect Session Information

&#x20;      |

&#x20;      v

Collect Request Context

&#x20;      |

&#x20;      v

Build Structured Log Entry

&#x20;      |

&#x20;      v

logs/activity.log





The logging mechanism records whether an operation was allowed and includes contextual details associated with the event.



The logs therefore provide an audit trail of activity, while the risk engine maintains the active session-risk state.



These are related but separate responsibilities:





Activity Log

&#x20;   |

&#x20;   +--> Historical / Audit Evidence



Risk Engine State

&#x20;   |

&#x20;   +--> Current Session Risk









#### 18\. Logout and Session Lifecycle



Logout removes both the application session and the corresponding risk-engine state.



The logout sequence is:





User Logout

&#x20;    |

&#x20;    v

Retrieve Session Information

&#x20;    |

&#x20;    v

Destroy Risk Engine State

&#x20;    |

&#x20;    v

Log Logout Event

&#x20;    |

&#x20;    v

Destroy Application Session

&#x20;    |

&#x20;    v

Redirect to Keycloak Logout

&#x20;    |

&#x20;    v

Return to Application





The implementation explicitly calls "**destroyRiskState()"** before destroying the application session.



After the application session is destroyed, the application constructs the Keycloak logout request and includes the ID-token hint when available, together with the post-logout redirect URI and client ID.



This ensures that normal logout also removes the active risk state associated with the session.



\---



#### 19\. Research Session Lifecycle



The complete session lifecycle is:





&#x20;                 +----------------+

&#x20;                 | Initial Login  |

&#x20;                 +-------+--------+

&#x20;                         |

&#x20;                         v

&#x20;                 +----------------+

&#x20;                 | Create Session |

&#x20;                 | + Session ID   |

&#x20;                 +-------+--------+

&#x20;                         |

&#x20;                         v

&#x20;                 +----------------+

&#x20;                 | Risk State     |

&#x20;                 | Initialized    |

&#x20;                 +-------+--------+

&#x20;                         |

&#x20;                         v

&#x20;                Continuous Activity

&#x20;                         |

&#x20;                         v

&#x20;                   Risk Evaluation

&#x20;                         |

&#x20;            +------------+------------+

&#x20;            |            |            |

&#x20;            v            v            v

&#x20;          ALLOW       STEP-UP      TERMINATE

&#x20;            |            |            |

&#x20;            |            v            v

&#x20;            |       Additional     Destroy

&#x20;            |       Authentication  Session

&#x20;            |            |

&#x20;            |       +----+----+

&#x20;            |       |         |

&#x20;            |       v         v

&#x20;            |    Success    Failure

&#x20;            |       |         |

&#x20;            |       v         v

&#x20;            |    Risk −15   No Reduction

&#x20;            |       |

&#x20;            +-------+

&#x20;                    |

&#x20;                    v

&#x20;            Continue Monitoring

&#x20;                    |

&#x20;                    v

&#x20;                  Logout

&#x20;                    |

&#x20;                    v

&#x20;            Destroy Risk State

&#x20;                    |

&#x20;                    v

&#x20;            Destroy Application

&#x20;                 Session









#### 20\. Application Startup



The application initializes the OIDC configuration before starting the Express server.



The startup sequence is:





Application Start

&#x20;      |

&#x20;      v

Initialize OIDC Configuration

&#x20;      |

&#x20;      v

OIDC Configuration Loaded

&#x20;      |

&#x20;      v

Start Express Server

&#x20;      |

&#x20;      v

Research Environment Available





The application calls "**initializeOIDC()"** and starts listening only after the OIDC configuration has been successfully initialized.







#### 21\. Architectural Separation of Responsibilities



The architecture separates responsibilities between the main application and the risk engine.



###### **server.js**



Responsible for:



* HTTP request handling
* authentication
* application sessions
* collecting activity and context
* selecting risk signals
* sending activity to the risk engine
* enforcing risk decisions
* protecting resources
* performing resource operations
* logging
* step-up workflow
* logout



###### **riskengine.js**



Responsible for:



* maintaining session risk state
* scoring signals
* applying correlations
* calculating risk levels
* applying normal-activity decay
* applying successful step-up reduction
* handling failed step-up state
* producing risk decisions
* maintaining risk history



This separation allows the research experiment to treat the risk engine as the authoritative decision component while the Express application acts as the system through which real user activity reaches that engine.







#### 22\. Core Request-to-Enforcement Pattern



The central architectural pattern of the system can be summarized as:





User Request

&#x20;    |

&#x20;    v

Authentication Check

&#x20;    |

&#x20;    v

Collect Identity + Context

&#x20;    |

&#x20;    v

Identify Activity Signals

&#x20;    |

&#x20;    v

Continuous Risk Evaluation

&#x20;    |

&#x20;    v

Risk Engine

&#x20;    |

&#x20;    v

Risk Result

&#x20;    |

&#x20;    v

Enforcement

&#x20;    |

&#x20;    +----------+------------+

&#x20;    |          |            |

&#x20;    v          v            v

&#x20;  ALLOW     STEP-UP      TERMINATE

&#x20;    |          |            |

&#x20;    v          v            v

Resource     Additional    Session

Operation    Auth          Removal





This pattern is the central architectural mechanism through which the project demonstrates continuous authentication.



The key architectural principle is that "**protected operations do not rely solely on the fact that the user authenticated successfully earlier in the session"**. Instead, the current session is evaluated using the activity and context available at the time of the request.







#### 23\. Research Architecture Summary



The research environment therefore consists of five major security layers:





+------------------------------------------------------+

|                Identity Layer                        |

|              Keycloak / OIDC / PKCE                 |

+------------------------------------------------------+

&#x20;                        |

&#x20;                        v

+------------------------------------------------------+

|                Session Layer                         |

|      Express Session + Research Session ID          |

+------------------------------------------------------+

&#x20;                        |

&#x20;                        v

+------------------------------------------------------+

|              Continuous Risk Layer                   |

|       Signals + Correlations + Decay + State        |

|                  riskengine.js                       |

+------------------------------------------------------+

&#x20;                        |

&#x20;                        v

+------------------------------------------------------+

|              Enforcement Layer                      |

|       ALLOW  |  STEP-UP  |  TERMINATE              |

+------------------------------------------------------+

&#x20;                        |

&#x20;                        v

+------------------------------------------------------+

|              Protected Resources                    |

| Projects | Employees | Documents | Sensitive Ops   |

+------------------------------------------------------+

```



The architecture demonstrates a transition from traditional authentication toward continuous session-risk evaluation.



Authentication establishes the identity context. The application then continuously feeds relevant activity and contextual information into the risk engine, receives a current risk decision, and enforces that decision before protected operations proceed.



The resulting architecture provides the technical foundation for evaluating how continuously changing session behavior can influence access decisions after initial authentication.



