import type {
  DraftWrite,
  ErrorEnvelope,
  FormDetail,
  FormList,
  PublicForm,
  ResponseList,
  SubmissionReceipt,
  SubmissionRequest,
} from "@/lib/contracts";

export class ApiError extends Error {
  constructor(
    public status: number,
    public error: ErrorEnvelope["error"],
  ) {
    super(error.message);
    this.name = "ApiError";
  }
}

export async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`/api/v1${path}`, {
    ...init,
    cache: "no-store",
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  if (!response.ok) {
    let payload: ErrorEnvelope;
    try {
      const body = await response.json();
      payload = body.error
        ? body
        : {
            error: {
              code: "request_failed",
              message: "The request could not be completed.",
              details: [],
            },
          };
    } catch {
      payload = {
        error: {
          code: "request_failed",
          message: "The server could not be reached. Please try again.",
          details: [],
        },
      };
    }
    throw new ApiError(response.status, payload.error);
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export const formsApi = {
  list: () => request<FormList>("/forms"),
  get: (id: string) => request<FormDetail>(`/forms/${encodeURIComponent(id)}`),
  create: (title: string) =>
    request<FormDetail>("/forms", {
      method: "POST",
      body: JSON.stringify({ title }),
    }),
  save: (id: string, draft: DraftWrite) =>
    request<FormDetail>(`/forms/${encodeURIComponent(id)}/draft`, {
      method: "PUT",
      body: JSON.stringify(draft),
    }),
  publish: (id: string, expected_revision: number) =>
    request<FormDetail>(`/forms/${encodeURIComponent(id)}/publish`, {
      method: "POST",
      body: JSON.stringify({ expected_revision }),
    }),
  responses: (id: string, offset = 0) =>
    request<ResponseList>(
      `/forms/${encodeURIComponent(id)}/responses?limit=25&offset=${offset}`,
    ),
};

export const publicApi = {
  get: (slug: string) =>
    request<PublicForm>(`/public/forms/${encodeURIComponent(slug)}`),
  submit: (slug: string, payload: SubmissionRequest) =>
    request<SubmissionReceipt>(
      `/public/forms/${encodeURIComponent(slug)}/responses`,
      { method: "POST", body: JSON.stringify(payload) },
    ),
};
