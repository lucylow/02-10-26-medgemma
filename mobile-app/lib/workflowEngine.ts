/**
 * PediScreen AI Workflow Engine — Validation, topological sort, execution
 */

import type {
  WorkflowNode,
  Connection,
  WorkflowValidation,
  AgentType,
} from '@/types/workflow';

function buildDependencyGraph(
  nodes: WorkflowNode[],
  connections: Connection[]
): Map<string, string[]> {
  const graph = new Map<string, string[]>();
  nodes.forEach((n) => graph.set(n.id, []));
  connections.forEach(({ from, to }) => {
    const succ = graph.get(from) ?? [];
    succ.push(to);
    graph.set(from, succ);
  });
  return graph;
}

function hasCycles(graph: Map<string, string[]>): boolean {
  const visited = new Set<string>();
  const recursionStack = new Set<string>();

  function dfs(nodeId: string): boolean {
    visited.add(nodeId);
    recursionStack.add(nodeId);

    const succ = graph.get(nodeId) ?? [];
    for (const next of succ) {
      if (!visited.has(next)) {
        if (dfs(next)) return true;
      } else if (recursionStack.has(next)) {
        return true;
      }
    }

    recursionStack.delete(nodeId);
    return false;
  }

  for (const nodeId of graph.keys()) {
    if (!visited.has(nodeId) && dfs(nodeId)) return true;
  }
  return false;
}

function topologicalSort(
  graph: Map<string, string[]>,
  nodeIds: string[]
): string[] {
  const inDegree = new Map<string, number>();
  nodeIds.forEach((id) => inDegree.set(id, 0));
  graph.forEach((succ, from) => {
    succ.forEach((to) => {
      inDegree.set(to, (inDegree.get(to) ?? 0) + 1);
    });
  });

  const queue: string[] = [];
  inDegree.forEach((deg, id) => {
    if (deg === 0) queue.push(id);
  });

  const order: string[] = [];
  while (queue.length > 0) {
    const node = queue.shift()!;
    order.push(node);
    const succ = graph.get(node) ?? [];
    succ.forEach((next) => {
      const d = (inDegree.get(next) ?? 1) - 1;
      inDegree.set(next, d);
      if (d === 0) queue.push(next);
    });
  }

  return order;
}

export function validateWorkflow(
  nodes: WorkflowNode[],
  connections: Connection[]
): WorkflowValidation {
  const issues: string[] = [];
  const graph = buildDependencyGraph(nodes, connections);

  if (hasCycles(graph)) {
    issues.push('Workflow contains circular dependencies');
  }

  const inputs = nodes.filter((n) => n.type === 'voice' || n.type === 'intake');
  const outputs = nodes.filter((n) => n.type === 'fhir');

  if (inputs.length === 0) {
    issues.push('No input agent found');
  }

  if (outputs.length === 0) {
    issues.push('No output agent found');
  }

  const executionOrder = topologicalSort(graph, nodes.map((n) => n.id));

  return {
    isValid: issues.length === 0,
    issues,
    executionOrder,
  };
}

export function getDefaultConfig(type: AgentType): Record<string, unknown> {
  const configs: Record<AgentType, Record<string, unknown>> = {
    voice: { sampleRate: 16000, language: 'en' },
    intake: { validateAge: true, requiredFields: ['age', 'observations'] },
    embedding: { model: 'medgemma-vision', dim: 768 },
    medgemma: { model: 'medgemma-4b', temperature: 0.3, maxTokens: 512 },
    temporal: { lookbackMonths: 12 },
    safety: { threshold: 0.85 },
    fhir: { resourceType: 'Observation', profile: 'pediscreen' },
  };
  return configs[type] ?? {};
}

export async function executeWorkflow(
  workflowJson: string,
  executeAgent: (node: WorkflowNode) => Promise<void>
): Promise<void> {
  const { nodes, connections } = JSON.parse(workflowJson) as {
    nodes: WorkflowNode[];
    connections: Connection[];
  };
  const validation = validateWorkflow(nodes, connections);

  if (!validation.isValid) {
    throw new Error(`Invalid workflow: ${validation.issues.join('; ')}`);
  }

  for (const nodeId of validation.executionOrder) {
    const node = nodes.find((n) => n.id === nodeId);
    if (node) await executeAgent(node);
  }
}
