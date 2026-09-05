const CHANNEL_SEGMENT_PATTERN = /^[A-Za-z0-9_-]+$/;

export function createStageChannelName(input: {
  bandId: string;
  eventId: string;
  setListId: string;
}): string {
  return [
    "chordph",
    "stage",
    requireChannelSegment(input.eventId, "eventId"),
    requireChannelSegment(input.setListId, "setListId"),
    requireChannelSegment(input.bandId, "bandId"),
  ].join(":");
}

function requireChannelSegment(value: string, field: string): string {
  if (!CHANNEL_SEGMENT_PATTERN.test(value)) {
    throw new Error(`${field} is not a valid stage channel segment.`);
  }

  return value;
}
