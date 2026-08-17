export type ActionErrorCode =
  | "UNAUTHENTICATED"
  | "FORBIDDEN"
  | "VALIDATION_ERROR"
  | "NOT_FOUND"
  | "CONFLICT"
  | "RATE_LIMITED"
  | "UNAVAILABLE";

export type ActionFieldErrors = Record<string, string[]>;

export type ActionSuccess<T> = {
  ok: true;
  data: T;
};

export type ActionFailure = {
  ok: false;
  error: {
    code: ActionErrorCode;
    message: string;
    fieldErrors?: ActionFieldErrors;
    incidentId?: string;
  };
};

export type ActionResult<T> = ActionSuccess<T> | ActionFailure;

type ActionFailureDetails = {
  fieldErrors?: ActionFieldErrors;
  incidentId?: string;
};

export function actionSuccess<T>(data: T): ActionSuccess<T> {
  return { ok: true, data };
}

export function actionFailure(
  code: ActionErrorCode,
  message: string,
  details: ActionFailureDetails = {},
): ActionFailure {
  return {
    ok: false,
    error: {
      code,
      message,
      ...details,
    },
  };
}
