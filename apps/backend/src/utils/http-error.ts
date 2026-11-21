/** An error with an HTTP status. The message is shown to the client, so never put user data in it. */
export class HttpError extends Error {
  constructor(
    readonly status: number,
    message: string
  ) {
    super(message);
  }
}

export const unauthorized = (message = 'Unauthorized') => new HttpError(401, message);
export const notFoundError = (message = 'Not found') => new HttpError(404, message);
export const conflict = (message: string) => new HttpError(409, message);
export const unprocessable = (message: string) => new HttpError(422, message);
