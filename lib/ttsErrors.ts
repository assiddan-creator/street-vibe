/** Public voice errors: quota/rate limits must never trigger a fallback voice. */
export class TtsRequestError extends Error {
  constructor(
    message: string,
    public readonly httpStatus: number,
    public readonly limitReached = false
  ) {
    super(message);
    this.name = "TtsRequestError";
  }
}

export function ttsFailureMessage(error: unknown): string {
  if (error instanceof TtsRequestError && [401, 403].includes(error.httpStatus)) {
    return "Voice access was denied. Refresh the page and check that you're signed in.";
  }
  if (error instanceof TtsRequestError && error.httpStatus === 429) {
    return error.limitReached
      ? error.message
      : "Too many voice requests. Please wait a little before trying again.";
  }
  return "The selected voice couldn't play. Try again or choose the basic browser voice.";
}

export function canOfferBasicVoice(error: unknown): boolean {
  return !(error instanceof TtsRequestError && [401, 403, 429].includes(error.httpStatus));
}
