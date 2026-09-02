# Bands Domain

## Purpose

Bands are user-facing collaboration groups for musicians who play together. The database keeps the domain generic as `Group`, but the product should present groups as bands anywhere the feature is musician-facing.

Bands do not own tracks, set lists, or events. Those planning objects are owned by individual user accounts. Bands are attached to an account-owned event/set-list plan so members can later enter stage mode together.

## Terms

- **Band**: User-facing name for a `Group`.
- **Group**: Generic database/domain model backing a band.
- **Band member**: A user with a `GroupMembership`.
- **Event**: Account-owned scheduled activity, such as `Saturday Practice`.
- **Set list**: Account-owned ordered list of tracks.
- **Stage**: Future live mode where a user enters with a selected event, set list, and band.
- **Coordinator**: A band owner or moderator controlling synced stage users.

## Ownership

- A user owns the bands they create through their owner membership.
- A user owns the events they create.
- A user owns the set lists they create.
- A user owns the tracks they create.
- Bands are linked to event/set-list usage, but do not become owners of those events or set lists.
- For the first implementation, an event can only use set lists owned by the same event owner.

## Roles

Bands use the existing `GroupRole` values:

- `OWNER`
- `MODERATOR`
- `MEMBER`

Initial permissions:

- `OWNER` can update the band, add members, remove members, update member roles, delete the band, and coordinate synced stage users.
- `MODERATOR` can view the band and coordinate synced stage users.
- `MEMBER` can view the band and participate in stage mode.

Membership management is owner-only for the first implementation. Moderators should not add or remove members unless a later product decision expands that permission.

## Membership And Invitations

For the first implementation, a band owner can search existing users by name or email and add them to the band immediately.

The data model should still support future invitation acceptance. A membership should be able to represent at least:

- accepted membership
- pending invitation
- who invited the member
- when the invitation was created
- when the invitation was accepted

First implementation behavior:

- Adding an existing user creates an accepted membership immediately.
- The inviter is stored as the current owner.
- `acceptedAt` is set immediately.

Future behavior:

- Adding a user may create a pending invitation.
- The invited user must accept before becoming an active member.
- Pending members should not be treated as active band members for stage participation.

## Event And Set List Planning

Events and set lists are account-owned planning objects.

Rules:

- A set list can exist without an event.
- An event can contain multiple set lists.
- A set list can be used in multiple events.
- A band can be attached to a set list only in the context of a specific event.
- Multiple bands can be attached to the same event set list.

Conceptual hierarchy for planning and stage entry:

```txt
Event
  -> Set List
      -> Band(s)
```

This hierarchy describes usage, not ownership.

Recommended relational shape:

```txt
Event
  -> EventSetList
      -> EventSetListBand
```

`EventSetList` links an account-owned event to one of that account's set lists. `EventSetListBand` links a band to that event/set-list pair.

This avoids making a band globally attached to a set list outside the event where that band is expected to play it.

## Event Fields

Events should support scheduling and future map display:

- title
- description
- start date/time
- optional end date/time
- optional timezone
- optional location name
- optional location address
- optional latitude
- optional longitude

Coordinates are nullable until map features are implemented.

## Attaching Bands To Event Set Lists

A user can attach a band to an event set list only when all of these are true:

- the user owns the event
- the user owns the set list
- the set list is linked under that event
- the user is an `OWNER` or `MODERATOR` of the band

This keeps event/set-list planning account-owned while preventing ordinary band members from attaching a band they do not manage.

## Stage Mode Future Behavior

Stage mode is not part of the first bands implementation unless explicitly scoped later.

Future stage entry:

- The user selects an event.
- The user selects a set list available under that event.
- The user selects one of the bands attached to that event/set-list pair.
- The user must be an active member of the selected band.

Future sync behavior:

- A user can choose synced mode or unsynced mode.
- Synced users follow the coordinator's current state.
- Unsynced users can navigate independently.
- Only band `OWNER` and `MODERATOR` roles can coordinate synced users.

Future live state may include:

- current event
- current set list
- current band
- current track
- current track section
- current scroll or playback position
- coordinator user
- participant sync preference

## Current Schema Notes

The current schema already has:

- `Group`
- `GroupMembership`
- `GroupRole`
- `Event`
- `EventGroups`
- `EventGroupSetList`
- `SetList`
- `SetListTrack`

Expected schema adjustments before full implementation:

- Add invitation-ready status fields to `GroupMembership`.
- Add ownership metadata to `Group` if the creator must be queryable without relying only on membership.
- Add event scheduling/location fields beyond the current `title`, `description`, `startDate`, and `place`.
- Replace or evolve the current `EventGroupSetList` shape if needed so the model clearly represents `Event -> SetList -> Band`, rather than treating event/group/set-list as a flat triple.
- Review `EventGroups`; it may become unnecessary if bands are only attached under event set lists.

## First Implementation Slice

The first implementation should include:

- Schema support for invitation-ready memberships.
- Band creation using the existing group model.
- Creator automatically receives `OWNER`.
- Band list for the current user.
- Band detail with members.
- Owner-only member search by name or email.
- Owner-only add existing user to band.
- Owner-only remove member from band.
- Member roles stored as `OWNER`, `MODERATOR`, or `MEMBER`.
- Permission policy updated so membership management is owner-only.

The first implementation should not include:

- invitation acceptance flow
- public invite links
- email notifications
- stage mode
- live sync
- map UI
- sharing another user's set list into an event
