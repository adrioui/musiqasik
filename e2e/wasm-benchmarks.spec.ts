import { test, expect } from '@playwright/test';

/**
 * WASM Performance Benchmarks - E2E Tests
 *
 * These tests run in a real browser with the dev server running,
 * allowing proper WASM loading and performance measurement.
 *
 * To run:
 * 1. Start dev server: npm run dev
 * 2. Run benchmarks: npm run test:e2e -- wasm-benchmarks.spec.ts
 */

interface BenchmarkResult {
  jsTime: number;
  wasmTime: number;
  speedup: number;
  nodeCount: number;
  edgeCount: number;
}

test.describe('WASM Performance Benchmarks', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to home page and wait for WASM to load
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Wait for WASM to initialize
    await page.waitForFunction(() => {
      return window.__WASM_LOADED__ === true;
    }, { timeout: 10000 });
  });

  test('WASM module should be loaded and initialized', async ({ page }) => {
    const wasmLoaded = await page.evaluate(() => {
      return window.__WASM_LOADED__ === true && window.__WASM_MODULE__ !== undefined;
    });

    expect(wasmLoaded).toBe(true);

    const version = await page.evaluate(() => {
      return window.__WASM_MODULE__?.get_version();
    });

    expect(version).toBeDefined();
    console.log(`WASM version: ${version}`);
  });

  test('health check should return true', async ({ page }) => {
    const healthy = await page.evaluate(() => {
      return window.__WASM_MODULE__?.health_check();
    });

    expect(healthy).toBe(true);
  });

  test('benchmark: Small graph (100 nodes, 500 edges)', async ({ page }) => {
    const result = await page.evaluate(() => {
      const { process_graph_data } = window.__WASM_MODULE__!;

      interface Artist { id: string; name: string; listeners: number; isCenter?: boolean; }
      interface Edge { source: string; target: string; weight: number; }
      interface GraphLink { source: string; target: string; weight: number; }

      // Generate test data
      function generateTestData(nodeCount: number, edgesPerNode: number): { artists: Artist[]; edges: Edge[] } {
        const artists: Artist[] = [];
        const edges: Edge[] = [];

        for (let i = 0; i < nodeCount; i++) {
          artists.push({
            id: `artist-${i}`,
            name: `Artist ${i}`,
            listeners: Math.floor(Math.random() * 1000000),
          });
        }

        for (let i = 0; i < nodeCount; i++) {
          for (let j = 0; j < edgesPerNode; j++) {
            const target = Math.floor(Math.random() * nodeCount);
            if (target !== i) {
              edges.push({
                source: `Artist ${i}`,
                target: `Artist ${target}`,
                weight: Math.random(),
              });
            }
          }
        }

        return { artists, edges };
      }

      // JS implementation
      function processGraphDataJS(nodes: Artist[], edges: Edge[], centerArtist: string | null, threshold: number) {
        const filteredEdges = edges.filter((e) => e.weight >= threshold);
        const connectedNodes = new Set<string>();
        filteredEdges.forEach((e) => {
          connectedNodes.add(e.source.toLowerCase());
          connectedNodes.add(e.target.toLowerCase());
        });

        const filteredNodes = nodes
          .filter(
            (n) =>
              connectedNodes.has(n.name.toLowerCase()) ||
              n.name.toLowerCase() === centerArtist?.toLowerCase()
          )
          .map((node) => ({
            ...node,
            isCenter: node.name.toLowerCase() === centerArtist?.toLowerCase(),
          }));

        const nodeMap = new Map(filteredNodes.map((n) => [n.name.toLowerCase(), n]));
        const graphLinks: GraphLink[] = filteredEdges
          .map((edge) => {
            const source = nodeMap.get(edge.source.toLowerCase());
            const target = nodeMap.get(edge.target.toLowerCase());
            if (source && target) {
              return { source: edge.source, target: edge.target, weight: edge.weight };
            }
            return null;
          })
          .filter((link): link is GraphLink => link !== null);

        return { nodes: filteredNodes, links: graphLinks };
      }

      const { artists, edges } = generateTestData(100, 5);
      const centerArtist = artists[0].name;
      const threshold = 0.5;
      const iterations = 10;

      // Warmup
      processGraphDataJS(artists, edges, centerArtist, threshold);
      process_graph_data(artists, edges, centerArtist, threshold);

      // Benchmark JS
      const jsStart = performance.now();
      for (let i = 0; i < iterations; i++) {
        processGraphDataJS(artists, edges, centerArtist, threshold);
      }
      const jsTime = (performance.now() - jsStart) / iterations;

      // Benchmark WASM
      const wasmStart = performance.now();
      for (let i = 0; i < iterations; i++) {
        process_graph_data(artists, edges, centerArtist, threshold);
      }
      const wasmTime = (performance.now() - wasmStart) / iterations;

      return {
        jsTime,
        wasmTime,
        speedup: jsTime / wasmTime,
        nodeCount: 100,
        edgeCount: edges.length,
      };
    });

    console.log(`Small graph (${result.nodeCount} nodes, ${result.edgeCount} edges):`);
    console.log(`  JS:     ${result.jsTime.toFixed(2)}ms`);
    console.log(`  WASM:   ${result.wasmTime.toFixed(2)}ms`);
    console.log(`  Speedup: ${result.speedup.toFixed(2)}x`);

    // For small graphs, WASM may be slower due to serialization overhead
    // This is expected and not a failure - the benefit comes with larger graphs
    expect(result.jsTime).toBeGreaterThan(0);
    expect(result.wasmTime).toBeGreaterThan(0);

    if (result.speedup < 0.5) {
      console.log(`  ⚠️ WASM slower for small graphs (expected due to serialization overhead)`);
    } else {
      console.log(`  ✅ Reasonable performance`);
    }
  });

  test('benchmark: Medium graph (500 nodes, 5000 edges)', async ({ page }) => {
    const result = await page.evaluate(() => {
      const { process_graph_data } = window.__WASM_MODULE__!;

      interface Artist { id: string; name: string; listeners: number; isCenter?: boolean; }
      interface Edge { source: string; target: string; weight: number; }
      interface GraphLink { source: string; target: string; weight: number; }

      // Generate test data
      function generateTestData(nodeCount: number, edgesPerNode: number): { artists: Artist[]; edges: Edge[] } {
        const artists: Artist[] = [];
        const edges: Edge[] = [];

        for (let i = 0; i < nodeCount; i++) {
          artists.push({
            id: `artist-${i}`,
            name: `Artist ${i}`,
            listeners: Math.floor(Math.random() * 1000000),
          });
        }

        for (let i = 0; i < nodeCount; i++) {
          for (let j = 0; j < edgesPerNode; j++) {
            const target = Math.floor(Math.random() * nodeCount);
            if (target !== i) {
              edges.push({
                source: `Artist ${i}`,
                target: `Artist ${target}`,
                weight: Math.random(),
              });
            }
          }
        }

        return { artists, edges };
      }

      // JS implementation
      function processGraphDataJS(nodes: Artist[], edges: Edge[], centerArtist: string | null, threshold: number) {
        const filteredEdges = edges.filter((e) => e.weight >= threshold);
        const connectedNodes = new Set<string>();
        filteredEdges.forEach((e) => {
          connectedNodes.add(e.source.toLowerCase());
          connectedNodes.add(e.target.toLowerCase());
        });

        const filteredNodes = nodes
          .filter(
            (n) =>
              connectedNodes.has(n.name.toLowerCase()) ||
              n.name.toLowerCase() === centerArtist?.toLowerCase()
          )
          .map((node) => ({
            ...node,
            isCenter: node.name.toLowerCase() === centerArtist?.toLowerCase(),
          }));

        const nodeMap = new Map(filteredNodes.map((n) => [n.name.toLowerCase(), n]));
        const graphLinks: GraphLink[] = filteredEdges
          .map((edge) => {
            const source = nodeMap.get(edge.source.toLowerCase());
            const target = nodeMap.get(edge.target.toLowerCase());
            if (source && target) {
              return { source: edge.source, target: edge.target, weight: edge.weight };
            }
            return null;
          })
          .filter((link): link is GraphLink => link !== null);

        return { nodes: filteredNodes, links: graphLinks };
      }

      const { artists, edges } = generateTestData(500, 10);
      const centerArtist = artists[0].name;
      const threshold = 0.5;
      const iterations = 10;

      // Warmup
      processGraphDataJS(artists, edges, centerArtist, threshold);
      process_graph_data(artists, edges, centerArtist, threshold);

      // Benchmark JS
      const jsStart = performance.now();
      for (let i = 0; i < iterations; i++) {
        processGraphDataJS(artists, edges, centerArtist, threshold);
      }
      const jsTime = (performance.now() - jsStart) / iterations;

      // Benchmark WASM
      const wasmStart = performance.now();
      for (let i = 0; i < iterations; i++) {
        process_graph_data(artists, edges, centerArtist, threshold);
      }
      const wasmTime = (performance.now() - wasmStart) / iterations;

      return {
        jsTime,
        wasmTime,
        speedup: jsTime / wasmTime,
        nodeCount: 500,
        edgeCount: edges.length,
      };
    });

    console.log(`Medium graph (${result.nodeCount} nodes, ${result.edgeCount} edges):`);
    console.log(`  JS:     ${result.jsTime.toFixed(2)}ms`);
    console.log(`  WASM:   ${result.wasmTime.toFixed(2)}ms`);
    console.log(`  Speedup: ${result.speedup.toFixed(2)}x`);

    // For 500+ nodes, WASM should show performance benefit
    // Note: First run may include JIT compilation overhead
    // Target is 1.2x+ (realistically 1.5-2x after warmup)
    if (result.speedup >= 1.5) {
      console.log(`  ✅ WASM is ${result.speedup.toFixed(2)}x faster (excellent!)`);
    } else if (result.speedup >= 1.0) {
      console.log(`  ⚠️ WASM is ${result.speedup.toFixed(2)}x faster (modest gain, may improve with larger data)`);
    } else {
      console.log(`  ⚠️ WASM slower (${result.speedup.toFixed(2)}x) - serialization overhead dominates for this size`);
    }

    // Don't fail test if WASM is slower - document the finding instead
    expect(result.jsTime).toBeGreaterThan(0);
    expect(result.wasmTime).toBeGreaterThan(0);
  });

  test('benchmark: Large graph (1000 nodes, 15000 edges)', async ({ page }) => {
    const result = await page.evaluate(() => {
      const { process_graph_data } = window.__WASM_MODULE__!;

      interface Artist { id: string; name: string; listeners: number; isCenter?: boolean; }
      interface Edge { source: string; target: string; weight: number; }
      interface GraphLink { source: string; target: string; weight: number; }

      // Generate test data
      function generateTestData(nodeCount: number, edgesPerNode: number): { artists: Artist[]; edges: Edge[] } {
        const artists: Artist[] = [];
        const edges: Edge[] = [];

        for (let i = 0; i < nodeCount; i++) {
          artists.push({
            id: `artist-${i}`,
            name: `Artist ${i}`,
            listeners: Math.floor(Math.random() * 1000000),
          });
        }

        for (let i = 0; i < nodeCount; i++) {
          for (let j = 0; j < edgesPerNode; j++) {
            const target = Math.floor(Math.random() * nodeCount);
            if (target !== i) {
              edges.push({
                source: `Artist ${i}`,
                target: `Artist ${target}`,
                weight: Math.random(),
              });
            }
          }
        }

        return { artists, edges };
      }

      // JS implementation
      function processGraphDataJS(nodes: Artist[], edges: Edge[], centerArtist: string | null, threshold: number) {
        const filteredEdges = edges.filter((e) => e.weight >= threshold);
        const connectedNodes = new Set<string>();
        filteredEdges.forEach((e) => {
          connectedNodes.add(e.source.toLowerCase());
          connectedNodes.add(e.target.toLowerCase());
        });

        const filteredNodes = nodes
          .filter(
            (n) =>
              connectedNodes.has(n.name.toLowerCase()) ||
              n.name.toLowerCase() === centerArtist?.toLowerCase()
          )
          .map((node) => ({
            ...node,
            isCenter: node.name.toLowerCase() === centerArtist?.toLowerCase(),
          }));

        const nodeMap = new Map(filteredNodes.map((n) => [n.name.toLowerCase(), n]));
        const graphLinks: GraphLink[] = filteredEdges
          .map((edge) => {
            const source = nodeMap.get(edge.source.toLowerCase());
            const target = nodeMap.get(edge.target.toLowerCase());
            if (source && target) {
              return { source: edge.source, target: edge.target, weight: edge.weight };
            }
            return null;
          })
          .filter((link): link is GraphLink => link !== null);

        return { nodes: filteredNodes, links: graphLinks };
      }

      const { artists, edges } = generateTestData(1000, 15);
      const centerArtist = artists[0].name;
      const threshold = 0.5;
      const iterations = 5; // Fewer iterations for large graphs

      // Warmup
      processGraphDataJS(artists, edges, centerArtist, threshold);
      process_graph_data(artists, edges, centerArtist, threshold);

      // Benchmark JS
      const jsStart = performance.now();
      for (let i = 0; i < iterations; i++) {
        processGraphDataJS(artists, edges, centerArtist, threshold);
      }
      const jsTime = (performance.now() - jsStart) / iterations;

      // Benchmark WASM
      const wasmStart = performance.now();
      for (let i = 0; i < iterations; i++) {
        process_graph_data(artists, edges, centerArtist, threshold);
      }
      const wasmTime = (performance.now() - wasmStart) / iterations;

      return {
        jsTime,
        wasmTime,
        speedup: jsTime / wasmTime,
        nodeCount: 1000,
        edgeCount: edges.length,
      };
    });

    console.log(`Large graph (${result.nodeCount} nodes, ${result.edgeCount} edges):`);
    console.log(`  JS:     ${result.jsTime.toFixed(2)}ms`);
    console.log(`  WASM:   ${result.wasmTime.toFixed(2)}ms`);
    console.log(`  Speedup: ${result.speedup.toFixed(2)}x`);

    // For 1000+ nodes, WASM should show clear performance benefit
    if (result.speedup >= 2.0) {
      console.log(`  ✅ WASM is ${result.speedup.toFixed(2)}x faster (excellent!)`);
    } else if (result.speedup >= 1.5) {
      console.log(`  ✅ WASM is ${result.speedup.toFixed(2)}x faster (good performance)`);
    } else if (result.speedup >= 1.0) {
      console.log(`  ⚠️ WASM is ${result.speedup.toFixed(2)}x faster (modest gain)`);
    } else {
      console.log(`  ⚠️ WASM slower (${result.speedup.toFixed(2)}x) - unexpected for this size`);
    }

    // Document findings rather than failing
    expect(result.jsTime).toBeGreaterThan(0);
    expect(result.wasmTime).toBeGreaterThan(0);
  });

  test('verify correctness: center artist is always included', async ({ page }) => {
    const correct = await page.evaluate(() => {
      const { process_graph_data } = window.__WASM_MODULE__!;

      const artists = [
        { id: '1', name: 'Artist A', listeners: 1000 },
        { id: '2', name: 'Artist B', listeners: 2000 },
        { id: '3', name: 'Artist C', listeners: 3000 },
      ];

      // Artist A is not connected to anyone
      const edges = [
        { source: 'Artist B', target: 'Artist C', weight: 0.9 },
      ];

      const result = process_graph_data(artists, edges, 'Artist A', 0.5);

      // Artist A should still be in the result as the center
      const centerNode = result.nodes.find((n) => n.name === 'Artist A');
      return centerNode !== undefined && centerNode.isCenter === true;
    });

    expect(correct).toBe(true);
  });

  test('verify correctness: threshold filtering works', async ({ page }) => {
    const result = await page.evaluate(() => {
      const { process_graph_data } = window.__WASM_MODULE__!;

      const artists = [
        { id: '1', name: 'Artist A', listeners: 1000 },
        { id: '2', name: 'Artist B', listeners: 2000 },
        { id: '3', name: 'Artist C', listeners: 3000 },
      ];

      const edges = [
        { source: 'Artist A', target: 'Artist B', weight: 0.9 },
        { source: 'Artist A', target: 'Artist C', weight: 0.3 },
      ];

      const result = process_graph_data(artists, edges, 'Artist A', 0.5);

      // Return result for debugging
      return {
        linksLength: result.links.length,
        links: result.links,
        nodesLength: result.nodes.length,
        nodes: result.nodes,
      };
    });

    // Only the edge with weight >= 0.5 should be included
    expect(result.linksLength).toBe(1);
    // Use approximate equality for floating point (f32 precision)
    expect(result.links[0].weight).toBeCloseTo(0.9, 1);
  });

  test('verify correctness: case-insensitive matching', async ({ page }) => {
    const correct = await page.evaluate(() => {
      const { process_graph_data } = window.__WASM_MODULE__!;

      const artists = [
        { id: '1', name: 'Artist A', listeners: 1000 },
        { id: '2', name: 'Artist B', listeners: 2000 },
      ];

      const edges = [
        { source: 'ARTIST A', target: 'artist b', weight: 0.9 },
      ];

      const result = process_graph_data(artists, edges, 'ARTIST A', 0.5);

      // Should match despite case differences
      const centerNode = result.nodes.find((n) => n.name === 'Artist A');
      return (
        result.nodes.length === 2 &&
        result.links.length === 1 &&
        centerNode?.isCenter === true
      );
    });

    expect(correct).toBe(true);
  });
});

// Types for E2E benchmark tests (browser context)
interface TestArtist {
  id: string;
  name: string;
  listeners: number;
  isCenter?: boolean;
}

interface TestEdge {
  source: string;
  target: string;
  weight: number;
}

interface TestGraphNode extends TestArtist {
  isCenter: boolean;
}

interface TestGraphLink {
  source: string;
  target: string;
  weight: number;
}

interface ProcessedGraph {
  nodes: TestGraphNode[];
  links: TestGraphLink[];
}

// Add type declaration for window.__WASM_MODULE__
declare global {
  interface Window {
    __WASM_MODULE__?: {
      get_version(): string;
      health_check(): boolean;
      process_graph_data(
        nodes: TestArtist[],
        edges: TestEdge[],
        centerArtist: string | null,
        threshold: number
      ): ProcessedGraph;
    };
    __WASM_LOADED__?: boolean;
  }
}
