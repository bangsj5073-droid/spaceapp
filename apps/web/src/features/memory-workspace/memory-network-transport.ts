import type { MemoryNetworkLayoutRequest, MemoryNetworkLayoutWorkerRequest } from "./memory-network-layout-protocol.js";

const NODE_BATCH = 500;
const EDGE_BATCH = 2000;
const yieldToUI = () => new Promise<void>(resolve => setTimeout(resolve, 0));

/** Bound synchronous structured-clone work when sending a complete graph. */
export async function postMemoryNetworkLayoutRequest(
  worker: { postMessage(message: MemoryNetworkLayoutWorkerRequest): void },
  request: MemoryNetworkLayoutRequest,
  active: () => boolean = () => true
): Promise<void> {
  if (!active()) return;
  if (request.nodes.length <= 2000 && request.edges.length <= 6000) {
    worker.postMessage(request);
    return;
  }
  worker.postMessage({ kind: "begin", mode: request.mode, prepareAtlas: request.prepareAtlas });
  for (let offset = 0; offset < request.nodes.length; offset += NODE_BATCH) {
    if (!active()) return;
    worker.postMessage({ kind: "nodes", nodes: request.nodes.slice(offset, offset + NODE_BATCH) });
    await yieldToUI();
  }
  for (let offset = 0; offset < request.edges.length; offset += EDGE_BATCH) {
    if (!active()) return;
    worker.postMessage({ kind: "edges", edges: request.edges.slice(offset, offset + EDGE_BATCH) });
    await yieldToUI();
  }
  if (active()) worker.postMessage({ kind: "finish" });
}
