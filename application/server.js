import express from "express";
import session from "express-session";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import crypto from "crypto";

import {
  discovery,
  randomPKCECodeVerifier,
  randomState,
  calculatePKCECodeChallenge,
  buildAuthorizationUrl,
  authorizationCodeGrant,
  fetchUserInfo,
  allowInsecureRequests
} from "openid-client";

import {
  evaluateActivity,
  getCurrentRisk,
  getDetailedRiskState,
  applySuccessfulStepUp,
  applyFailedStepUp,
  destroyRiskState
} from "./riskengine.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;


// ==================================================
// DIRECTORIES
// ==================================================

const DOCUMENT_ROOT =
  path.join(process.cwd(), "corporate_documents");

const TRASH_ROOT =
  path.join(DOCUMENT_ROOT, "trash");

const SHARED_ROOT =
  path.join(DOCUMENT_ROOT, "shared");

const DOCUMENT_DIRECTORIES = [
  path.join(DOCUMENT_ROOT, "public"),
  path.join(DOCUMENT_ROOT, "internal"),
  path.join(DOCUMENT_ROOT, "confidential"),
  path.join(DOCUMENT_ROOT, "restricted"),
  TRASH_ROOT,
  SHARED_ROOT
];


// ==================================================
// LOG DIRECTORY
// ==================================================

const LOG_DIRECTORY =
  path.join(process.cwd(), "logs");

fs.mkdirSync(
  LOG_DIRECTORY,
  {
    recursive: true
  }
);


// ==================================================
// CREATE REQUIRED DIRECTORIES
// ==================================================

for (const directory of DOCUMENT_DIRECTORIES) {

  fs.mkdirSync(
    directory,
    {
      recursive: true
    }
  );

}


// ==================================================
// DOCUMENT DEFINITIONS
// ==================================================

const documents = {

  public: {

    name:
      "Employee Handbook",

    filename:
      "employee_handbook.txt",

    classification:
      "PUBLIC",

    sensitivity:
      "LOW",

    owner:
      "Human Resources",

    folder:
      "public",

    content:
`EMPLOYEE HANDBOOK

This document contains general company policies,
employee responsibilities, workplace guidelines,
and organizational information.

This document is classified as PUBLIC.
`

  },


  internal: {

    name:
      "Project Guidelines",

    filename:
      "project_guidelines.txt",

    classification:
      "INTERNAL",

    sensitivity:
      "MEDIUM",

    owner:
      "Project Management Office",

    folder:
      "internal",

    content:
`PROJECT GUIDELINES

This document contains internal project procedures,
project workflows, development practices,
and operational instructions.

This document is classified as INTERNAL.
`

  },


  confidential: {

    name:
      "Quarterly Financial Report",

    filename:
      "quarterly_financial_report.txt",

    classification:
      "CONFIDENTIAL",

    sensitivity:
      "HIGH",

    owner:
      "Finance Department",

    folder:
      "confidential",

    content:
`QUARTERLY FINANCIAL REPORT

This document contains confidential financial
information, revenue summaries, expenditure
information, and internal financial analysis.

This document is classified as CONFIDENTIAL.
`

  },


  restricted: {

    name:
      "Security Infrastructure Report",

    filename:
      "security_infrastructure_report.txt",

    classification:
      "RESTRICTED",

    sensitivity:
      "CRITICAL",

    owner:
      "Information Security Department",

    folder:
      "restricted",

    content:
`SECURITY INFRASTRUCTURE REPORT

This document contains highly sensitive information
relating to corporate security architecture,
infrastructure, defensive controls, and security
operations.

This document is classified as RESTRICTED.
`

  }

};


// ==================================================
// PROJECT DEFINITIONS
// ==================================================

const projects = {

  "iam-modernization": {

    id:
      "iam-modernization",

    name:
      "Identity Access Management Modernization",

    classification:
      "INTERNAL",

    department:
      "Information Security",

    status:
      "Active",

    owner:
      "Identity & Access Management Team",

    priority:
      "High",

    assignedUser:
      "jason",

    assignedUserDisplay:
      "Jason",

    description:
      "Modernization of identity and access management processes, authentication controls, and access governance across the organization.",

    objectives: [

      "Review existing identity and access management processes.",

      "Improve authentication and access-control practices.",

      "Strengthen access governance and account lifecycle management.",

      "Identify opportunities for improved identity security monitoring."

    ]

  },


  "continuous-authentication": {

    id:
      "continuous-authentication",

    name:
      "Continuous Authentication Research",

    classification:
      "RESTRICTED",

    department:
      "Cybersecurity Research",

    status:
      "Active",

    owner:
      "Security Research Team",

    priority:
      "Critical",

    assignedUser:
      "michael",

    assignedUserDisplay:
      "Michael",

    description:
      "Research project investigating continuous authentication using behavioral and contextual signals during authenticated sessions.",

    objectives: [

      "Collect behavioral and contextual telemetry during authenticated sessions.",

      "Examine changes in user behavior after initial authentication.",

      "Evaluate contextual signals that may indicate changes in session risk.",

      "Study how continuous monitoring can complement traditional authentication."

    ]

  },


  "security-infrastructure-review": {

    id:
      "security-infrastructure-review",

    name:
      "Corporate Security Infrastructure Review",

    classification:
      "CONFIDENTIAL",

    department:
      "Information Security",

    status:
      "Planning",

    owner:
      "Corporate Security Team",

    priority:
      "Medium",

    assignedUser:
      "alice",

    assignedUserDisplay:
      "Alice",

    description:
      "Review of corporate security infrastructure, defensive controls, and operational security processes.",

    objectives: [

      "Review existing security infrastructure.",

      "Identify security-control gaps.",

      "Evaluate defensive technologies and operational procedures.",

      "Prepare recommendations for future security improvements."

    ]

  }

};


// ==================================================
// EMPLOYEE DIRECTORY
// ==================================================

const employees = {

  jason: {

    username:
      "jason",

    name:
      "Jason Mensah",

    title:
      "Identity & Access Management Analyst",

    department:
      "Information Security",

    email:
      "jason.mensah@corporatesecurity.local",

    employeeId:
      "EMP-1001",

    status:
      "Active",

    office:
      "Accra Office",

    manager:
      "Security Operations Manager",

    accessLevel:
      "Standard",

    joined:
      "2025",

    responsibilities: [

      "Identity lifecycle management",

      "Access control administration",

      "Authentication monitoring",

      "IAM security operations"

    ]

  },


  alice: {

    username:
      "alice",

    name:
      "Alice Addo",

    title:
      "Security Engineer",

    department:
      "Information Security",

    email:
      "alice.addo@corporatesecurity.local",

    employeeId:
      "EMP-1002",

    status:
      "Active",

    office:
      "Accra Office",

    manager:
      "Information Security Manager",

    accessLevel:
      "Standard",

    joined:
      "2024",

    responsibilities: [

      "Security infrastructure management",

      "Security control assessment",

      "Infrastructure security reviews",

      "Defensive security operations"

    ]

  },


  michael: {

    username:
      "michael",

    name:
      "Michael Owusu",

    title:
      "Cybersecurity Researcher",

    department:
      "Cybersecurity Research",

    email:
      "michael.owusu@corporatesecurity.local",

    employeeId:
      "EMP-1003",

    status:
      "Active",

    office:
      "Research Office",

    manager:
      "Security Research Lead",

    accessLevel:
      "Research",

    joined:
      "2025",

    responsibilities: [

      "Security research",

      "Continuous authentication research",

      "Behavioral telemetry analysis",

      "Authentication security experiments"

    ]

  },


  sarah: {

    username:
      "sarah",

    name:
      "Sarah Asante",

    title:
      "Human Resources Specialist",

    department:
      "Human Resources",

    email:
      "sarah.asante@corporatesecurity.local",

    employeeId:
      "EMP-1004",

    status:
      "Active",

    office:
      "Accra Office",

    manager:
      "Human Resources Manager",

    accessLevel:
      "Standard",

    joined:
      "2023",

    responsibilities: [

      "Employee records management",

      "HR administration",

      "Employee onboarding",

      "Workplace policy administration"

    ]

  },


  david: {

    username:
      "david",

    name:
      "David Boateng",

    title:
      "Systems Administrator",

    department:
      "IT Operations",

    email:
      "david.boateng@corporatesecurity.local",

    employeeId:
      "EMP-1005",

    status:
      "Active",

    office:
      "IT Operations Center",

    manager:
      "IT Operations Manager",

    accessLevel:
      "Elevated",

    joined:
      "2022",

    responsibilities: [

      "Systems administration",

      "Infrastructure maintenance",

      "Server management",

      "Operational support"

    ]

  },


  emma: {

    username:
      "emma",

    name:
      "Emma Mensima",

    title:
      "Project Manager",

    department:
      "Project Management Office",

    email:
      "emma.mensima@corporatesecurity.local",

    employeeId:
      "EMP-1006",

    status:
      "Active",

    office:
      "Accra Office",

    manager:
      "PMO Director",

    accessLevel:
      "Standard",

    joined:
      "2024",

    responsibilities: [

      "Project coordination",

      "Project planning",

      "Project documentation",

      "Stakeholder coordination"

    ]

  }

};


// ==================================================
// CREATE DOCUMENT FILES IF THEY DO NOT EXIST
// ==================================================

for (
  const key of Object.keys(documents)
) {

  const document =
    documents[key];

  const documentPath =
    path.join(
      DOCUMENT_ROOT,
      document.folder,
      document.filename
    );

  if (!fs.existsSync(documentPath)) {

    fs.writeFileSync(
      documentPath,
      document.content,
      "utf8"
    );

  }

}


// ==================================================
// MIDDLEWARE
// ==================================================

app.use(
  express.json()
);

app.use(
  express.urlencoded({
    extended: true
  })
);

app.use(
  express.static("public")
);


// ==================================================
// APPLICATION SESSION
// ==================================================

app.use(
  session({

    secret:
      "research-development-secret",

    resave:
      false,

    saveUninitialized:
      false,

    cookie: {

      httpOnly:
        true,

      secure:
        false

    }

  })
);


// ==================================================
// OPENID CONNECT CONFIGURATION
// ==================================================

const issuerUrl =
  new URL(
    process.env.KEYCLOAK_ISSUER
  );

let oidcConfig;


// ==================================================
// ACTIVITY LOGGER
// ==================================================

function logActivity(
  req,
  event,
  details = {}
) {

  const username =
    req.session?.user?.preferred_username ||
    "anonymous";


  const sessionId =
    req.session?.sessionId ||
    "unknown";


  const forwardedFor =
    req.headers["x-forwarded-for"];

  const ipAddress =
    forwardedFor
      ? forwardedFor.split(",")[0].trim()
      : req.socket.remoteAddress ||
        "unknown";


  const userAgent =
    req.headers["user-agent"] ||
    "unknown";


  let os =
    "Unknown";


  if (
    /Windows NT/i.test(userAgent)
  ) {

    os =
      "Windows";

  } else if (
    /Android/i.test(userAgent)
  ) {

    os =
      "Android";

  } else if (
    /iPhone|iPad|iPod/i.test(userAgent)
  ) {

    os =
      "iOS";

  } else if (
    /Mac OS X/i.test(userAgent)
  ) {

    os =
      "macOS";

  } else if (
    /Linux/i.test(userAgent)
  ) {

    os =
      "Linux";

  }


  let browser =
    "Unknown";


  if (
    /Edg/i.test(userAgent)
  ) {

    browser =
      "Microsoft Edge";

  } else if (
    /Chrome/i.test(userAgent)
  ) {

    browser =
      "Google Chrome";

  } else if (
    /Firefox/i.test(userAgent)
  ) {

    browser =
      "Mozilla Firefox";

  } else if (
    /Safari/i.test(userAgent)
  ) {

    browser =
      "Safari";

  }


  let device =
    "Desktop";


  if (
    /Tablet|iPad/i.test(userAgent)
  ) {

    device =
      "Tablet";

  } else if (
    /Mobile/i.test(userAgent)
  ) {

    device =
      "Mobile";

  }


  const timestamp =
    new Date();


  const accessHour =
    timestamp.getHours();


  const location =
    req.session?.clientContext?.location ||
    null;


  const allowed =
    details.allowed !== undefined
      ? details.allowed
      : true;


  const cleanDetails = {
    ...details
  };

  delete cleanDetails.allowed;


  const logEntry = {

    timestamp:
      timestamp.toISOString(),

    sessionId,

    username,

    event,

    action:
      cleanDetails.action ||
      event,

    resource:
      cleanDetails.resource ||
      cleanDetails.document ||
      null,

    os,

    browser,

    device,

    ipAddress,

    accessHour,

    allowed,

    location,

    details:
      cleanDetails

  };


  fs.appendFileSync(

    path.join(
      LOG_DIRECTORY,
      "activity.log"
    ),

    JSON.stringify(
      logEntry
    ) + "\n"

  );

}


// ==================================================
// HTML ESCAPE HELPER
// ==================================================

function escapeHtml(value) {

  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

}


// ==================================================
// AUTHENTICATION HELPER
// ==================================================

function requireAuthentication(
  req,
  res,
  next
) {

  if (!req.session.user) {

    return res.redirect("/");

  }

  next();

}


// ==================================================
// USERNAME HELPER
// ==================================================

function getUsername(req) {

  return (

    req.session?.user?.preferred_username ||

    req.session?.user?.name ||

    "Authenticated User"

  );

}


// ==================================================
// NORMALIZED USERNAME HELPER
// ==================================================

function getNormalizedUsername(req) {

  return getUsername(req)
    .trim()
    .toLowerCase();

}


// ==================================================
// LIVE RISK ENGINE ENFORCEMENT
// ==================================================

function evaluateLiveRisk(
  req,
  {
    signals = [],
    metadata = {},
    qualifiesAsNormal = false
  } = {}
) {

  const sessionId =
    req.session?.sessionId;

  const username =
    getNormalizedUsername(req);


  if (!sessionId) {

    return {

      score:
        0,

      riskLevel:
        "LOW",

      decision:
        "ALLOW",

      stepUpRequired:
        false,

      enforcement: {

        allow:
          true,

        requireStepUp:
          false,

        terminateSession:
          false

      }

    };

  }


  const riskResult = evaluateActivity(

  sessionId,

  username,

  signals,

  {

    metadata,

    qualifiesAsNormal,

    applyDecay:
      true,

    evaluateCorrelation:
      true

  }

);


// ==================================================
// RISK ENGINE TERMINAL MONITOR
// ==================================================

console.log("");
console.log("============================================================");
console.log("              CONTINUOUS RISK ENGINE");
console.log("============================================================");

console.log(
  `USER              : ${username}`
);

console.log(
  `SESSION           : ${sessionId}`
);

console.log(
  `SIGNALS           : ${
    signals.length > 0
      ? signals.join(", ")
      : "NONE"
  }`
);

console.log(
  `QUALIFIES NORMAL  : ${
    qualifiesAsNormal
      ? "YES"
      : "NO"
  }`
);

console.log(
  `RISK SCORE        : ${riskResult.score}`
);

console.log(
  `RISK LEVEL        : ${riskResult.riskLevel}`
);

console.log(
  `DECISION          : ${riskResult.decision}`
);

console.log(
  `STEP-UP REQUIRED  : ${
    riskResult.stepUpRequired
      ? "YES"
      : "NO"
  }`
);


// --------------------------------------------------
// SIGNAL DETAILS
// --------------------------------------------------

if (
  riskResult.signals &&
  riskResult.signals.length > 0
) {

  console.log("");
  console.log("SIGNAL DETAILS:");

  for (
    const result
    of riskResult.signals
  ) {

    console.log(
      `  ${result.signal.signal} : +${result.signal.score}`
    );

    console.log(
      `    Score: ${result.signal.previousScore} -> ${result.signal.resultingScore}`
    );

  }

}


// --------------------------------------------------
// CORRELATIONS
// --------------------------------------------------

if (
  riskResult.correlations &&
  riskResult.correlations.length > 0
) {

  console.log("");
  console.log("CORRELATIONS:");

  for (
    const correlation
    of riskResult.correlations
  ) {

    console.log(
      `  ${correlation.correlation} : +${correlation.bonus}`
    );

    console.log(
      `    Score: ${correlation.previousScore} -> ${correlation.resultingScore}`
    );

  }

}


// --------------------------------------------------
// ENFORCEMENT
// --------------------------------------------------

console.log("");
console.log("ENFORCEMENT:");

if (
  riskResult.enforcement.allow
) {

  console.log(
    "  >>> ALLOW: Protected operation may proceed."
  );

}

else if (
  riskResult.enforcement.requireStepUp
) {

  console.log(
    "  >>> STEP-UP: Protected operation requires additional authentication."
  );

}

else if (
  riskResult.enforcement.terminateSession
) {

  console.log(
    "  >>> TERMINATE: Session must be terminated."
  );

}

console.log("============================================================");
console.log("");
console.log("");


// ==================================================
// RETURN RESULT TO SERVER
// ==================================================

return riskResult;
}


// ==================================================
// ENFORCE LIVE RISK DECISION
// ==================================================

function enforceLiveRisk(
  req,
  res,
  riskResult,
  originalPath
) {

  // -----------------------------------------------
  // CRITICAL
  // -----------------------------------------------

  if (
    riskResult.enforcement &&
    riskResult.enforcement.terminateSession
  ) {

    const sessionId =
      req.session?.sessionId;


    logActivity(

      req,

      "RISK_CRITICAL_SESSION_TERMINATION",

      {

        resource:
          "risk_engine",

        action:
          "TERMINATE_SESSION",

        risk_score:
          riskResult.score,

        risk_level:
          riskResult.riskLevel,

        decision:
          riskResult.decision,

        allowed:
          false

      }

    );


    if (sessionId) {

      destroyRiskState(
        sessionId
      );

    }


    return req.session.destroy(
      () => {

        return res.status(403).send(`

          <!DOCTYPE html>

          <html>

          <head>

            <meta charset="UTF-8">

            <title>
              Session Terminated
            </title>

            <link
              rel="stylesheet"
              href="/styles.css"
            >

          </head>

          <body>

            <main class="dashboard">

              <section class="welcome">

                <div>

                  <div class="badge">
                    SECURITY CONTROL
                  </div>

                  <h2>
                    Session Terminated
                  </h2>

                  <p>
                    Your session has been terminated
                    because the continuous risk engine
                    determined that the session reached
                    a critical risk level.
                  </p>

                  <p>
                    Risk Score:
                    <strong>
                      ${riskResult.score}
                    </strong>
                  </p>

                  <p>
                    Risk Level:
                    <strong>
                      ${riskResult.riskLevel}
                    </strong>
                  </p>

                  <br>

                  <a
                    href="/"
                    class="primary-button"
                  >
                    Return to Login
                  </a>

                </div>

              </section>

            </main>

          </body>

          </html>

        `);

      }

    );

  }


  // -----------------------------------------------
  // HIGH
  // -----------------------------------------------

  if (
    riskResult.enforcement &&
    riskResult.enforcement.requireStepUp
  ) {

    req.session.riskStepUp = {

      required:
        true,

      originalPath,

      triggeredAt:
        Date.now(),

      score:
        riskResult.score,

      riskLevel:
        riskResult.riskLevel

    };


    logActivity(

      req,

      "RISK_STEP_UP_TRIGGERED",

      {

        resource:
          "risk_engine",

        action:
          "STEP_UP",

        risk_score:
          riskResult.score,

        risk_level:
          riskResult.riskLevel,

        decision:
          riskResult.decision,

        original_path:
          originalPath,

        allowed:
          false

      }

    );


    return res.redirect(
      "/risk/step-up"
    );

  }


  // -----------------------------------------------
  // LOW / MEDIUM
  // -----------------------------------------------

  return true;

}


// ==================================================
// DOCUMENT PATH HELPER
// ==================================================

function getDocumentPath(
  classification
) {

  const document =
    documents[classification];

  if (!document) {

    return null;

  }

  return path.join(

    DOCUMENT_ROOT,

    document.folder,

    document.filename

  );

}


// ==================================================
// INITIALIZE OIDC
// ==================================================

async function initializeOIDC() {

  oidcConfig =
    await discovery(

      issuerUrl,

      process.env.KEYCLOAK_CLIENT_ID,

      process.env.KEYCLOAK_CLIENT_SECRET,

      undefined,

      {

        execute: [
          allowInsecureRequests
        ]

      }

    );

  console.log(
    "OIDC configuration loaded."
  );

}


// ==================================================
// HOME
// ==================================================

app.get(
  "/",
  (req, res) => {

    if (req.session.user) {

      return res.redirect(
        "/dashboard"
      );

    }

    res.sendFile(

      path.join(
        process.cwd(),
        "views",
        "home.html"
      )

    );

  }
);


// ==================================================
// LOGIN
// ==================================================

app.get(
  "/login",
  async (req, res) => {

    try {

      const codeVerifier =
        randomPKCECodeVerifier();

      const codeChallenge =
        await calculatePKCECodeChallenge(
          codeVerifier
        );

      const state =
        randomState();


      req.session.codeVerifier =
        codeVerifier;

      req.session.state =
        state;


      const redirectUri =
        new URL(
          process.env.KEYCLOAK_REDIRECT_URI
        );


      const authorizationUrl =
        buildAuthorizationUrl(

          oidcConfig,

          {

            redirect_uri:
              redirectUri,

            scope:
              "openid profile email",

            state,

            code_challenge:
              codeChallenge,

            code_challenge_method:
              "S256"

          }

        );


      res.redirect(
        authorizationUrl
      );


    } catch (error) {

      console.error(
        "Login error:",
        error
      );


      res.status(500).send(`

        <h1>Login Error</h1>

        <p>
          Unable to start authentication.
        </p>

        <a href="/">
          Return Home
        </a>

      `);

    }

  }
);


// ==================================================
// OIDC CALLBACK
// ==================================================

app.get(
  "/callback",
  async (req, res) => {

    const isStepUp =
      Boolean(
        req.session.stepUpState
      );


    try {

      // ---------------------------------------------
      // STEP-UP AUTHENTICATION FAILURE FROM KEYCLOAK
      // ---------------------------------------------

      if (
        isStepUp &&
        req.query.error
      ) {

        const sessionId =
          req.session?.sessionId;


        const username =
          getNormalizedUsername(req);


        if (sessionId) {

          applyFailedStepUp(

            sessionId,

            username,

            {

              error:
                req.query.error,

              errorDescription:
                req.query.error_description ||
                null

            }

          );

        }


        logActivity(

          req,

          "STEP_UP_FAILURE",

          {

            resource:
              "risk_engine",

            action:
              "STEP_UP_FAILURE",

            error:
              req.query.error,

            error_description:
              req.query.error_description ||
              null,

            allowed:
              false

          }

        );


        delete req.session.stepUpState;

        delete req.session.stepUpCodeVerifier;


        return res.status(401).send(`

          <!DOCTYPE html>

          <html>

          <head>

            <meta charset="UTF-8">

            <title>
              Authentication Failed
            </title>

            <link
              rel="stylesheet"
              href="/styles.css"
            >

          </head>

          <body>

            <main class="dashboard">

              <section class="welcome">

                <div>

                  <div class="badge">
                    STEP-UP FAILED
                  </div>

                  <h2>
                    Additional Authentication Failed
                  </h2>

                  <p>
                    Authentication was not completed
                    successfully.
                  </p>

                  <p>
                    Your current session remains protected
                    and the risk score has not been reduced.
                  </p>

                  <br>

                  <a
                    href="/risk/step-up"
                    class="primary-button"
                  >
                    Try Again
                  </a>

                </div>

              </section>

            </main>

          </body>

          </html>

        `);

      }


      const currentUrl =
        new URL(

          `${req.protocol}://${req.get("host")}${req.originalUrl}`

        );


      const tokens =
        await authorizationCodeGrant(

          oidcConfig,

          currentUrl,

          {

            pkceCodeVerifier:

              isStepUp

                ? req.session.stepUpCodeVerifier

                : req.session.codeVerifier,

            expectedState:

              isStepUp

                ? req.session.stepUpState

                : req.session.state

          }

        );


      const userInfo =
        await fetchUserInfo(

          oidcConfig,

          tokens.access_token,

          tokens.claims().sub

        );


      // =================================================
      // STEP-UP SUCCESS
      // =================================================

      if (isStepUp) {

        const sessionId =
          req.session.sessionId;


        const currentUsername =
          getNormalizedUsername(req);


        const authenticatedUsername =
          String(
            userInfo.preferred_username ||
            ""
          )
          .trim()
          .toLowerCase();


        // ---------------------------------------------
        // ENSURE STEP-UP IDENTITY MATCHES SESSION
        // ---------------------------------------------

        if (
          currentUsername !==
          authenticatedUsername
        ) {

          logActivity(

            req,

            "STEP_UP_IDENTITY_MISMATCH",

            {

              session_user:
                currentUsername,

              authenticated_user:
                authenticatedUsername,

              resource:
                "risk_engine",

              action:
                "STEP_UP",

              allowed:
                false

            }

          );


          delete req.session.stepUpState;

          delete req.session.stepUpCodeVerifier;


          return res.status(403).send(`

            <h1>
              Authentication Identity Mismatch
            </h1>

            <p>
              The authenticated identity does not
              match the current session identity.
            </p>

            <a href="/risk/step-up">
              Return to Step-Up
            </a>

          `);

        }


        const stepUpResult =
          applySuccessfulStepUp(

            sessionId,

            currentUsername,

            {

              authentication_method:
                "OIDC_STEP_UP",

              identity_provider:
                "Keycloak"

            }

          );


        logActivity(

          req,

          "STEP_UP_SUCCESS",

          {

            resource:
              "risk_engine",

            action:
              "STEP_UP_SUCCESS",

            risk_score:
              stepUpResult.score,

            risk_level:
              stepUpResult.riskLevel,

            reduction:
              15,

            allowed:
              true

          }

        );


        const originalPath =
          req.session.riskStepUp
            ?.originalPath ||
          "/dashboard";


        delete req.session.stepUpState;

        delete req.session.stepUpCodeVerifier;

        delete req.session.riskStepUp;


        return res.redirect(
          originalPath
        );

      }


      // =================================================
      // NORMAL INITIAL LOGIN
      // =================================================

      req.session.user =
        userInfo;


      req.session.sessionId =
        crypto.randomUUID();


      req.session.idToken =
        tokens.id_token;


      req.session.clientContext =
        {};


      logActivity(

        req,

        "LOGIN_SUCCESS",

        {

          authentication_method:
            "OIDC",

          identity_provider:
            "Keycloak",

          action:
            "LOGIN",

          allowed:
            true

        }

      );


      delete req.session.codeVerifier;

      delete req.session.state;


      console.log(

        `User authenticated: ${
          userInfo.preferred_username
        }`

      );


      console.log(

        `Research Session ID: ${
          req.session.sessionId
        }`

      );


      res.redirect(
        "/dashboard"
      );


    } catch (error) {

      console.error(
        "Authentication error:",
        error
      );


      // ---------------------------------------------
      // STEP-UP FAILURE
      // ---------------------------------------------

      if (
        req.session?.stepUpState
      ) {

        const sessionId =
          req.session.sessionId;


        const username =
          getNormalizedUsername(req);


        if (sessionId) {

          applyFailedStepUp(

            sessionId,

            username,

            {

              error:
                error.message

            }

          );

        }


        logActivity(

          req,

          "STEP_UP_FAILURE",

          {

            resource:
              "risk_engine",

            action:
              "STEP_UP_FAILURE",

            error:
              error.message,

            allowed:
              false

          }

        );


        delete req.session.stepUpState;

        delete req.session.stepUpCodeVerifier;


        return res.status(401).send(`

          <h1>
            Authentication Failed
          </h1>

          <p>
            Additional authentication was unsuccessful.
          </p>

          <p>
            Your risk score has not been reduced.
          </p>

          <a href="/risk/step-up">
            Try Again
          </a>

        `);

      }


      res.status(500).send(`

        <h1>
          Authentication Failed
        </h1>

        <p>
          Something went wrong during authentication.
        </p>

        <a href="/">
          Return Home
        </a>

      `);

    }

  }
);


// ==================================================
// CLIENT CONTEXT / LOCATION
// ==================================================

app.post(
  "/telemetry/context",
  requireAuthentication,
  (req, res) => {

    const location =
      req.body?.location;


    if (

      location &&

      typeof location.latitude ===
        "number" &&

      typeof location.longitude ===
        "number"

    ) {

      req.session.clientContext = {

        location: {

          latitude:
            location.latitude,

          longitude:
            location.longitude

        }

      };


      logActivity(

        req,

        "CLIENT_CONTEXT_UPDATE",

        {

          resource:
            "session_context",

          action:
            "LOCATION_UPDATE",

          allowed:
            true

        }

      );

    }


    res.json({

      success:
        true

    });

  }
);


// ==================================================
// DASHBOARD
// ==================================================

app.get(
  "/dashboard",
  requireAuthentication,
  (req, res) => {

    logActivity(

      req,

      "DASHBOARD_ACCESS",

      {

        resource:
          "dashboard",

        action:
          "ACCESS",

        allowed:
          true

      }

    );


    const username =
      getUsername(req);


    let dashboard =
      fs.readFileSync(

        path.join(
          process.cwd(),
          "views",
          "dashboard.html"
        ),

        "utf8"

      );


    dashboard =
      dashboard.replace(

        /{{USERNAME}}/g,

        escapeHtml(username)

      );


    res.send(
      dashboard
    );

  }
);


// ==================================================
// CORPORATE SECURITY WORKSPACE
// ==================================================

app.get(
  "/workspace",
  requireAuthentication,
  (req, res) => {

    logActivity(

      req,

      "WORKSPACE_ACCESS",

      {

        workspace:
          "corporate_security",

        resource:
          "corporate_security_workspace",

        action:
          "ACCESS",

        allowed:
          true

      }

    );


    const username =
      getUsername(req);


    let workspace =
      fs.readFileSync(

        path.join(
          process.cwd(),
          "public",
          "workspace.html"
        ),

        "utf8"

      );


    workspace =
      workspace.replace(

        /{{USERNAME}}/g,

        escapeHtml(username)

      );


    res.send(
      workspace
    );

  }
);


// ==================================================
// PROJECT WORKSPACE
// ==================================================

app.get(
  "/projects",
  requireAuthentication,
  (req, res) => {

    logActivity(

      req,

      "PROJECT_WORKSPACE_ACCESS",

      {

        resource:
          "project_workspace",

        action:
          "ACCESS",

        allowed:
          true

      }

    );


    const username =
      getUsername(req);


    let projectPage =
      fs.readFileSync(

        path.join(
          process.cwd(),
          "public",
          "projects.html"
        ),

        "utf8"

      );


    projectPage =
      projectPage.replace(

        /{{USERNAME}}/g,

        escapeHtml(username)

      );


    res.send(
      projectPage
    );

  }
);


// ==================================================
// EMPLOYEE DIRECTORY
// ==================================================

app.get(
  "/employees",
  requireAuthentication,
  (req, res) => {

    const username =
      getUsername(req);

    const normalizedUsername =
      getNormalizedUsername(req);


    logActivity(

      req,

      "EMPLOYEE_DIRECTORY_ACCESS",

      {

        resource:
          "employee_directory",

        action:
          "VIEW_DIRECTORY",

        employee_count:
          Object.keys(employees).length,

        accessing_user:
          username,

        allowed:
          true

      }

    );


    const employeeCards =
      Object.values(employees)
        .map(employee => {

          const isCurrentUser =
            normalizedUsername ===
            employee.username.toLowerCase();


          return `

            <a
              href="/employees/${encodeURIComponent(employee.username)}"
              class="resource-card employee-card"
            >

              <div>

                <span class="resource-type">
                  ${escapeHtml(employee.department)}
                </span>

                <h4>
                  ${escapeHtml(employee.name)}
                </h4>

                <p>
                  ${escapeHtml(employee.title)}
                </p>

                <small>
                  ${isCurrentUser
                    ? "Authenticated user"
                    : "Corporate employee"}
                </small>

              </div>

              <span class="arrow">
                →
              </span>

            </a>

          `;

        })
        .join("");


    res.send(`

      <!DOCTYPE html>

      <html lang="en">

      <head>

        <meta charset="UTF-8">

        <meta
          name="viewport"
          content="width=device-width, initial-scale=1.0"
        >

        <title>
          Employee Directory
        </title>

        <link
          rel="stylesheet"
          href="/styles.css"
        >

      </head>


      <body>


      <header class="topbar">

        <div class="brand">

          <span class="brand-icon">
            CS
          </span>

          <div>

            <h1>
              Corporate Security Workspace
            </h1>

            <span>
              Continuous Authentication Research Environment
            </span>

          </div>

        </div>


        <a
          href="/logout"
          class="logout-button"
        >
          Logout
        </a>

      </header>


      <main class="dashboard">


        <div class="page-navigation">

          <a
            href="/workspace"
            class="back-button"
          >
            ← Back to Workspace
          </a>

        </div>


        <section class="welcome">

          <div>

            <div class="badge">
              CORPORATE DIRECTORY
            </div>

            <h2>
              Employee Directory
            </h2>

            <p>
              View corporate employee information,
              organizational roles, and workplace
              responsibilities.
            </p>

          </div>

        </section>


        <section class="status-grid">


          <div class="status-card">

            <span class="status-label">
              DIRECTORY
            </span>

            <strong>
              Active
            </strong>

            <small>
              Corporate employee directory available
            </small>

          </div>


          <div class="status-card">

            <span class="status-label">
              EMPLOYEES
            </span>

            <strong>
              ${Object.keys(employees).length}
            </strong>

            <small>
              Employee profiles registered
            </small>

          </div>


          <div class="status-card">

            <span class="status-label">
              SESSION USER
            </span>

            <strong>
              ${escapeHtml(username)}
            </strong>

            <small>
              Authenticated directory user
            </small>

          </div>


        </section>


        <section class="resources">

          <div class="section-heading">

            <div>

              <span class="section-label">
                CORPORATE EMPLOYEES
              </span>

              <h3>
                Employee Profiles
              </h3>

            </div>

          </div>


          <div class="resource-list">

            ${employeeCards}

          </div>

        </section>


        <section class="research-note">

          <div class="note-icon">
            i
          </div>

          <div>

            <h4>
              Directory Access Monitoring
            </h4>

            <p>
              Employee directory access is recorded
              as part of the authenticated session
              telemetry. Viewing another employee's
              profile is recorded separately so that
              directory browsing behavior can be
              examined as a contextual signal.
            </p>

          </div>

        </section>


      </main>


      <footer>

        <p>
          Continuous Behavioral Risk Evaluation Research Project
        </p>

      </footer>


      </body>

      </html>

    `);

  }
);


// ==================================================
// EMPLOYEE PROFILE
// ==================================================

app.get(
  "/employees/:username",
  requireAuthentication,
  (req, res) => {

    const employeeUsername =
      String(
        req.params.username || ""
      )
      .trim()
      .toLowerCase();


    const employee =
      employees[employeeUsername];


    // ----------------------------------------------
    // EMPLOYEE NOT FOUND
    // ----------------------------------------------

    if (!employee) {

      logActivity(

        req,

        "EMPLOYEE_NOT_FOUND",

        {

          target_username:
            employeeUsername,

          resource:
            "employee_directory",

          action:
            "VIEW_EMPLOYEE",

          allowed:
            false

        }

      );


      return res.status(404).send(`

        <!DOCTYPE html>

        <html lang="en">

        <head>

          <meta charset="UTF-8">

          <meta
            name="viewport"
            content="width=device-width, initial-scale=1.0"
          >

          <title>
            Employee Not Found
          </title>

          <link
            rel="stylesheet"
            href="/styles.css"
          >

        </head>

        <body>

        <header class="topbar">

          <div class="brand">

            <span class="brand-icon">
              CS
            </span>

            <div>

              <h1>
                Employee Directory
              </h1>

              <span>
                Corporate Security Research Environment
              </span>

            </div>

          </div>

          <a
            href="/logout"
            class="logout-button"
          >
            Logout
          </a>

        </header>


        <main class="dashboard">

          <div class="page-navigation">

            <a
              href="/employees"
              class="back-button"
            >
              ← Back to Employee Directory
            </a>

          </div>


          <section class="welcome">

            <div>

              <div class="badge">
                EMPLOYEE NOT FOUND
              </div>

              <h2>
                Employee Unavailable
              </h2>

              <p>
                The requested employee profile could
                not be found in the corporate directory.
              </p>

            </div>

          </section>

        </main>

        </body>

        </html>

      `);

    }


    const accessingUser =
      getUsername(req);


    const normalizedAccessingUser =
      getNormalizedUsername(req);


    const isSelf =
      normalizedAccessingUser ===
      employee.username.toLowerCase();


    // ==================================================
    // LIVE RISK EVALUATION
    // ==================================================

    const employeeRiskSignals = [];


    if (!isSelf) {

      employeeRiskSignals.push(
        "CROSS_USER_EMPLOYEE_PROFILE"
      );

    }


    const employeeRisk =
      evaluateLiveRisk(

        req,

        {

          signals:
            employeeRiskSignals,

          metadata: {

            target_username:
              employee.username,

            target_department:
              employee.department,

            self_access:
              isSelf,

            cross_user_access:
              !isSelf

          },

          qualifiesAsNormal:
            isSelf

        }

      );


    if (
      enforceLiveRisk(

        req,

        res,

        employeeRisk,

        req.originalUrl

      ) !== true
    ) {

      return;

    }


    // ----------------------------------------------
    // EMPLOYEE PROFILE TELEMETRY
    // ----------------------------------------------

    logActivity(

      req,

      "EMPLOYEE_PROFILE_VIEW",

      {

        target_username:
          employee.username,

        target_employee:
          employee.name,

        target_employee_id:
          employee.employeeId,

        target_department:
          employee.department,

        target_title:
          employee.title,

        accessing_user:
          accessingUser,

        self_access:
          isSelf,

        cross_user_access:
          !isSelf,

        resource:
          `employee_profile:${employee.username}`,

        action:
          "VIEW_EMPLOYEE_PROFILE",

        allowed:
          true

      }

    );


    const responsibilitiesHtml =
      employee.responsibilities
        .map(
          responsibility => `

            <li>
              ${escapeHtml(responsibility)}
            </li>

          `
        )
        .join("");


    const accessContext =
      isSelf
        ? "AUTHENTICATED USER"
        : "OTHER EMPLOYEE";


    const accessContextClass =
      isSelf
        ? "success-text"
        : "neutral-text";


    const accessDescription =
      isSelf
        ? "The authenticated user is viewing their own directory profile."
        : "The authenticated user is viewing another employee's profile. Access is recorded as a behavioral signal.";


    res.send(`

      <!DOCTYPE html>

      <html lang="en">

      <head>

        <meta charset="UTF-8">

        <meta
          name="viewport"
          content="width=device-width, initial-scale=1.0"
        >

        <title>
          ${escapeHtml(employee.name)}
        </title>

        <link
          rel="stylesheet"
          href="/styles.css"
        >

      </head>


      <body>


      <header class="topbar">

        <div class="brand">

          <span class="brand-icon">
            CS
          </span>

          <div>

            <h1>
              Corporate Security Workspace
            </h1>

            <span>
              Continuous Authentication Research Environment
            </span>

          </div>

        </div>


        <a
          href="/logout"
          class="logout-button"
        >
          Logout
        </a>

      </header>


      <main class="dashboard">


        <div class="page-navigation">

          <a
            href="/employees"
            class="back-button"
          >
            ← Back to Employee Directory
          </a>

        </div>


        <section class="welcome">

          <div>

            <div class="badge">
              ${escapeHtml(employee.department).toUpperCase()}
            </div>

            <h2>
              ${escapeHtml(employee.name)}
            </h2>

            <p>
              ${escapeHtml(employee.title)}
              within the
              ${escapeHtml(employee.department)}
              department.
            </p>

          </div>

        </section>


        <section class="status-grid">


          <div class="status-card">

            <span class="status-label">
              EMPLOYEE STATUS
            </span>

            <strong class="success-text">
              ${escapeHtml(employee.status)}
            </strong>

            <small>
              Current employment status
            </small>

          </div>


          <div class="status-card">

            <span class="status-label">
              ACCESS CONTEXT
            </span>

            <strong class="${accessContextClass}">
              ${accessContext}
            </strong>

            <small>
              ${escapeHtml(accessDescription)}
            </small>

          </div>


          <div class="status-card">

            <span class="status-label">
              ACCESS LEVEL
            </span>

            <strong>
              ${escapeHtml(employee.accessLevel)}
            </strong>

            <small>
              Directory-recorded access classification
            </small>

          </div>


        </section>


        <section class="resources">

          <div class="section-heading">

            <div>

              <span class="section-label">
                EMPLOYEE INFORMATION
              </span>

              <h3>
                Profile Details
              </h3>

            </div>

          </div>


          <div class="project-details-panel">


            <div class="project-detail-row">

              <span>
                Full Name
              </span>

              <strong>
                ${escapeHtml(employee.name)}
              </strong>

            </div>


            <div class="project-detail-row">

              <span>
                Username
              </span>

              <strong>
                ${escapeHtml(employee.username)}
              </strong>

            </div>


            <div class="project-detail-row">

              <span>
                Employee ID
              </span>

              <strong>
                ${escapeHtml(employee.employeeId)}
              </strong>

            </div>


            <div class="project-detail-row">

              <span>
                Job Title
              </span>

              <strong>
                ${escapeHtml(employee.title)}
              </strong>

            </div>


            <div class="project-detail-row">

              <span>
                Department
              </span>

              <strong>
                ${escapeHtml(employee.department)}
              </strong>

            </div>


            <div class="project-detail-row">

              <span>
                Email
              </span>

              <strong>
                ${escapeHtml(employee.email)}
              </strong>

            </div>


            <div class="project-detail-row">

              <span>
                Office
              </span>

              <strong>
                ${escapeHtml(employee.office)}
              </strong>

            </div>


            <div class="project-detail-row">

              <span>
                Manager
              </span>

              <strong>
                ${escapeHtml(employee.manager)}
              </strong>

            </div>


            <div class="project-detail-row">

              <span>
                Joined
              </span>

              <strong>
                ${escapeHtml(employee.joined)}
              </strong>

            </div>


            <div class="project-detail-row">

              <span>
                Current User
              </span>

              <strong>
                ${escapeHtml(accessingUser)}
              </strong>

            </div>


          </div>

        </section>


        <section class="resources">

          <div class="section-heading">

            <div>

              <span class="section-label">
                ROLE INFORMATION
              </span>

              <h3>
                Responsibilities
              </h3>

            </div>

          </div>


          <div class="project-objectives">

            <ul>

              ${responsibilitiesHtml}

            </ul>

          </div>

        </section>


        <section class="research-note">

          <div class="note-icon">
            i
          </div>

          <div>

            <h4>
              Continuous Authentication Research
            </h4>

            <p>
              Employee profile access is recorded
              within the authenticated session telemetry.
              Viewing another employee's profile is
              intentionally not blocked at this stage.
              Instead, cross-user directory access is
              recorded as a contextual behavioral signal
              that can later be incorporated into the
              continuous authentication research model.
            </p>

          </div>

        </section>


      </main>


      <footer>

        <p>
          Continuous Behavioral Risk Evaluation Research Project
        </p>

      </footer>


      </body>

      </html>

    `);

  }
);


// ==================================================
// PROJECT DETAILS
// ==================================================

app.get(
  "/projects/:projectId",
  requireAuthentication,
  (req, res) => {

    const projectId =
      req.params.projectId;


    const project =
      projects[projectId];


    if (!project) {

      logActivity(

        req,

        "PROJECT_NOT_FOUND",

        {

          project_id:
            projectId,

          resource:
            "project_workspace",

          action:
            "VIEW_PROJECT",

          allowed:
            false

        }

      );


      return res.status(404).send(`

        <!DOCTYPE html>

        <html lang="en">

        <head>

          <meta charset="UTF-8">

          <meta
            name="viewport"
            content="width=device-width, initial-scale=1.0"
          >

          <title>
            Project Not Found
          </title>

          <link
            rel="stylesheet"
            href="/styles.css"
          >

        </head>

        <body>

          <header class="topbar">

            <div class="brand">

              <span class="brand-icon">
                CS
              </span>

              <div>

                <h1>
                  Project Workspace
                </h1>

                <span>
                  Corporate Security Research Environment
                </span>

              </div>

            </div>

            <a
              href="/logout"
              class="logout-button"
            >
              Logout
            </a>

          </header>


          <main class="dashboard">

            <div class="page-navigation">

              <a
                href="/projects"
                class="back-button"
              >
                ← Back to Project Workspace
              </a>

            </div>


            <section class="welcome">

              <div>

                <div class="badge">
                  PROJECT NOT FOUND
                </div>

                <h2>
                  Project Unavailable
                </h2>

                <p>
                  The requested project could not be found
                  in the corporate project workspace.
                </p>

              </div>

            </section>

          </main>

        </body>

        </html>

      `);

    }


    const username =
      getUsername(req);


    const normalizedUsername =
      getNormalizedUsername(req);


    const assignedUser =
      project.assignedUser
        .toLowerCase();


    const isAssignedUser =
      normalizedUsername ===
      assignedUser;


    // ==================================================
    // LIVE PROJECT RISK EVALUATION
    // ==================================================

    const projectRiskSignals = [];


    if (!isAssignedUser) {

      projectRiskSignals.push(
        "UNASSIGNED_PROJECT_ACCESS"
      );

    }


    const projectRisk =
      evaluateLiveRisk(

        req,

        {

          signals:
            projectRiskSignals,

          metadata: {

            project_id:
              project.id,

            project:
              project.name,

            assigned_user:
              project.assignedUser,

            accessing_user:
              username,

            assignment_match:
              isAssignedUser

          },

          qualifiesAsNormal:
            isAssignedUser

        }

      );


    if (
      enforceLiveRisk(

        req,

        res,

        projectRisk,

        req.originalUrl

      ) !== true
    ) {

      return;

    }


    logActivity(

      req,

      "PROJECT_VIEW",

      {

        project_id:
          project.id,

        project:
          project.name,

        classification:
          project.classification,

        department:
          project.department,

        status:
          project.status,

        assigned_user:
          project.assignedUser,

        assigned_user_display:
          project.assignedUserDisplay,

        accessing_user:
          username,

        assignment_match:
          isAssignedUser,

        resource:
          project.name,

        action:
          "VIEW",

        allowed:
          true

      }

    );


    if (!isAssignedUser) {

      logActivity(

        req,

        "PROJECT_ASSIGNMENT_MISMATCH",

        {

          project_id:
            project.id,

          project:
            project.name,

          assigned_user:
            project.assignedUser,

          accessing_user:
            username,

          assignment_match:
            false,

          resource:
            project.name,

          action:
            "ACCESS_ASSIGNED_PROJECT",

          allowed:
            true

        }

      );

    }


    const objectivesHtml =
      project.objectives
        .map(
          objective => `
            <li>
              ${escapeHtml(objective)}
            </li>
          `
        )
        .join("");


    const assignmentStatus =
      isAssignedUser
        ? "ASSIGNED USER"
        : "ASSIGNMENT MISMATCH";


    const assignmentClass =
      isAssignedUser
        ? "success-text"
        : "neutral-text";


    const assignmentDescription =
      isAssignedUser
        ? "Project is assigned to the authenticated user."
        : "Project is assigned to another user. Access recorded as a behavioral signal.";


    res.send(`

      <!DOCTYPE html>

      <html lang="en">

      <head>

        <meta charset="UTF-8">

        <meta
          name="viewport"
          content="width=device-width, initial-scale=1.0"
        >

        <title>
          ${escapeHtml(project.name)}
        </title>

        <link
          rel="stylesheet"
          href="/styles.css"
        >

      </head>


      <body>


      <header class="topbar">

        <div class="brand">

          <span class="brand-icon">
            CS
          </span>

          <div>

            <h1>
              Project Workspace
            </h1>

            <span>
              Corporate Security Research Environment
            </span>

          </div>

        </div>


        <a
          href="/logout"
          class="logout-button"
        >
          Logout
        </a>

      </header>


      <main class="dashboard">


        <div class="page-navigation">

          <a
            href="/projects"
            class="back-button"
          >
            ← Back to Project Workspace
          </a>

        </div>


        <section class="welcome">

          <div>

            <div class="badge">
              ${escapeHtml(project.classification)} PROJECT
            </div>

            <h2>
              ${escapeHtml(project.name)}
            </h2>

            <p>
              ${escapeHtml(project.description)}
            </p>

          </div>

        </section>


        <section class="status-grid">


          <div class="status-card">

            <span class="status-label">
              STATUS
            </span>

            <strong class="success-text">
              ${escapeHtml(project.status)}
            </strong>

            <small>
              Current project state
            </small>

          </div>


          <div class="status-card">

            <span class="status-label">
              DEPARTMENT
            </span>

            <strong>
              ${escapeHtml(project.department)}
            </strong>

            <small>
              Responsible department
            </small>

          </div>


          <div class="status-card">

            <span class="status-label">
              ACCESS CONTEXT
            </span>

            <strong class="${assignmentClass}">
              ${assignmentStatus}
            </strong>

            <small>
              ${escapeHtml(assignmentDescription)}
            </small>

          </div>


        </section>


        <section class="resources">

          <div class="section-heading">

            <div>

              <span class="section-label">
                PROJECT INFORMATION
              </span>

              <h3>
                Project Details
              </h3>

            </div>

          </div>


          <div class="project-details-panel">


            <div class="project-detail-row">

              <span>
                Project Owner
              </span>

              <strong>
                ${escapeHtml(project.owner)}
              </strong>

            </div>


            <div class="project-detail-row">

              <span>
                Classification
              </span>

              <strong>
                ${escapeHtml(project.classification)}
              </strong>

            </div>


            <div class="project-detail-row">

              <span>
                Department
              </span>

              <strong>
                ${escapeHtml(project.department)}
              </strong>

            </div>


            <div class="project-detail-row">

              <span>
                Assigned User
              </span>

              <strong>
                ${escapeHtml(project.assignedUserDisplay)}
              </strong>

            </div>


            <div class="project-detail-row">

              <span>
                Current User
              </span>

              <strong>
                ${escapeHtml(username)}
              </strong>

            </div>


            <div class="project-detail-row">

              <span>
                Assignment Match
              </span>

              <strong class="${assignmentClass}">
                ${isAssignedUser ? "YES" : "NO"}
              </strong>

            </div>


          </div>

        </section>


        <section class="resources">

          <div class="section-heading">

            <div>

              <span class="section-label">
                PROJECT OBJECTIVES
              </span>

              <h3>
                Current Objectives
              </h3>

            </div>

          </div>


          <div class="project-objectives">

            <ul>

              ${objectivesHtml}

            </ul>

          </div>

        </section>


        <section class="research-note">

          <div class="note-icon">
            i
          </div>

          <div>

            <h4>
              Continuous Authentication Research
            </h4>

            <p>
              Project access is recorded as part of the
              authenticated session telemetry. Access to
              projects assigned to another user is recorded
              separately as an assignment mismatch and may
              later contribute to behavioral risk evaluation.
            </p>

          </div>

        </section>


      </main>


      <footer>

        <p>
          Continuous Behavioral Risk Evaluation Research Project
        </p>

      </footer>


      </body>

      </html>

    `);

  }
);


// ==================================================
// CORPORATE DOCUMENT PAGE
// ==================================================

app.get(
  "/document/:classification",
  requireAuthentication,
  (req, res) => {

    const classification =
      req.params.classification
        .toLowerCase();


    const document =
      documents[classification];


    if (!document) {

      return res.status(404).send(`

        <h1>
          Document Not Found
        </h1>

        <p>
          The requested document does not exist.
        </p>

        <a href="/workspace">
          Return to Workspace
        </a>

      `);

    }


    const documentPath =
      getDocumentPath(
        classification
      );


    if (

      !documentPath ||

      !fs.existsSync(documentPath)

    ) {

      return res.status(404).send(`

        <h1>
          Document Unavailable
        </h1>

        <p>
          The document is no longer available
          in the active workspace.
        </p>

        <a href="/workspace">
          Return to Workspace
        </a>

      `);

    }


    req.session.currentDocument =
      classification;


    // ==================================================
    // LIVE DOCUMENT RISK EVALUATION
    // ==================================================

    const documentSignals = [

      "DOCUMENT_VIEW"

    ];


    if (
      classification ===
      "confidential"
    ) {

      documentSignals.push(
        "CONFIDENTIAL_DOCUMENT"
      );

    }


    if (
      classification ===
      "restricted"
    ) {

      documentSignals.push(
        "RESTRICTED_DOCUMENT"
      );

    }


    const isNormalDocumentActivity =
      classification === "public" ||
      classification === "internal";


    const documentRisk =
      evaluateLiveRisk(

        req,

        {

          signals:
            documentSignals,

          metadata: {

            document:
              document.name,

            classification:
              document.classification,

            sensitivity:
              document.sensitivity,

            action:
              "VIEW"

          },

          qualifiesAsNormal:
            isNormalDocumentActivity

        }

      );


    if (
      enforceLiveRisk(

        req,

        res,

        documentRisk,

        req.originalUrl

      ) !== true
    ) {

      return;

    }


    logActivity(

      req,

      "DOCUMENT_VIEW",

      {

        document:
          document.name,

        filename:
          document.filename,

        classification:
          document.classification,

        sensitivity:
          document.sensitivity,

        owner:
          document.owner,

        resource:
          document.name,

        action:
          "VIEW",

        allowed:
          true

      }

    );


    let documentPage =
      fs.readFileSync(

        path.join(
          process.cwd(),
          "public",
          "document.html"
        ),

        "utf8"

      );


    const navigation =
      `
        <div class="page-navigation">

          <a
            href="/workspace"
            class="back-button"
          >
            ← Back to Workspace
          </a>

        </div>
      `;


    const replacements = {

      "{{USERNAME}}":
        escapeHtml(getUsername(req)),

      "{{DOCUMENT_NAME}}":
        escapeHtml(document.name),

      "{{CLASSIFICATION}}":
        escapeHtml(document.classification),

      "{{DOCUMENT_CLASSIFICATION}}":
        classification,

      "{{SENSITIVITY}}":
        escapeHtml(document.sensitivity),

      "{{OWNER}}":
        escapeHtml(document.owner),

      "{{DOCUMENT_CONTENT}}":
        escapeHtml(document.content),

      "{{DOCUMENT_NAVIGATION}}":
        navigation

    };


    for (

      const [placeholder, value]

      of Object.entries(
        replacements
      )

    ) {

      documentPage =
        documentPage.replace(

          new RegExp(
            placeholder,
            "g"
          ),

          value

        );

    }


    res.send(
      documentPage
    );

  }
);


// ==================================================
// VIEW ACTUAL DOCUMENT FILE
// ==================================================

app.get(
  "/document/:classification/view",
  requireAuthentication,
  (req, res) => {

    const classification =
      req.params.classification
        .toLowerCase();


    const document =
      documents[classification];


    if (!document) {

      return res.status(404).send(
        "Document not found."
      );

    }


    const documentPath =
      getDocumentPath(
        classification
      );


    if (

      !documentPath ||

      !fs.existsSync(documentPath)

    ) {

      return res.status(404).send(
        "Document is no longer available."
      );

    }


    logActivity(

      req,

      "DOCUMENT_VIEW_FILE",

      {

        document:
          document.name,

        filename:
          document.filename,

        classification:
          document.classification,

        sensitivity:
          document.sensitivity,

        resource:
          document.name,

        action:
          "VIEW_FILE",

        allowed:
          true

      }

    );


    res.type(
      "text/plain"
    );


    res.sendFile(
      documentPath
    );

  }
);


// ==================================================
// DOWNLOAD ACTUAL DOCUMENT
// ==================================================

app.get(
  "/document/:classification/download",
  requireAuthentication,
  (req, res) => {

    const classification =
      req.params.classification
        .toLowerCase();


    const document =
      documents[classification];


    if (!document) {

      return res.status(404).send(
        "Document not found."
      );

    }


    const documentPath =
      getDocumentPath(
        classification
      );


    if (

      !documentPath ||

      !fs.existsSync(documentPath)

    ) {

      return res.status(404).send(
        "Document is no longer available."
      );

    }


    // ==================================================
    // LIVE DOCUMENT DOWNLOAD RISK
    // ==================================================

    const downloadSignals = [

      "DOCUMENT_DOWNLOAD"

    ];


    if (
      classification ===
      "confidential"
    ) {

      downloadSignals.push(
        "CONFIDENTIAL_DOCUMENT"
      );

    }


    if (
      classification ===
      "restricted"
    ) {

      downloadSignals.push(
        "RESTRICTED_DOCUMENT"
      );

    }


    const downloadRisk =
      evaluateLiveRisk(

        req,

        {

          signals:
            downloadSignals,

          metadata: {

            document:
              document.name,

            classification:
              document.classification,

            sensitivity:
              document.sensitivity,

            action:
              "DOWNLOAD"

          },

          qualifiesAsNormal:
            false

        }

      );


    if (
      enforceLiveRisk(

        req,

        res,

        downloadRisk,

        req.originalUrl

      ) !== true
    ) {

      return;

    }


    logActivity(

      req,

      "DOCUMENT_DOWNLOAD",

      {

        document:
          document.name,

        filename:
          document.filename,

        classification:
          document.classification,

        sensitivity:
          document.sensitivity,

        resource:
          document.name,

        action:
          "DOWNLOAD",

        allowed:
          true

      }

    );


    res.download(

      documentPath,

      document.filename

    );

  }
);


// ==================================================
// COPY ACTUAL DOCUMENT
// ==================================================

app.get(
  "/document/:classification/copy",
  requireAuthentication,
  (req, res) => {

    const classification =
      req.params.classification
        .toLowerCase();


    const document =
      documents[classification];


    if (!document) {

      return res.status(404).send(
        "Document not found."
      );

    }


    const sourcePath =
      getDocumentPath(
        classification
      );


    if (

      !sourcePath ||

      !fs.existsSync(sourcePath)

    ) {

      return res.status(404).send(
        "Document is no longer available."
      );

    }


    // ==================================================
    // LIVE DOCUMENT COPY RISK
    // ==================================================

    const copySignals = [

      "DOCUMENT_COPY"

    ];


    if (
      classification ===
      "confidential"
    ) {

      copySignals.push(
        "CONFIDENTIAL_DOCUMENT"
      );

    }


    if (
      classification ===
      "restricted"
    ) {

      copySignals.push(
        "RESTRICTED_DOCUMENT"
      );

    }


    const copyRisk =
      evaluateLiveRisk(

        req,

        {

          signals:
            copySignals,

          metadata: {

            document:
              document.name,

            classification:
              document.classification,

            sensitivity:
              document.sensitivity,

            action:
              "COPY"

          },

          qualifiesAsNormal:
            false

        }

      );


    if (
      enforceLiveRisk(

        req,

        res,

        copyRisk,

        req.originalUrl

      ) !== true
    ) {

      return;

    }


    const username =
      getUsername(req)
        .replace(
          /[^a-zA-Z0-9_-]/g,
          "_"
        );


    const copyFilename =
      `${path.parse(document.filename).name}_copy_${Date.now()}${path.extname(document.filename)}`;


    const destinationPath =
      path.join(

        SHARED_ROOT,

        `${username}_${copyFilename}`

      );


    fs.copyFileSync(

      sourcePath,

      destinationPath

    );


    logActivity(

      req,

      "DOCUMENT_COPY",

      {

        document:
          document.name,

        source:
          document.filename,

        destination:
          path.basename(
            destinationPath
          ),

        classification:
          document.classification,

        sensitivity:
          document.sensitivity,

        resource:
          document.name,

        action:
          "COPY",

        allowed:
          true

      }

    );


    res.send(`

      <h1>
        Document Copied
      </h1>

      <p>
        A physical copy of
        <strong>${escapeHtml(document.name)}</strong>
        has been created.
      </p>

      <p>
        Copy:
        ${escapeHtml(path.basename(destinationPath))}
      </p>

      <p>
        The copy was stored in the corporate
        shared workspace.
      </p>

      <a href="/document/${classification}">
        Return to Document
      </a>

    `);

  }
);


// ==================================================
// SHARE DOCUMENT FORM
// ==================================================

app.get(
  "/document/:classification/share",
  requireAuthentication,
  (req, res) => {

    const classification =
      req.params.classification
        .toLowerCase();


    const document =
      documents[classification];


    if (!document) {

      return res.status(404).send(
        "Document not found."
      );

    }


    const documentPath =
      getDocumentPath(
        classification
      );


    if (

      !documentPath ||

      !fs.existsSync(documentPath)

    ) {

      return res.status(404).send(
        "Document is no longer available."
      );

    }


    res.send(`

      <!DOCTYPE html>

      <html>

      <head>

        <meta charset="UTF-8">

        <title>
          Share Document
        </title>

        <link
          rel="stylesheet"
          href="/styles.css"
        >

      </head>

      <body>

        <main class="dashboard">

          <div class="page-navigation">

            <a
              href="/document/${classification}"
              class="back-button"
            >
              ← Back to Document
            </a>

          </div>

          <section class="welcome">

            <div>

              <div class="badge">
                DOCUMENT SHARING
              </div>

              <h2>
                Share ${escapeHtml(document.name)}
              </h2>

              <p>
                Select the recipient for this
                document.
              </p>

            </div>

          </section>


          <section class="research-note">

            <form
              method="POST"
              action="/document/${classification}/share"
            >

              <label>
                Recipient
              </label>

              <br><br>

              <input
                type="text"
                name="recipient"
                placeholder="Enter username"
                required
              >

              <br><br>

              <button
                type="submit"
                class="primary-button"
              >
                Share Document
              </button>

            </form>

          </section>

        </main>

      </body>

      </html>

    `);

  }
);


// ==================================================
// PROCESS SHARE
// ==================================================

app.post(
  "/document/:classification/share",
  requireAuthentication,
  (req, res) => {

    const classification =
      req.params.classification
        .toLowerCase();


    const document =
      documents[classification];


    if (!document) {

      return res.status(404).send(
        "Document not found."
      );

    }


    const sourcePath =
      getDocumentPath(
        classification
      );


    if (

      !sourcePath ||

      !fs.existsSync(sourcePath)

    ) {

      return res.status(404).send(
        "Document is no longer available."
      );

    }


    const recipient =
      String(
        req.body.recipient || ""
      ).trim();


    if (!recipient) {

      return res.status(400).send(
        "Recipient is required."
      );

    }


    // ==================================================
    // LIVE DOCUMENT SHARE RISK
    // ==================================================

    const shareSignals = [

      "DOCUMENT_SHARE"

    ];


    if (
      classification ===
      "confidential"
    ) {

      shareSignals.push(
        "CONFIDENTIAL_DOCUMENT"
      );

    }


    if (
      classification ===
      "restricted"
    ) {

      shareSignals.push(
        "RESTRICTED_DOCUMENT"
      );

    }


    const shareRisk =
      evaluateLiveRisk(

        req,

        {

          signals:
            shareSignals,

          metadata: {

            document:
              document.name,

            classification:
              document.classification,

            sensitivity:
              document.sensitivity,

            recipient,

            action:
              "SHARE"

          },

          qualifiesAsNormal:
            false

        }

      );


    if (
      enforceLiveRisk(

        req,

        res,

        shareRisk,

        req.originalUrl

      ) !== true
    ) {

      return;

    }


    const safeRecipient =
      recipient.replace(
        /[^a-zA-Z0-9_-]/g,
        "_"
      );


    const sharedFilename =
      `${safeRecipient}_${document.filename}`;


    const sharedPath =
      path.join(

        SHARED_ROOT,

        sharedFilename

      );


    fs.copyFileSync(

      sourcePath,

      sharedPath

    );


    logActivity(

      req,

      "DOCUMENT_SHARE",

      {

        document:
          document.name,

        filename:
          document.filename,

        recipient:
          recipient,

        shared_copy:
          sharedFilename,

        classification:
          document.classification,

        sensitivity:
          document.sensitivity,

        resource:
          document.name,

        action:
          "SHARE",

        allowed:
          true

      }

    );


    res.send(`

      <h1>
        Document Shared
      </h1>

      <p>
        <strong>
          ${escapeHtml(document.name)}
        </strong>
        was shared with
        <strong>
          ${escapeHtml(recipient)}
        </strong>.
      </p>

      <p>
        A physical shared copy was created
        in the corporate shared workspace.
      </p>

      <a href="/document/${classification}">
        Return to Document
      </a>

    `);

  }
);


// ==================================================
// DELETE DOCUMENT
// ==================================================

app.get(
  "/document/:classification/delete",
  requireAuthentication,
  (req, res) => {

    const classification =
      req.params.classification
        .toLowerCase();


    const document =
      documents[classification];


    if (!document) {

      return res.status(404).send(
        "Document not found."
      );

    }


    const sourcePath =
      getDocumentPath(
        classification
      );


    if (

      !sourcePath ||

      !fs.existsSync(sourcePath)

    ) {

      return res.status(404).send(
        "Document is already unavailable."
      );

    }


    // ==================================================
    // LIVE DOCUMENT DELETE RISK
    // ==================================================

    const deleteSignals = [

      "DOCUMENT_DELETE"

    ];


    if (
      classification ===
      "confidential"
    ) {

      deleteSignals.push(
        "CONFIDENTIAL_DOCUMENT"
      );

    }


    if (
      classification ===
      "restricted"
    ) {

      deleteSignals.push(
        "RESTRICTED_DOCUMENT"
      );

    }


    const deleteRisk =
      evaluateLiveRisk(

        req,

        {

          signals:
            deleteSignals,

          metadata: {

            document:
              document.name,

            classification:
              document.classification,

            sensitivity:
              document.sensitivity,

            action:
              "DELETE"

          },

          qualifiesAsNormal:
            false

        }

      );


    if (
      enforceLiveRisk(

        req,

        res,

        deleteRisk,

        req.originalUrl

      ) !== true
    ) {

      return;

    }


    const trashFilename =
      `${Date.now()}_${document.filename}`;


    const trashPath =
      path.join(

        TRASH_ROOT,

        trashFilename

      );


    fs.renameSync(

      sourcePath,

      trashPath

    );


    logActivity(

      req,

      "DOCUMENT_DELETE",

      {

        document:
          document.name,

        filename:
          document.filename,

        classification:
          document.classification,

        sensitivity:
          document.sensitivity,

        original_location:
          document.folder,

        trash_location:
          trashFilename,

        resource:
          document.name,

        action:
          "DELETE",

        allowed:
          true

      }

    );


    res.send(`

      <h1>
        Document Deleted
      </h1>

      <p>
        <strong>
          ${escapeHtml(document.name)}
        </strong>
        has been removed from the active
        corporate workspace.
      </p>

      <p>
        The file has been moved to the
        research recovery area rather than
        permanently destroyed.
      </p>

      <a href="/workspace">
        Return to Workspace
      </a>

    `);

  }
);


// ==================================================
// LEGACY DOCUMENT ACTION API
// ==================================================

app.post(
  "/document/action",
  requireAuthentication,
  (req, res) => {

    const action =
      String(
        req.body?.action || ""
      )
      .trim()
      .toUpperCase();


    const classification =
      req.session?.currentDocument;


    const document =
      documents[classification];


    if (!document) {

      return res.status(400).json({

        success:
          false,

        message:
          "No active document was found."

      });

    }


    const allowedActions = [

      "VIEW",

      "DOWNLOAD",

      "COPY",

      "SHARE",

      "DELETE"

    ];


    if (
      !allowedActions.includes(action)
    ) {

      return res.status(400).json({

        success:
          false,

        message:
          "Invalid document action."

      });

    }


    logActivity(

      req,

      `DOCUMENT_${action}`,

      {

        document:
          document.name,

        filename:
          document.filename,

        classification:
          document.classification,

        sensitivity:
          document.sensitivity,

        resource:
          document.name,

        action,

        allowed:
          true

      }

    );


    res.json({

      success:
        true,

      message:
        `${action} action recorded.`

    });

  }
);


// ==================================================
// STANDARD PROTECTED RESOURCE
// ==================================================

app.get(
  "/protected",
  requireAuthentication,
  (req, res) => {

    logActivity(

      req,

      "PROTECTED_RESOURCE_ACCESS",

      {

        resource:
          "standard",

        sensitivity:
          "low",

        action:
          "ACCESS",

        allowed:
          true

      }

    );


    const username =
      getUsername(req);


    let protectedPage =
      fs.readFileSync(

        path.join(
          process.cwd(),
          "views",
          "protected.html"
        ),

        "utf8"

      );


    protectedPage =
      protectedPage.replace(

        /{{USERNAME}}/g,

        escapeHtml(username)

      );


    res.send(
      protectedPage
    );

  }
);


// ==================================================
// SENSITIVE RESOURCE
// ==================================================

app.get(
  "/sensitive",
  requireAuthentication,
  (req, res) => {

    const riskResult =
      evaluateLiveRisk(

        req,

        {

          signals: [

            "SENSITIVE_RESOURCE"

          ],

          metadata: {

            resource:
              "sensitive",

            sensitivity:
              "medium"

          },

          qualifiesAsNormal:
            false

        }

      );


    if (
      enforceLiveRisk(

        req,

        res,

        riskResult,

        req.originalUrl

      ) !== true
    ) {

      return;

    }


    logActivity(

      req,

      "SENSITIVE_RESOURCE_ACCESS",

      {

        resource:
          "sensitive",

        sensitivity:
          "medium",

        action:
          "ACCESS",

        allowed:
          true

      }

    );


    const username =
      getUsername(req);


    let sensitivePage =
      fs.readFileSync(

        path.join(
          process.cwd(),
          "views",
          "sensitive.html"
        ),

        "utf8"

      );


    sensitivePage =
      sensitivePage.replace(

        /{{USERNAME}}/g,

        escapeHtml(username)

      );


    res.send(
      sensitivePage
    );

  }
);


// ==================================================
// PRIVILEGED OPERATION
// ==================================================

app.get(
  "/privileged",
  requireAuthentication,
  (req, res) => {

    const riskResult =
      evaluateLiveRisk(

        req,

        {

          signals: [

            "UNUSUAL_ACTIVITY"

          ],

          metadata: {

            resource:
              "privileged",

            sensitivity:
              "high"

          },

          qualifiesAsNormal:
            false

        }

      );


    if (
      enforceLiveRisk(

        req,

        res,

        riskResult,

        req.originalUrl

      ) !== true
    ) {

      return;

    }


    logActivity(

      req,

      "PRIVILEGED_OPERATION",

      {

        resource:
          "privileged",

        sensitivity:
          "high",

        action:
          "ACCESS",

        allowed:
          true

      }

    );


    const username =
      getUsername(req);


    let privilegedPage =
      fs.readFileSync(

        path.join(
          process.cwd(),
          "views",
          "privileged.html"
        ),

        "utf8"

      );


    privilegedPage =
      privilegedPage.replace(

        /{{USERNAME}}/g,

        escapeHtml(username)

      );


    res.send(
      privilegedPage
    );

  }
);


// ==================================================
// CURRENT RISK API
// ==================================================

app.get(
  "/risk/current",
  requireAuthentication,
  (req, res) => {

    const risk =
      getCurrentRisk(

        req.session.sessionId,

        getNormalizedUsername(req)

      );


    res.json(risk);

  }
);


// ==================================================
// DETAILED RISK API
// ==================================================

app.get(
  "/risk/details",
  requireAuthentication,
  (req, res) => {

    const risk =
      getDetailedRiskState(

        req.session.sessionId,

        getNormalizedUsername(req)

      );


    res.json(risk);

  }
);


// ==================================================
// RISK STEP-UP PAGE
// ==================================================

app.get(
  "/risk/step-up",
  requireAuthentication,
  (req, res) => {

    const riskStepUp =
      req.session.riskStepUp;


    if (!riskStepUp?.required) {

      return res.redirect(
        "/dashboard"
      );

    }


    const username =
      getUsername(req);


    res.send(`

      <!DOCTYPE html>

      <html lang="en">

      <head>

        <meta charset="UTF-8">

        <meta
          name="viewport"
          content="width=device-width, initial-scale=1.0"
        >

        <title>
          Additional Authentication Required
        </title>

        <link
          rel="stylesheet"
          href="/styles.css"
        >

      </head>


      <body>

        <main class="dashboard">

          <section class="welcome">

            <div>

              <div class="badge">
                CONTINUOUS AUTHENTICATION
              </div>

              <h2>
                Additional Authentication Required
              </h2>

              <p>
                Your current session risk level has
                reached HIGH.
              </p>

              <p>
                Please authenticate again to continue.
              </p>

              <p>
                Current Risk Score:
                <strong>
                  ${riskStepUp.score}
                </strong>
              </p>

              <p>
                Risk Level:
                <strong>
                  ${riskStepUp.riskLevel}
                </strong>
              </p>

              <br>

              <a
                href="/risk/step-up/login"
                class="primary-button"
              >
                Authenticate Again
              </a>

            </div>

          </section>

        </main>

      </body>

      </html>

    `);

  }
);


// ==================================================
// START STEP-UP AUTHENTICATION
// ==================================================

app.get(
  "/risk/step-up/login",
  requireAuthentication,
  async (req, res) => {

    const riskStepUp =
      req.session.riskStepUp;


    if (!riskStepUp?.required) {

      return res.redirect(
        "/dashboard"
      );

    }


    try {

      const codeVerifier =
        randomPKCECodeVerifier();


      const codeChallenge =
        await calculatePKCECodeChallenge(
          codeVerifier
        );


      const state =
        randomState();


      req.session.stepUpCodeVerifier =
        codeVerifier;


      req.session.stepUpState =
        state;


      const redirectUri =
        new URL(
          process.env.KEYCLOAK_REDIRECT_URI
        );


      const authorizationUrl =
        buildAuthorizationUrl(

          oidcConfig,

          {

            redirect_uri:
              redirectUri,

            scope:
              "openid profile email",

            state,

            code_challenge:
              codeChallenge,

            code_challenge_method:
              "S256",

            prompt:
              "login"

          }

        );


      res.redirect(
        authorizationUrl
      );


    } catch (error) {

      console.error(
        "Step-up authentication error:",
        error
      );


      res.status(500).send(`

        <h1>
          Step-Up Error
        </h1>

        <p>
          Unable to start additional authentication.
        </p>

        <a href="/risk/step-up">
          Return to Step-Up
        </a>

      `);

    }

  }
);


// ==================================================
// LOGOUT
// ==================================================

app.get(
  "/logout",
  (req, res) => {

    const idToken =
      req.session?.idToken;


    const sessionId =
      req.session?.sessionId ||
      "unknown";


    // -----------------------------------------------
    // DESTROY RISK ENGINE STATE
    // -----------------------------------------------

    if (
      sessionId !== "unknown"
    ) {

      destroyRiskState(
        sessionId
      );

    }


    logActivity(

      req,

      "LOGOUT",

      {

        resource:
          "application_session",

        action:
          "LOGOUT",

        allowed:
          true

      }

    );


    req.session.destroy(
      (error) => {

        if (error) {

          console.error(
            "Application logout error:",
            error
          );


          return res
            .status(500)
            .send(
              "Logout failed."
            );

        }


        console.log(

          `Application session ended: ${sessionId}`

        );


        const keycloakLogoutUrl =
          new URL(

            `${process.env.KEYCLOAK_ISSUER}/protocol/openid-connect/logout`

          );


        if (idToken) {

          keycloakLogoutUrl.searchParams.set(

            "id_token_hint",

            idToken

          );

        }


        keycloakLogoutUrl.searchParams.set(

          "post_logout_redirect_uri",

          process.env.KEYCLOAK_LOGOUT_REDIRECT_URI ||
          "http://localhost:3000/"

        );


        keycloakLogoutUrl.searchParams.set(

          "client_id",

          process.env.KEYCLOAK_CLIENT_ID

        );


        console.log(
          "Redirecting to Keycloak logout..."
        );


        res.redirect(

          keycloakLogoutUrl.toString()

        );

      }

    );

  }
);

// ==================================================
// RESEARCH: DETAILED RISK STATE
// ==================================================

app.get(
  "/research/risk-state",
  requireAuthentication,
  (req, res) => {

    try {

      const sessionId =
        req.session?.sessionId;

      const username =
        req.session?.user?.preferred_username ||
        req.session?.user?.name;

      if (!sessionId) {

        return res.status(400).json({
          error:
            "Research session ID not found."
        });

      }

      if (!username) {

        return res.status(400).json({
          error:
            "Username not found."
        });

      }

      const riskState =
        getDetailedRiskState(
          sessionId,
          username
        );

      return res.json(
        riskState
      );

    }
    catch (error) {

      console.error(
        "Detailed risk state error:",
        error
      );

      return res.status(500).json({

        error:
          "Unable to retrieve detailed risk state.",

        message:
          error.message

      });

    }

  }
);
// ==================================================
// START APPLICATION
// ==================================================

initializeOIDC()

  .then(() => {

    app.listen(

      PORT,

      () => {

        console.log(

          `Application running at http://localhost:${PORT}`

        );


        console.log(

          "Corporate document system initialized."

        );


        console.log(

          `Document storage: ${DOCUMENT_ROOT}`

        );


        console.log(

          `Activity log: ${path.join(
            LOG_DIRECTORY,
            "activity.log"
          )}`

        );

      }

    );

  })

  .catch(

    (error) => {

      console.error(

        "Failed to initialize OIDC:",

        error

      );

    }

  );