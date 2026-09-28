# OpsFlow: Requirements

## 1. Problem
Teams handle internal requests (tool access, configuration changes, environment setup) through emails and chats. Requests get lost, nobody knows their status, and overdue ones are noticed too late. OpsFlow gives one place to submit, review and track requests, and automates escalation of overdue ones.

## 2. Users
| Role | Needs |
|---|---|
| Requester | Submit a request, attach a document, see its status |
| Approver | See requests waiting for review, approve or reject with a comment |
| Admin | See all requests, see escalated/overdue ones, mark approved requests as completed |

## 3. Request lifecycle (state machine)

```
SUBMITTED -> IN_REVIEW -> APPROVED -> COMPLETED
                      \-> REJECTED
```

Allowed transitions:
| From | To | Who |
|---|---|---|
| SUBMITTED | IN_REVIEW | Approver (picks it up) |
| IN_REVIEW | APPROVED | Approver |
| IN_REVIEW | REJECTED | Approver (comment required) |
| APPROVED | COMPLETED | Admin |

Any other transition is invalid and must return a clear error.

## 4. Functional requirements
- FR1: A requester can create a request with title, description, type and priority (LOW / MEDIUM / HIGH).
- FR2: A requester can list and view their own requests.
- FR3: An approver can list requests by status and change the status following the allowed transitions.
- FR4: Rejecting a request requires a comment.
- FR5: Every status change is recorded in a history (who, from, to, time).
- FR6: A requester can attach one document to a request (stored in S3 in a later step).
- FR7: A scheduled job marks requests stuck in IN_REVIEW longer than a set time as ESCALATED (a flag, not a status) and logs a reminder.

## 5. Non-functional requirements
- Clean, readable code with unit tests for the workflow and validation logic.
- Input validation on all APIs; clear error messages and correct HTTP status codes.
- Simple design; no unnecessary features.
- Documented setup and deployment steps.

## 6. Out of scope (for now)
- User signup/login system (roles are passed in a request header at first; real auth may come later)
- Email sending (escalation is logged first)
- Multiple attachments per request

## 7. Build order
1. Basic REST API with in-memory storage
2. State machine module + unit tests
3. DynamoDB storage
4. S3 attachments
5. Scheduler for escalation
6. Simple React UI
7. Deploy on EC2
8. README with architecture diagram and design decisions
