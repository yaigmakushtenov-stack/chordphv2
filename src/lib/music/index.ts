export {
  MusicFileServiceError,
  createReadyMusicFileDownloadUrl,
  completeMusicUpload,
  findMusicFileByHash,
  listReadyMusicFiles,
  prepareMusicUpload,
  searchMusicFiles,
  uploadPreparedMusicFile,
} from "./music-file-service";

export type {
  ListMusicFilesInput,
  MusicFileRecord,
  MusicFileSearchResult,
  MusicFileSort,
  PrepareMusicUploadInput,
  PrepareMusicUploadResult,
  SearchMusicFilesInput,
  SearchMusicFilesResult,
  UploadPreparedMusicFileInput,
} from "./music-file-service";

export {
  createTrackWithAnnotation,
  copyPublicTrackToPersonalLibrary,
  getAnnotationTrack,
  getViewableAnnotationTrack,
  getTemporaryTrackArtists,
  listPersonalAnnotationTracks,
  saveTrackAnnotation,
  saveTrackDetails,
  submitTrackForPublicReview,
  TrackAnnotationServiceError,
} from "./track-annotation-service";

export type {
  AnnotationTrack,
  CreateTrackWithAnnotationInput,
  SaveTrackAnnotationInput,
  SaveTrackDetailsInput,
  PersonalTrackRecord,
  TemporaryTrackArtist,
} from "./track-annotation-service";

export {
  MUSICAL_KEYS,
  MAX_TRACK_TAGS,
  TRACK_JOIN_PHRASES,
  TRACK_TAG_GROUPS,
  TRACK_TAGS,
  TRACK_TUNINGS,
} from "./track-options";

export type {
  MusicalKey,
  TrackJoinPhrase,
  TrackTag,
  TrackTuning,
} from "./track-options";
