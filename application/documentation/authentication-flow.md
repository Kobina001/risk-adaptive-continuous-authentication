### Authentication Flow



#### 1\. Overview



The research environment uses Keycloak as the identity provider and OpenID Connect (OIDC) as the authentication protocol.



The application uses the Authorization Code flow with Proof Key for Code Exchange (PKCE). After successful initial authentication, the application creates its own authenticated session and associates that session with a unique research session identifier used by the continuous risk engine.



Authentication therefore establishes the user's identity, while continuous risk evaluation determines whether an already-authenticated session should continue to be trusted.



The authentication architecture contains three related flows:



**1. Initial Authentication**

**2. Step-Up Authentication**

**3. Logout and Session Termination**







#### 2\. Initial Authentication Flow



The initial authentication flow begins when an unauthenticated user selects the login option.





┌───────────────┐

│     START         │

└───────┬───────┘

&#x20;         │

&#x20;         ▼

┌──────────────────────┐

│ User requests /login        │

└──────────┬───────────┘

&#x20;             │

&#x20;             ▼

┌────────────────────────────┐

│ Generate PKCE Code Verifier        │

└────────────┬───────────────┘

&#x20;                │

&#x20;                ▼

┌────────────────────────────┐

│ Generate PKCE Code Challenge       │

└────────────┬───────────────┘

&#x20;                │

&#x20;                ▼

┌──────────────────────┐

│ Generate OIDC State        │

└──────────┬───────────┘

&#x20;             │

&#x20;             ▼

┌────────────────────────────┐

│ Store verifier and state           │

│ in application session             │

└────────────┬───────────────┘

&#x20;                │

&#x20;                ▼

┌───────────────────────────┐

│ Build OIDC Authorization          │

│ Request                           │

└────────────┬──────────────┘

&#x20;                │

&#x20;                ▼

┌──────────────────────┐

│ Redirect to Keycloak        │

└──────────┬───────────┘

&#x20;             │

&#x20;             ▼

┌───────────────────────────┐

│ User authenticates at             │

│ Keycloak                          │

└────────────┬──────────────┘

&#x20;                │

&#x20;                ▼

&#x20;      ┌─────────────┐

&#x20;      │ Auth success?│

&#x20;      └──────┬──────┘

&#x20;         NO    │  YES

&#x20;       ┌─────┘    └─────┐

&#x20;       ▼                   ▼

┌────────────────┐  ┌──────────────────┐

│ Authentication      │  │ Redirect to           │

│ error               │  │ /callback             │

└────────────────┘  └────────┬─────────┘

&#x20;                                    │

&#x20;                                    ▼

&#x20;                   ┌─────────────────────┐

&#x20;                   │ Validate OIDC             │

&#x20;                   │ authorization code        │

&#x20;                   │ + PKCE verifier           │

&#x20;                   └─────────┬───────────┘

&#x20;                                │

&#x20;                                ▼

&#x20;                      ┌─────────────┐

&#x20;                      │ Valid?      │

&#x20;                      └──────┬──────┘

&#x20;                         NO    │  YES

&#x20;                       ┌─────┘    └─────┐

&#x20;                       ▼                   ▼

&#x20;                ┌────────────┐  ┌──────────────────┐

&#x20;                │ Reject         │  │ Fetch user            │

&#x20;                │ callback       │  │ information           │

&#x20;                └────────────┘  └────────┬─────────┘

&#x20;                                                │

&#x20;                                                ▼

&#x20;                             ┌──────────────────────┐

&#x20;                             │ Create authenticated       │

&#x20;                             │ application session        │

&#x20;                             └──────────┬───────────┘

&#x20;                                           │

&#x20;                                           ▼

&#x20;                             ┌──────────────────────┐

&#x20;                             │ Generate unique            │

&#x20;                             │ research session ID        │

&#x20;                             └──────────┬───────────┘

&#x20;                                           │

&#x20;                                           ▼

&#x20;                             ┌──────────────────────┐

&#x20;                             │ Record successful          │

&#x20;                             │ login event                │

&#x20;                             └──────────┬───────────┘

&#x20;                                           │

&#x20;                                           ▼

&#x20;                             ┌──────────────────────┐

&#x20;                             │ Redirect to                │

&#x20;                             │ /dashboard                 │

&#x20;                             └──────────────────────┘





The application generates a PKCE verifier, derives the corresponding challenge, generates an OIDC state value, stores the required values in the session and redirects the user to Keycloak.



After the authorization response returns to "**/callback**", the application processes the authorization-code exchange and retrieves the authenticated user's information.



Following successful authentication, the application stores the authenticated user, creates a unique research session ID, records the login event and redirects the user to the dashboard.







#### 3\. Authentication Components



##### 3.1 User



The user interacts with the research application through a web browser.



The browser initiates authentication and later accesses protected application resources.







##### 3.2 Application



The Node.js / Express application acts as the relying-party application.



It:



* initiates authentication
* creates PKCE values
* maintains the application session
* receives the OIDC callback
* obtains user information
* creates the research session ID
* protects application resources
* invokes continuous risk evaluation







#### 3.3 Keycloak



Keycloak acts as the identity provider.



It is responsible for authenticating the user and returning the authorization result to the application.



The application initializes its OIDC configuration using the configured Keycloak issuer and client credentials.







#### 4\. OIDC Authorization Code + PKCE Flow



The application uses the Authorization Code flow with PKCE.





User

&#x20;│

&#x20;│ 1. Login request

&#x20;▼

Application

&#x20;│

&#x20;│ 2. Generate code verifier

&#x20;│ 3. Generate code challenge

&#x20;│ 4. Generate state

&#x20;│

&#x20;│ 5. Authorization request

&#x20;▼

Keycloak

&#x20;│

&#x20;│ 6. Authenticate user

&#x20;│

&#x20;│ 7. Authorization response

&#x20;▼

Application /callback

&#x20;│

&#x20;│ 8. Authorization code exchange

&#x20;│    + PKCE verifier

&#x20;│

&#x20;│ 9. Retrieve user information

&#x20;▼

Authenticated Session





The authorization request contains:



* redirect URI
* "**openid profile email**" scopes
* state
* PKCE code challenge
* "**S256**" code-challenge method



These values are constructed by the "**/login"** route.



\---



#### 5\. Application Session Creation



Successful identity authentication is followed by application-session creation.





Keycloak Authentication

&#x20;         │

&#x20;         ▼

&#x20;    OIDC Callback

&#x20;         │

&#x20;         ▼

&#x20;Retrieve User Information

&#x20;         │

&#x20;         ▼

&#x20;Store Authenticated User

&#x20;         │

&#x20;         ▼

&#x20;Generate Session ID

&#x20;         │

&#x20;         ▼

&#x20;Initialize Risk Context

&#x20;         │

&#x20;         ▼

&#x20;   Authenticated Session





The research session ID is important because it provides the identifier used to associate activity with the corresponding risk-engine state.



The session therefore connects:





User Identity

&#x20;    +

Application Session

&#x20;    +

Research Session ID

&#x20;    +

Risk State









#### 6\. Authentication vs. Continuous Authentication



The system intentionally separates initial authentication from continuous session evaluation.





&#x20;                 INITIAL AUTHENTICATION

&#x20;                          │

&#x20;                          ▼

&#x20;                Identity Established

&#x20;                          │

&#x20;                          ▼

&#x20;                Authenticated Session

&#x20;                          │

&#x20;                          ▼

&#x20;               Continuous Monitoring

&#x20;                          │

&#x20;                          ▼

&#x20;                   Risk Evaluation

&#x20;                          │

&#x20;                          ▼

&#x20;                 Current Risk Decision





Initial authentication answers:



> **Who is the user?**



Continuous authentication answers:



> **Should the current session continue to be trusted?**



The application therefore does not treat a successful login as permanent authorization for every later operation.



Protected operations can invoke the live risk engine before proceeding.







#### 7\. Protected-Resource Authentication Flow



An authenticated request to a protected resource follows this general sequence:





┌──────────────────┐

│ Protected Request     │

└────────┬─────────┘

&#x20;          │

&#x20;          ▼

┌─────────────────────────┐

│ Authentication Check           │

└──────────┬──────────────┘

&#x20;             │

&#x20;             ▼

&#x20;     ┌────────────┐

&#x20;     │ Authenticated?│

&#x20;     └─────┬──────┘

&#x20;       NO    │  YES

&#x20;      ┌────┘    └───────┐

&#x20;      ▼                    ▼

┌───────────────┐  ┌──────────────────┐

│ Redirect /        │  │ Collect activity       │

│ Reject            │  │ and context            │

└───────────────┘  └────────┬─────────┘

&#x20;                                   │

&#x20;                                   ▼

&#x20;                  ┌─────────────────────┐

&#x20;                  │ Evaluate Live Risk        │

&#x20;                  └──────────┬──────────┘

&#x20;                                │

&#x20;                                ▼

&#x20;                     ┌────────────────┐

&#x20;                     │ Risk Decision       │

&#x20;                     └───────┬────────┘

&#x20;                               │

&#x20;             ┌───────────────┼───────────────┐

&#x20;             │               │               │

&#x20;             ▼               ▼              ▼

&#x20;          ALLOW           STEP-UP         TERMINATE

&#x20;             │               │               │

&#x20;             ▼               ▼              ▼

&#x20;       Resource         Additional       Destroy

&#x20;        Proceeds       Authentication     Session





This is the central authentication-enforcement relationship in the project.







#### 8\. Step-Up Authentication Flow



Step-up authentication is used when an already-authenticated session reaches the HIGH risk range.



The original authenticated session is not immediately destroyed. Instead, the application requires additional authentication.





┌──────────────────────┐

│ Authenticated Session      │

└──────────┬───────────┘

&#x20;             │

&#x20;             ▼

┌──────────────────────┐

│ Protected Operation        │

└──────────┬───────────┘

&#x20;             │

&#x20;             ▼

┌──────────────────────┐

│ Live Risk Evaluation       │

└──────────┬───────────┘

&#x20;             │

&#x20;             ▼

&#x20;     ┌───────────┐

&#x20;     │ Risk HIGH?│

&#x20;     └─────┬─────┘

&#x20;       NO    │  YES

&#x20;      ┌────┘    └───────┐

&#x20;      ▼                    ▼

┌──────────────┐  ┌────────────────────┐

│ Operation        │  │    Store original        │

│ proceeds         │  │    requested path        │

└──────────────┘  └─────────┬──────────┘

&#x20;                                   │

&#x20;                                   ▼

&#x20;                 ┌─────────────────────┐

&#x20;                 │ Redirect to               │

&#x20;                 │ Step-Up                   │

&#x20;                 └──────────┬──────────┘

&#x20;                               │

&#x20;                               ▼

&#x20;                 ┌─────────────────────┐

&#x20;                 │ Generate new PKCE         │

&#x20;                 │ verifier/challenge        │

&#x20;                 └──────────┬──────────┘

&#x20;                               │

&#x20;                               ▼

&#x20;                 ┌─────────────────────┐

&#x20;                 │ Redirect to               │

&#x20;                 │ Keycloak                  │

&#x20;                 └──────────┬──────────┘

&#x20;                               │

&#x20;                               ▼

&#x20;                    ┌───────────────┐

&#x20;                    │ Authentication    │

&#x20;                    │ successful?       │

&#x20;                    └───────┬───────┘

&#x20;                       NO     │     YES

&#x20;                      ┌─────┘     └─────┐

&#x20;                      ▼                    ▼

&#x20;             ┌────────────────┐  ┌─────────────────┐

&#x20;             │ Apply failed        │  │ Verify returned      │

&#x20;             │ step-up             │  │ identity             │

&#x20;             └───────┬────────┘  └────────┬────────┘

&#x20;                       │                          │

&#x20;                       ▼                          ▼

&#x20;             ┌────────────────┐     ┌─────────────┐

&#x20;             │ No risk             │     │ Identity       │

&#x20;             │ reduction           │     │ matches?       │

&#x20;             └───────┬────────┘     └──────┬──────┘

&#x20;                     │                NO   │     YES

&#x20;                     │               ┌────┘   └─────┐

&#x20;                     │               ▼                 ▼

&#x20;                     │        ┌─────────────┐ ┌──────────────┐

&#x20;                     │        │ Reject          │ │ Apply            │

&#x20;                     │        │ step-up         │ │ successful       │

&#x20;                     │        └─────────────┘ │ step-up          │

&#x20;                     │                             └──────┬───────┘

&#x20;                     │                                      │

&#x20;                     │                                      ▼

&#x20;                     │                        ┌──────────────┐

&#x20;                     │                        │ Risk −15         │

&#x20;                     │                        └──────┬───────┘

&#x20;                     │                                 │

&#x20;                     │                                 ▼

&#x20;                     │                        ┌──────────────┐

&#x20;                     │                        │ Return to        │

&#x20;                     │                        │ original         │

&#x20;                     │                        │ resource         │

&#x20;                     │                        └──────────────┘

&#x20;                     │

&#x20;                     ▼

&#x20;             ┌──────────────────┐

&#x20;             │ Remain protected      │

&#x20;             │ / Try Again           │

&#x20;             └──────────────────┘



When HIGH risk is detected, the application stores the original requested path, risk score, risk level and step-up state in the application session before redirecting the user to the step-up route.







#### 9\. Step-Up Authentication Initiation



The step-up flow uses a separate authentication transaction.



A new PKCE verifier and challenge are generated, together with a new state value.



The application also requests a fresh authentication interaction rather than relying silently on the existing authentication context.





HIGH Risk

&#x20;  │

&#x20;  ▼

Step-Up Required

&#x20;  │

&#x20;  ▼

Generate Step-Up PKCE

&#x20;  │

&#x20;  ▼

Generate Step-Up State

&#x20;  │

&#x20;  ▼

Store Step-Up State

&#x20;  │

&#x20;  ▼

Redirect to Keycloak





The purpose is to obtain additional authentication assurance while retaining the identity context of the existing application session.







#### 10\. Successful Step-Up Flow



A successful step-up does not create an unrelated application identity.



The application verifies that the identity returned from the additional authentication corresponds to the user associated with the existing session.





Step-Up Authentication

&#x20;       │

&#x20;       ▼

OIDC Callback

&#x20;       │

&#x20;       ▼

Verify Returned Identity

&#x20;       │

&#x20;       ▼

&#x20;  ┌──────────────┐

&#x20;  │ Same User?       │

&#x20;  └──────┬───────┘

&#x20;     NO  │  YES

&#x20;     │       │

&#x20;     ▼       ▼

&#x20;  Reject   Successful

&#x20;           Step-Up

&#x20;              │

&#x20;              ▼

&#x20;           Risk −15

&#x20;              │

&#x20;              ▼

&#x20;       Clear Step-Up State

&#x20;              │

&#x20;              ▼

&#x20;      Retrieve Original Path

&#x20;              │

&#x20;              ▼

&#x20;     Redirect to Original

&#x20;          Resource





The application verifies the identity returned during the step-up process against the identity associated with the current application session before applying the successful step-up result.



A successful step-up reduces the risk score by 15 points and allows the interrupted request flow to resume at its original resource.







#### 11\. Failed Step-Up Flow



A failed step-up does not reduce the accumulated risk.





Step-Up Authentication

&#x20;       │

&#x20;       ▼

&#x20;    Failure

&#x20;       │

&#x20;       ▼

Apply Failed Step-Up

&#x20;       │

&#x20;       ▼

No Risk Reduction

&#x20;       │

&#x20;       ▼

Record Failure

&#x20;       │

&#x20;       ▼

Remain Protected

&#x20;       │

&#x20;       ▼

&#x20;    Try Again





When Keycloak returns an authentication error during a step-up transaction, the application calls the failed-step-up function and records the failure.



The failed authentication does not lower the risk score.







#### 12\. CRITICAL Risk Authentication Flow



CRITICAL risk represents the terminal state of the continuous authentication model.





Authenticated Session

&#x20;       │

&#x20;       ▼

Continuous Risk Evaluation

&#x20;       │

&#x20;       ▼

&#x20;  ┌───────────────┐

&#x20;  │ Risk CRITICAL?    │

&#x20;  └───────┬───────┘

&#x20;      NO    │  YES

&#x20;     ┌────┘    └──────────┐

&#x20;     ▼                        ▼

Continue              Log Critical

Monitoring            Termination

&#x20;                           │

&#x20;                           ▼

&#x20;                    Destroy Risk State

&#x20;                           │

&#x20;                           ▼

&#x20;                    Destroy Session

&#x20;                           │

&#x20;                           ▼

&#x20;                   Deny Protected Request

&#x20;                           │

&#x20;                           ▼

&#x20;                   Session Terminated





The enforcement layer treats a CRITICAL risk result as a session-termination condition. It logs the termination, destroys the risk-engine state, destroys the application session and denies the request.



The user is then presented with a session-termination response rather than being allowed to continue using the authenticated session.







#### 13\. Authentication Failure Handling



Authentication failures are handled separately from successful authentication.



The general principle is:





Authentication Attempt

&#x20;       │

&#x20;       ▼

&#x20;  ┌──────────────┐

&#x20;  │ Successful?      │

&#x20;  └──────┬───────┘

&#x20;     NO  │  YES

&#x20;     │       │

&#x20;     ▼       ▼

Authentication  Create

Failure         Session

&#x20;     │           │

&#x20;     ▼           ▼

No Authenticated  Continuous

Session           Monitoring

```



For normal login, authentication must successfully complete before the application establishes the authenticated session.



For step-up authentication, failure is handled by the risk engine without granting the requested additional assurance.







#### 14\. Protected Document Authentication Flow



Document operations demonstrate how authentication is combined with continuous risk evaluation.





Authenticated User

&#x20;       │

&#x20;       ▼

Request Document

&#x20;       │

&#x20;       ▼

Authentication Check

&#x20;       │

&#x20;       ▼

Document Exists?

&#x20;       │

&#x20;   NO  │  YES

&#x20;   │       │

&#x20;   ▼       ▼

&#x20; Reject  Identify

&#x20;         Classification

&#x20;             │

&#x20;             ▼

&#x20;      Generate Signals

&#x20;             │

&#x20;             ▼

&#x20;      Evaluate Live Risk

&#x20;             │

&#x20;             ▼

&#x20;      Enforce Decision

&#x20;             │

&#x20;      ┌──────┼─────────┐

&#x20;      ▼       ▼            ▼

&#x20;    ALLOW  STEP-UP  TERMINATE

&#x20;      │       │         │

&#x20;      ▼      ▼         ▼

&#x20;  Document  Additional  Session

&#x20;  Action  Authentication  Removal





Opening a document generates a document-view signal and can additionally generate classification-specific signals for confidential or restricted documents.



Individual document actions such as deletion also perform a live risk evaluation before the protected filesystem operation is executed.







#### 15\. Logout Flow



Logout terminates both the application session and its associated risk-engine state.





┌───────────────┐

│ User selects      │

│ Logout            │

└───────┬───────┘

&#x20;         │

&#x20;         ▼

┌─────────────────────┐

│ Identify Session          │

└──────────┬──────────┘

&#x20;             │

&#x20;             ▼

┌─────────────────────┐

│ Destroy Risk State        │

└──────────┬──────────┘

&#x20;             │

&#x20;             ▼

┌─────────────────────┐

│ Record Logout Event       │

└──────────┬──────────┘

&#x20;             │

&#x20;             ▼

┌─────────────────────┐

│ Destroy Application       │

│ Session                   │

└──────────┬──────────┘

&#x20;             │

&#x20;             ▼

┌─────────────────────┐

│ Keycloak Logout           │

└──────────┬──────────┘

&#x20;             │

&#x20;             ▼

┌─────────────────────┐

│ Return to Application     │

└─────────────────────┘

&#x09;



The application explicitly destroys the risk state associated with the session before destroying the application session.



The application then constructs the Keycloak logout request and returns the user to the configured application location.







#### 16\. Complete Authentication Lifecycle



The complete lifecycle can be represented as:





&#x20;                        ┌─────────────┐

&#x20;                        │    START        │

&#x20;                        └──────┬──────┘

&#x20;                               │

&#x20;                               ▼

&#x20;                      ┌─────────────────┐

&#x20;                      │ User Requests        │

&#x20;                      │ Login                │

&#x20;                      └────────┬────────┘

&#x20;                               │

&#x20;                               ▼

&#x20;                      ┌─────────────────┐

&#x20;                      │ OIDC + PKCE          │

&#x20;                      └────────┬────────┘

&#x20;                               │

&#x20;                               ▼

&#x20;                      ┌─────────────────┐

&#x20;                      │    Keycloak          │

&#x20;                      │ Authentication       │

&#x20;                      └────────┬────────┘

&#x20;                               │

&#x20;                               ▼

&#x20;                        ┌──────────────┐

&#x20;                        │ Successful?      │

&#x20;                        └──────┬───────┘

&#x20;                          NO   │   YES

&#x20;                          │        │

&#x20;                          ▼        ▼

&#x20;                      Reject   Create Session

&#x20;                                   │

&#x20;                                   ▼

&#x20;                             Generate Session ID

&#x20;                                   │

&#x20;                                   ▼

&#x20;                          Authenticated Session

&#x20;                                   │

&#x20;                                   ▼

&#x20;                        Continuous Monitoring

&#x20;                                   │

&#x20;                                   ▼

&#x20;                             Risk Evaluation

&#x20;                                   │

&#x20;                                   ▼

&#x20;                        ┌────────────────────┐

&#x20;                        │ Current Risk Level       │

&#x20;                        └─────────┬──────────┘

&#x20;                                  │

&#x20;             ┌────────────────────┼────────────────────┐

&#x20;             │                    │                    │           

&#x20;             ▼                    ▼                    ▼

&#x20;            LOW                MEDIUM                HIGH

&#x20;             │                    │                    │

&#x20;             ▼                   ▼                    ▼

&#x20;           ALLOW                ALLOW              STEP-UP

&#x20;                                                      │

&#x20;                                                      ▼

&#x20;                                              ┌─────────────┐

&#x20;                                              │ Successful?     │

&#x20;                                              └──────┬──────┘

&#x20;                                                 NO    │ YES

&#x20;                                                 │       │

&#x20;                                                 ▼       ▼

&#x20;                                            No Reduction

&#x20;                                                          │

&#x20;                                                          ▼

&#x20;                                                       Risk −15

&#x20;                                                          │

&#x20;                                                          ▼

&#x20;                                               Continue Monitoring

&#x20;                                                          │

&#x20;                                                          ▼

&#x20;                                  Risk reaches CRITICAL

&#x20;                                            │

&#x20;                                            ▼

&#x20;                                     TERMINATE SESSION

&#x20;                                            │

&#x20;                                            ▼

&#x20;                                         LOGOUT /

&#x20;                                     Session Destroyed









#### 17\. Authentication Security Boundaries



The architecture contains several security boundaries.



###### Boundary 1 — Identity Provider



Keycloak establishes the user's identity through OIDC.



###### Boundary 2 — Application Session



The application establishes its own authenticated session after successful OIDC authentication.



###### Boundary 3 — Risk Evaluation

###### 

The application evaluates current session activity using the continuous risk engine.



###### Boundary 4 — Enforcement



The application enforces the risk result before allowing protected operations.



###### Boundary 5 — Session Termination



CRITICAL risk or explicit logout destroys the active session and its corresponding risk state.







#### 18\. Research Model



The authentication architecture supports the central research hypothesis of the project:



> "**Successful initial authentication does not necessarily imply that an active session should remain trusted indefinitely.**"



The system therefore implements:





Initial Authentication

&#x20;       │

&#x20;       ▼

Identity Established

&#x20;       │

&#x20;       ▼

Authenticated Session

&#x20;       │

&#x20;       ▼

Continuous Activity

&#x20;       │

&#x20;       ▼

Risk Evaluation

&#x20;       │

&#x20;       ▼

Adaptive Response

&#x20;  ┌────┼─────┐

&#x20;  ▼    ▼     ▼

&#x20;ALLOW STEP-UP TERMINATE





This architecture allows the project to demonstrate how trust can change during an authenticated session as new activity and contextual information are observed.



The authentication system therefore serves as the identity foundation, while the continuous risk engine provides the adaptive trust mechanism.



