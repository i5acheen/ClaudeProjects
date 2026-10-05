import { networkEdges, type NetworkEdge } from '../../data/industry'

/** Walk the graph in one direction, collecting every reachable node and edge. */
function walk(start: string, dir: 'up' | 'down') {
  const nodes = new Set<string>()
  const edges = new Set<NetworkEdge>()
  const queue = [start]
  while (queue.length) {
    const id = queue.shift()!
    for (const e of networkEdges) {
      const [here, there] = dir === 'up' ? [e.to, e.from] : [e.from, e.to]
      if (here === id) {
        edges.add(e)
        if (!nodes.has(there)) {
          nodes.add(there)
          queue.push(there)
        }
      }
    }
  }
  return { nodes, edges }
}

export function relations(id: string) {
  const up = walk(id, 'up')
  const down = walk(id, 'down')
  return {
    upstreamNodes: up.nodes,
    downstreamNodes: down.nodes,
    upstreamEdges: up.edges,
    downstreamEdges: down.edges,
    directSuppliers: networkEdges.filter((e) => e.to === id),
    directCustomers: networkEdges.filter((e) => e.from === id),
  }
}
