# Authentication Flow

## 1. Overview

The research environment uses Keycloak as the identity provider and OpenID Connect (OIDC) as the authentication protocol.

The application uses the Authorization Code flow with Proof Key for Code Exchange (PKCE). After successful initial authentication, the application creates its own authenticated session and associates that session with a unique research session identifier used by the continuous risk engine.

Authentication therefore establishes the user's identity, while continuous risk evaluation determines whether an already-authenticated session should continue to be trusted.

The authentication architecture contains three related flows:

1. **Initial Authentication**
2. **Step-Up Authentication**
3. **Logout and Session Termination**

---

# 2. Initial Authentication Flow

The initial authentication flow begins when an unauthenticated user selects the login option.

```text
┌───────────────┐
│     START     │
└───────┬───────┘
        │
        ▼
┌──────────────────────┐
│ User requests /login │
└──────────┬───────────┘
           │
           ▼
┌────────────────────────────┐
│ Generate PKCE Code Verifier│
└────────────┬───────────────┘
             │
             ▼
┌────────────────────────────┐
│Generate PKCE Code Challenge│
└────────────┬───────────────┘
             │
             ▼
┌──────────────────────┐
│ Generate OIDC State  │
└──────────┬───────────┘
           │
           ▼
┌────────────────────────────┐
│ Store verifier and state   │
│ in application session     │
└────────────┬───────────────┘
             │
             ▼
┌───────────────────────────┐
│ Build OIDC Authorization  │
│ Request                   │
└────────────┬──────────────┘
             │
             ▼
┌──────────────────────┐
│ Redirect to Keycloak │
└──────────┬───────────┘
           │
           ▼
┌───────────────────────────┐
│ User authenticates at     │
│ Keycloak                  │
└────────────┬──────────────┘
             │
             ▼
       ┌─────────────┐
       │Auth success?│
       └──────┬──────┘
          NO  │  YES
        ┌─────┘    └─────┐
        ▼                ▼
┌────────────────┐  ┌──────────────────┐
│ Authentication │  │ Redirect to      │
│ error          │  │ /callback        │
└────────────────┘  └────────┬─────────┘
                              │
                              ▼
                    ┌─────────────────────┐
                    │ Validate OIDC       │
                    │ authorization code  │
                    │ + PKCE verifier     │
                    └─────────┬───────────┘
                              │
                              ▼
                       ┌─────────────┐
                       │ Valid?      │
                       └──────┬──────┘
                          NO  │  YES
                        ┌─────┘    └─────┐
                        ▼                ▼
                 ┌────────────┐  ┌──────────────────┐
                 │ Reject     │  │ Fetch user       │
                 │ callback   │  │ information      │
                 └────────────┘  └────────┬─────────┘
                                          │
                                          ▼
                              ┌──────────────────────┐
                              │ Create authenticated │
                              │ application session  │
                              └──────────┬───────────┘
                                         │
                                         ▼
                              ┌──────────────────────┐
                              │ Generate unique      │
                              │ research session ID  │
                              └──────────┬───────────┘
                                         │
                                         ▼
                              ┌──────────────────────┐
                              │ Record successful    │
                              │ login event          │
                              └──────────┬───────────┘
                                         │
                                         ▼
                              ┌──────────────────────┐
                              │ Redirect to          │
                              │ /dashboard           │
                              └──────────────────────┘
```

The application generates a PKCE verifier, derives the corresponding challenge, generates an OIDC state value, stores the required values in the session and redirects the user to Keycloak.

After the authorization response returns to `/callback`, the application processes the authorization-code exchange and retrieves the authenticated user's information.

Following successful authentication, the application stores the authenticated user, creates a unique research session ID, records the login event and redirects the user to the dashboard.

---

# 3. Authentication Components

## 3.1 User

The user interacts with the research application through a web browser.

The browser initiates authentication and later accesses protected application resources.

---

## 3.2 Application

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

---

## 3.3 Keycloak

Keycloak acts as the identity provider.

It is responsible for authenticating the user and returning the authorization result to the application.

The application initializes its OIDC configuration using the configured Keycloak issuer and client credentials.

---

# 4. OIDC Authorization Code + PKCE Flow

The application uses the Authorization Code flow with PKCE.

```text
User
 │
 │ 1. Login request
 ▼
Application
 │
 │ 2. Generate code verifier
 │ 3. Generate code challenge
 │ 4. Generate state
 │
 │ 5. Authorization request
 ▼
Keycloak
 │
 │ 6. Authenticate user
 │
 │ 7. Authorization response
 ▼
Application /callback
 │
 │ 8. Authorization code exchange
 │    + PKCE verifier
 │
 │ 9. Retrieve user information
 ▼
Authenticated Session
```

The authorization request contains:

* redirect URI
* `openid profile email` scopes
* state
* PKCE code challenge
* `S256` code-challenge method

These values are constructed by the `/login` route.

---

# 5. Application Session Creation

Successful identity authentication is followed by application-session creation.

```text
Keycloak Authentication
          │
          ▼
     OIDC Callback
          │
          ▼
 Retrieve User Information
          │
          ▼
 Store Authenticated User
          │
          ▼
 Generate Session ID
          │
          ▼
 Initialize Risk Context
          │
          ▼
    Authenticated Session
```

The research session ID is important because it provides the identifier used to associate activity with the corresponding risk-engine state.

The session therefore connects:

```text
User Identity
     +
Application Session
     +
Research Session ID
     +
Risk State
```

---

# 6. Authentication vs. Continuous Authentication

The system intentionally separates initial authentication from continuous session evaluation.

```text
                  INITIAL AUTHENTICATION
                           │
                           ▼
                 Identity Established
                           │
                           ▼
                 Authenticated Session
                           │
                           ▼
                Continuous Monitoring
                           │
                           ▼
                    Risk Evaluation
                           │
                           ▼
                  Current Risk Decision
```

Initial authentication answers:

> **Who is the user?**

Continuous authentication answers:

> **Should the current session continue to be trusted?**

The application therefore does not treat a successful login as permanent authorization for every later operation.

Protected operations can invoke the live risk engine before proceeding.

---

# 7. Protected-Resource Authentication Flow

An authenticated request to a protected resource follows this general sequence:

```text
┌──────────────────┐
│ Protected Request│
└────────┬─────────┘
         │
         ▼
┌─────────────────────────┐
│ Authentication Check    │
└──────────┬──────────────┘
           │
           ▼
      ┌────────────┐
      │ Authenticated?│
      └─────┬──────┘
        NO  │  YES
       ┌────┘    └───────┐
       ▼                 ▼
┌───────────────┐  ┌──────────────────┐
│ Redirect /    │  │ Collect activity │
│ Reject        │  │ and context      │
└───────────────┘  └────────┬─────────┘
                             │
                             ▼
                   ┌─────────────────────┐
                   │ Evaluate Live Risk  │
                   └──────────┬──────────┘
                              │
                              ▼
                      ┌────────────────┐
                      │ Risk Decision  │
                      └───────┬────────┘
                              │
              ┌───────────────┼───────────────┐
              │               │               │
              ▼               ▼               ▼
           ALLOW           STEP-UP         TERMINATE
              │               │               │
              ▼               ▼               ▼
        Resource         Additional       Destroy
         Proceeds       Authentication     Session
```

This is the central authentication-enforcement relationship in the project.

---

# 8. Step-Up Authentication Flow

Step-up authentication is used when an already-authenticated session reaches the HIGH risk range.

The original authenticated session is not immediately destroyed. Instead, the application requires additional authentication.

```text
┌──────────────────────┐
│ Authenticated Session│
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│ Protected Operation  │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│ Live Risk Evaluation │
└──────────┬───────────┘
           │
           ▼
      ┌───────────┐
      │ Risk HIGH?│
      └─────┬─────┘
        NO  │  YES
       ┌────┘    └───────┐
       ▼                 ▼
┌──────────────┐  ┌────────────────────┐
│ Operation    │  │ Store original     │
│ proceeds     │  │ requested path     │
└──────────────┘  └─────────┬──────────┘
                            │
                            ▼
                  ┌─────────────────────┐
                  │ Redirect to         │
                  │ Step-Up             │
                  └──────────┬──────────┘
                             │
                             ▼
                  ┌─────────────────────┐
                  │ Generate new PKCE   │
                  │ verifier/challenge  │
                  └──────────┬──────────┘
                             │
                             ▼
                  ┌─────────────────────┐
                  │ Redirect to         │
                  │ Keycloak            │
                  └──────────┬──────────┘
                             │
                             ▼
                     ┌───────────────┐
                     │ Authentication│
                     │ successful?   │
                     └───────┬───────┘
                        NO   │   YES
                       ┌─────┘     └─────┐
                       ▼                 ▼
              ┌────────────────┐  ┌─────────────────┐
              │ Apply failed   │  │ Verify returned │
              │ step-up        │  │ identity        │
              └───────┬────────┘  └────────┬────────┘
                      │                    │
                      ▼                    ▼
              ┌────────────────┐     ┌─────────────┐
              │ No risk        │     │ Identity    │
              │ reduction      │     │ matches?    │
              └───────┬────────┘     └──────┬──────┘
                      │                NO   │ YES
                      │               ┌────┘   └─────┐
                      │               ▼              ▼
                      │        ┌─────────────┐ ┌──────────────┐
                      │        │ Reject      │ │ Apply        │
                      │        │ step-up     │ │ successful   │
                      │        └─────────────┘ │ step-up      │
                      │                        └──────┬───────┘
                      │                               │
                      │                               ▼
                      │                        ┌──────────────┐
                      │                        │ Risk −15     │
                      │                        └──────┬───────┘
                      │                               │
                      │                               ▼
                      │                        ┌──────────────┐
                      │                        │ Return to    │
                      │                        │ original     │
                      │                        │ resource     │
                      │                        └──────────────┘
                      │
                      ▼
              ┌──────────────────┐
              │ Remain protected │
              │ / Try Again      │
              └──────────────────┘
```

When HIGH risk is detected, the application stores the original requested path, risk score, risk level and step-up state in the application session before redirecting the user to the step-up route.

---

# 9. Step-Up Authentication Initiation

The step-up flow uses a separate authentication transaction.

A new PKCE verifier and challenge are generated together with a new state value.

The application also requests a fresh authentication interaction rather than relying silently on the existing authentication context.

```text
HIGH Risk
   │
   ▼
Step-Up Required
   │
   ▼
Generate Step-Up PKCE
   │
   ▼
Generate Step-Up State
   │
   ▼
Store Step-Up State
   │
   ▼
Redirect to Keycloak
```

The purpose is to obtain additional authentication assurance while retaining the identity context of the existing application session.

---

# 10. Successful Step-Up Flow

A successful step-up does not create an unrelated application identity.

The application verifies that the identity returned from the additional authentication corresponds to the user associated with the existing session.

```text
Step-Up Authentication
        │
        ▼
OIDC Callback
        │
        ▼
Verify Returned Identity
        │
        ▼
   ┌──────────────┐
   │ Same User?   │
   └──────┬───────┘
      NO  │  YES
      │       │
      ▼       ▼
   Reject   Successful
            Step-Up
               │
               ▼
            Risk −15
               │
               ▼
        Clear Step-Up State
               │
               ▼
       Retrieve Original Path
               │
               ▼
      Redirect to Original
           Resource
```

The application verifies the identity returned during the step-up process against the identity associated with the current application session before applying the successful step-up result.

A successful step-up reduces the risk score by 15 points and allows the interrupted request flow to resume at its original resource.

---

# 11. Failed Step-Up Flow

A failed step-up does not reduce the accumulated risk.

```text
Step-Up Authentication
        │
        ▼
     Failure
        │
        ▼
Apply Failed Step-Up
        │
        ▼
No Risk Reduction
        │
        ▼
Record Failure
        │
        ▼
Remain Protected
        │
        ▼
     Try Again
```

When Keycloak returns an authentication error during a step-up transaction, the application calls the failed-step-up function and records the failure.

The failed authentication does not lower the risk score.

---

# 12. CRITICAL Risk Authentication Flow

CRITICAL risk represents the terminal state of the continuous authentication model.

```text
Authenticated Session
        │
        ▼
Continuous Risk Evaluation
        │
        ▼
   ┌───────────────┐
   │ Risk CRITICAL?│
   └───────┬───────┘
       NO  │  YES
      ┌────┘    └──────────┐
      ▼                    ▼
Continue              Log Critical
Monitoring            Termination
                            │
                            ▼
                     Destroy Risk State
                            │
                            ▼
                     Destroy Session
                            │
                            ▼
                    Deny Protected Request
                            │
                            ▼
                    Session Terminated
```

The enforcement layer treats a CRITICAL risk result as a session-termination condition. It logs the termination, destroys the risk-engine state, destroys the application session and denies the request.

The user is then presented with a session-termination response rather than being allowed to continue using the authenticated session.

---

# 13. Authentication Failure Handling

Authentication failures are handled separately from successful authentication.

The general principle is:

```text
Authentication Attempt
        │
        ▼
   ┌──────────────┐
   │ Successful?  │
   └──────┬───────┘
      NO  │  YES
      │       │
      ▼       ▼
Authentication  Create
Failure         Session
      │           │
      ▼           ▼
No Authenticated  Continuous
Session           Monitoring
```

For normal login, authentication must successfully complete before the application establishes the authenticated session.

For step-up authentication, failure is handled by the risk engine without granting the requested additional assurance.

---

# 14. Protected Document Authentication Flow

Document operations demonstrate how authentication is combined with continuous risk evaluation.

```text
Authenticated User
        │
        ▼
Request Document
        │
        ▼
Authentication Check
        │
        ▼
Document Exists?
        │
    NO  │  YES
    │       │
    ▼       ▼
  Reject  Identify
          Classification
              │
              ▼
       Generate Signals
              │
              ▼
       Evaluate Live Risk
              │
              ▼
       Enforce Decision
              │
       ┌──────┼─────────┐
       ▼      ▼         ▼
     ALLOW  STEP-UP  TERMINATE
       │      │         │
       ▼      ▼         ▼
   Document  Additional Session
   Action    Authentication Removal
```

Opening a document generates a document-view signal and can additionally generate classification-specific signals for confidential or restricted documents.

Individual document actions such as deletion also perform a live risk evaluation before the protected filesystem operation is executed.

---

# 15. Logout Flow

Logout terminates both the application session and its associated risk-engine state.

```text
┌───────────────┐
│ User selects  │
│ Logout        │
└───────┬───────┘
        │
        ▼
┌─────────────────────┐
│ Identify Session    │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ Destroy Risk State  │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ Record Logout Event │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ Destroy Application │
│ Session             │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ Keycloak Logout     │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│Return to Application│
└─────────────────────┘
```

The application explicitly destroys the risk state associated with the session before destroying the application session.

The application then constructs the Keycloak logout request and returns the user to the configured application location.

---

# 16. Complete Authentication Lifecycle

The complete lifecycle can be represented as:

```text
                         ┌─────────────┐
                         │    START    │
                         └──────┬──────┘
                                │
                                ▼
                       ┌─────────────────┐
                       │ User Requests   │
                       │ Login           │
                       └────────┬────────┘
                                │
                                ▼
                       ┌─────────────────┐
                       │ OIDC + PKCE     │
                       └────────┬────────┘
                                │
                                ▼
                       ┌─────────────────┐
                       │    Keycloak     │
                       │ Authentication  │
                       └────────┬────────┘
                                │
                                ▼
                         ┌──────────────┐
                         │ Successful?  │
                         └──────┬───────┘
                           NO   │   YES
                           │        │
                           ▼        ▼
                       Reject   Create Session
                                    │
                                    ▼
                              Generate Session ID
                                    │
                                    ▼
                           Authenticated Session
                                    │
                                    ▼
                         Continuous Monitoring
                                    │
                                    ▼
                              Risk Evaluation
                                    │
                                    ▼
                         ┌────────────────────┐
                         │ Current Risk Level │
                         └─────────┬──────────┘
                                   │
              ┌────────────────────┼────────────────────┐
              │                    │                    │
              ▼                    ▼                    ▼
             LOW                MEDIUM                HIGH
              │                    │                    │
              ▼                    ▼                    ▼
            ALLOW                ALLOW              STEP-UP
                                                       │
                                                       ▼
                                               ┌─────────────┐
                                               │ Successful? │
                                               └──────┬──────┘
                                                  NO  │ YES
                                                  │      │
                                                  ▼      ▼
                                             No Reduction
                                                         │
                                                         ▼
                                                      Risk −15
                                                         │
                                                         ▼
                                                Continue Monitoring

                                   Risk reaches CRITICAL
                                             │
                                             ▼
                                      TERMINATE SESSION
                                             │
                                             ▼
                                          LOGOUT /
                                      Session Destroyed
```

---

# 17. Authentication Security Boundaries

The architecture contains several security boundaries.

### Boundary 1 — Identity Provider

Keycloak establishes the user's identity through OIDC.

### Boundary 2 — Application Session

The application establishes its own authenticated session after successful OIDC authentication.

### Boundary 3 — Risk Evaluation

The application evaluates current session activity using the continuous risk engine.

### Boundary 4 — Enforcement

The application enforces the risk result before allowing protected operations.

### Boundary 5 — Session Termination

CRITICAL risk or explicit logout destroys the active session and its corresponding risk state.

---

# 18. Research Model

The authentication architecture supports the central research hypothesis of the project:

> **Successful initial authentication does not necessarily imply that an active session should remain trusted indefinitely.**

The system therefore implements:

```text
Initial Authentication
        │
        ▼
Identity Established
        │
        ▼
Authenticated Session
        │
        ▼
Continuous Activity
        │
        ▼
Risk Evaluation
        │
        ▼
Adaptive Response
   ┌────┼─────┐
   ▼    ▼     ▼
 ALLOW STEP-UP TERMINATE
```

This architecture allows the project to demonstrate how trust can change during an authenticated session as new activity and contextual information are observed.

The authentication system therefore serves as the identity foundation, while the continuous risk engine provides the adaptive trust mechanism.
