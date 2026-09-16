# Bounded directories, client lifetime and rollback

The compiled API and static Vue client remain separate. This change does not
combine services, add a frontend server, change production listeners, weaken
authentication, alter password costs or remove account records.

## Directory API

Existing GET endpoints /admins, /tutors/all, /users/all, /users/oftutor/:id and
public /tutors retain complete JSON arrays when called without query parameters.
The current UI requests pageSize=50 and receives items, next and previous.
Pages accept sizes 1 through 50. Name and account ID form a deterministic keyset,
including equal names. Use after=NEXT or before=PREVIOUS to traverse; cursors
are validated position markers and confer no authorization. HEAD checks the
same route permissions and query syntax and returns no directory body.

An optional q (at most 80 characters) searches literal, case-insensitive text.
Private directories search name, email and state; public tutors search only
name and state. Search expressions are escaped, not executed as user-provided
regular expressions. An optional exact id supports restoring an assigned tutor
outside the current page; it remains subject to the same role/filter boundaries.
Unknown query fields, invalid limits, oversized or malformed cursors, and
simultaneous after/before parameters are rejected.

Private fields remain projected and serialized without password/auth-version
material. Public tutor results contain only ID, name and state and only active
tutors. Assigned-user pages always include the authenticated tutor's scope;
cross-tutor access and suspended tutors remain denied.

Current pages retain at most 50 account records per view. Old array clients use
a 128-row Mongo cursor and HTTP backpressure. A stalled client stops additional
cursor consumption; disconnect closes the cursor, cancels read work and releases
admission after the handler settles. The directory transfer has a 20-second
deadline, with five-second database-operation limits. Interrupted arrays are
failed transfers, never a syntactically complete truncated success. Large clients
should use pages; there is no guarantee of an unbounded legacy export.

Search may scan index entries to find literal substrings. It has the same request
and database limits; this is not an indexed full-text-search service. Keyset pages
are not a multi-request snapshot: concurrent renames/deletions can change results.
Refresh from the first page when a consistent current view is needed.

## Browser requests and drafts

Directory state belongs to the rendered component, not global account arrays.
Replacing a page, starting a search, changing identity/privilege or disposing
the view cancels obsolete reads. Late responses cannot restore old accounts or
private pages. Temporary read failures retain the last page and show a retry
message; confirmed access denial clears it.

Session generations fence reads, pending CSRF acquisition and response handling.
Accepted writes are not aborted on logout. Responses from an obsolete session
cannot restore its UI or trigger a CSRF replay. Same-session requests rejected
before mutation retain the existing one-time CSRF retry.

Profile edits use separate view-local drafts. Confirmed saves update the account,
while changes typed during an earlier save stay unsaved. Temporary failures retain
the draft and display the failure. Navigation, reload and logout warn about unsaved
work; explicit confirmed departure may discard it. No private draft is persisted
to browser storage. Confirmed expiry/identity changes clear private views.

Tutor selection survives paging/search, and a delayed assignment lookup cannot
replace a newer choice. Credentials are bounded, duplicate submissions are gated,
and losing admin-management permission clears the hidden account-creation draft.
Failed signup reports its error in the signup form and retains the entered data.
The global store holds only a count of dirty views; unload listeners and counts
are removed on disposal. This does not claim recovery after a browser crash or
offline draft synchronization.

## Additive index rollout and retained application

New nonunique indexes for admins, tutors and users are (name, _id) and
(createdAt, _id). Users additionally have (tutor, name, _id) and
(tutor, createdAt, _id). Unique email indexes, identity reservations, authorization
versions and account fields are unchanged. Normal directory pages must use an
index without a materialized sort; the Mongo integration regression checks this.

Before activation, the operator should inspect index names/specifications and
build missing additive indexes sequentially on the existing database, with
resource headroom. Do not drop indexes or use a destructive synchronization
operation to resolve a naming conflict. Review conflicting definitions first.
The application models declare these indexes, but an operator-controlled build
avoids surprising first-start work on the production host.

The synthetic rollback rehearsal uses the current models to build the indexes,
then launches the retained v2.3.3 compiled API. It verifies complete legacy
directories, tutor scope, role denial, a profile write and session login/logout;
all indexes, roles, authorization versions and assignments remain intact.

    node scripts/test-directory-rollback.mjs RETAINED_CHECKOUT mongodb://127.0.0.1:PORT/operation_security_test

The retained checkout must contain its exact compiled source and locked
dependencies. The rehearsal does not activate production or claim that the
operator's live adapter has run. Preserve the installed API/static topology,
external database/session state, protected environment and exact rollback target.
An application rollback need not remove these nonunique indexes. The existing
authorization lease is still 30 seconds; this change cancels abandoned read-side
lock waits but does not claim distributed lease renewal or general long-write
coordination. Those remain separate audit work.
