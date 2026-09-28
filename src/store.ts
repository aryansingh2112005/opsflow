import { OpsRequest } from "./types";

// Temporary in-memory storage. We replace this with DynamoDB in Step 5.
const requests: OpsRequest[] = [];

export const store = {
  add(request: OpsRequest): OpsRequest {
    requests.push(request);
    return request;
  },
  getAll(): OpsRequest[] {
    return requests;
  },
  getById(id: string): OpsRequest | undefined {
    return requests.find((r) => r.id === id);
  },
};