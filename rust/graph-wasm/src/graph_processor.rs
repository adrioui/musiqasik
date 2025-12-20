use crate::types::*;
use rustc_hash::{FxHashMap, FxHashSet};
use wasm_bindgen::prelude::*;

/// Normalize string for case-insensitive comparison
#[inline]
fn normalize(s: &str) -> String {
    s.to_lowercase()
}

/// Process raw graph data into filtered, visualization-ready format.
///
/// This is a single-pass algorithm that:
/// 1. Filters edges by weight threshold
/// 2. Collects connected node names
/// 3. Filters and transforms nodes
/// 4. Creates graph links
///
/// Performance: O(N + E) with minimal allocations
#[wasm_bindgen]
pub fn process_graph_data(
    nodes_json: &JsValue,
    edges_json: &JsValue,
    center_artist: Option<String>,
    threshold: f32,
) -> Result<JsValue, JsValue> {
    // Deserialize inputs
    let nodes: Vec<Artist> = serde_wasm_bindgen::from_value(nodes_json.clone())
        .map_err(|e| JsValue::from_str(&format!("Failed to parse nodes: {}", e)))?;
    let edges: Vec<Edge> = serde_wasm_bindgen::from_value(edges_json.clone())
        .map_err(|e| JsValue::from_str(&format!("Failed to parse edges: {}", e)))?;

    let center_normalized = center_artist.as_ref().map(|s| normalize(s));

    // Pre-allocate with estimated capacity
    let mut connected_nodes: FxHashSet<String> = FxHashSet::default();
    connected_nodes.reserve(edges.len() * 2);

    let mut filtered_edges: Vec<Edge> = Vec::with_capacity(edges.len());

    // Single pass: filter edges AND collect connected nodes
    for edge in edges {
        if edge.weight >= threshold {
            connected_nodes.insert(normalize(&edge.source));
            connected_nodes.insert(normalize(&edge.target));
            filtered_edges.push(edge);
        }
    }

    // Build normalization cache for nodes
    let mut norm_cache: FxHashMap<String, String> = FxHashMap::default();
    norm_cache.reserve(nodes.len());

    for node in &nodes {
        norm_cache.insert(node.name.clone(), normalize(&node.name));
    }

    // Filter nodes and build node map in single pass
    let mut filtered_nodes: Vec<GraphNode> = Vec::with_capacity(connected_nodes.len() + 1);
    let mut node_map: FxHashMap<String, usize> = FxHashMap::default();

    for node in nodes {
        let normalized = norm_cache.get(&node.name).unwrap();
        let is_connected = connected_nodes.contains(normalized);
        let is_center = center_normalized
            .as_ref()
            .map_or(false, |c| normalized == c);

        if is_connected || is_center {
            let idx = filtered_nodes.len();
            node_map.insert(normalized.clone(), idx);

            let mut graph_node: GraphNode = node.into();
            graph_node.is_center = is_center;
            filtered_nodes.push(graph_node);
        }
    }

    // Build graph links
    let mut graph_links: Vec<GraphLink> = Vec::with_capacity(filtered_edges.len());

    for edge in filtered_edges {
        let source_norm = normalize(&edge.source);
        let target_norm = normalize(&edge.target);

        // Only include links where both nodes exist
        if node_map.contains_key(&source_norm) && node_map.contains_key(&target_norm) {
            graph_links.push(GraphLink {
                source: edge.source,
                target: edge.target,
                weight: edge.weight,
            });
        }
    }

    let result = ProcessedGraph {
        nodes: filtered_nodes,
        links: graph_links,
    };

    serde_wasm_bindgen::to_value(&result)
        .map_err(|e| JsValue::from_str(&format!("Failed to serialize result: {}", e)))
}

/// Resolve string-based links to integer indices for D3 simulation.
///
/// D3 force simulation is faster with integer indices than string lookups.
/// This function takes pre-filtered nodes and links, and returns links
/// with source/target as node array indices.
///
/// Performance: O(N + E)
#[wasm_bindgen]
pub fn resolve_links(nodes_json: &JsValue, links_json: &JsValue) -> Result<JsValue, JsValue> {
    let nodes: Vec<GraphNode> = serde_wasm_bindgen::from_value(nodes_json.clone())
        .map_err(|e| JsValue::from_str(&format!("Failed to parse nodes: {}", e)))?;
    let links: Vec<GraphLink> = serde_wasm_bindgen::from_value(links_json.clone())
        .map_err(|e| JsValue::from_str(&format!("Failed to parse links: {}", e)))?;

    // Build node index map
    let mut node_indices: FxHashMap<String, u32> = FxHashMap::default();
    node_indices.reserve(nodes.len());

    for (idx, node) in nodes.iter().enumerate() {
        node_indices.insert(normalize(&node.name), idx as u32);
    }

    // Resolve links to indices
    let mut resolved: Vec<ResolvedLink> = Vec::with_capacity(links.len());

    for link in links {
        let source_norm = normalize(&link.source);
        let target_norm = normalize(&link.target);

        if let (Some(&src_idx), Some(&tgt_idx)) = (
            node_indices.get(&source_norm),
            node_indices.get(&target_norm),
        ) {
            resolved.push(ResolvedLink {
                source: src_idx,
                target: tgt_idx,
                weight: link.weight,
            });
        }
    }

    serde_wasm_bindgen::to_value(&resolved)
        .map_err(|e| JsValue::from_str(&format!("Failed to serialize result: {}", e)))
}

/// Combined processing: filter graph AND resolve links in one call.
///
/// Most efficient for visualization pipeline - avoids JS/WASM boundary crossing.
///
/// Performance: O(N + E) single pass
#[wasm_bindgen]
pub fn process_and_resolve_graph(
    nodes_json: &JsValue,
    edges_json: &JsValue,
    center_artist: Option<String>,
    threshold: f32,
) -> Result<JsValue, JsValue> {
    let nodes: Vec<Artist> = serde_wasm_bindgen::from_value(nodes_json.clone())
        .map_err(|e| JsValue::from_str(&format!("Failed to parse nodes: {}", e)))?;
    let edges: Vec<Edge> = serde_wasm_bindgen::from_value(edges_json.clone())
        .map_err(|e| JsValue::from_str(&format!("Failed to parse edges: {}", e)))?;

    let center_normalized = center_artist.as_ref().map(|s| normalize(s));

    // Phase 1: Filter edges and collect connected nodes
    let mut connected_nodes: FxHashSet<String> = FxHashSet::default();
    let mut filtered_edges: Vec<Edge> = Vec::with_capacity(edges.len());

    for edge in edges {
        if edge.weight >= threshold {
            connected_nodes.insert(normalize(&edge.source));
            connected_nodes.insert(normalize(&edge.target));
            filtered_edges.push(edge);
        }
    }

    // Phase 2: Filter nodes and build index map
    let mut filtered_nodes: Vec<GraphNode> = Vec::with_capacity(connected_nodes.len() + 1);
    let mut node_indices: FxHashMap<String, u32> = FxHashMap::default();

    for node in nodes {
        let normalized = normalize(&node.name);
        let is_connected = connected_nodes.contains(&normalized);
        let is_center = center_normalized
            .as_ref()
            .map_or(false, |c| &normalized == c);

        if is_connected || is_center {
            let idx = filtered_nodes.len() as u32;
            node_indices.insert(normalized, idx);

            let mut graph_node: GraphNode = node.into();
            graph_node.is_center = is_center;
            filtered_nodes.push(graph_node);
        }
    }

    // Phase 3: Resolve links to integer indices
    let mut resolved_links: Vec<ResolvedLink> = Vec::with_capacity(filtered_edges.len());

    for edge in filtered_edges {
        let source_norm = normalize(&edge.source);
        let target_norm = normalize(&edge.target);

        if let (Some(&src_idx), Some(&tgt_idx)) = (
            node_indices.get(&source_norm),
            node_indices.get(&target_norm),
        ) {
            resolved_links.push(ResolvedLink {
                source: src_idx,
                target: tgt_idx,
                weight: edge.weight,
            });
        }
    }

    let result = ResolvedGraph {
        nodes: filtered_nodes,
        links: resolved_links,
    };

    serde_wasm_bindgen::to_value(&result)
        .map_err(|e| JsValue::from_str(&format!("Failed to serialize result: {}", e)))
}

#[cfg(test)]
mod tests {
    use super::*;

    fn create_test_artists() -> Vec<Artist> {
        vec![
            Artist {
                id: Some("1".to_string()),
                name: "The Beatles".to_string(),
                mbid: None,
                url: None,
                image_url: None,
                listeners: Some(1000000),
                playcount: None,
                tags: None,
                lastfm_url: None,
            },
            Artist {
                id: Some("2".to_string()),
                name: "Radiohead".to_string(),
                mbid: None,
                url: None,
                image_url: None,
                listeners: Some(500000),
                playcount: None,
                tags: None,
                lastfm_url: None,
            },
            Artist {
                id: Some("3".to_string()),
                name: "Pink Floyd".to_string(),
                mbid: None,
                url: None,
                image_url: None,
                listeners: Some(800000),
                playcount: None,
                tags: None,
                lastfm_url: None,
            },
        ]
    }

    fn create_test_edges() -> Vec<Edge> {
        vec![
            Edge {
                source: "The Beatles".to_string(),
                target: "Radiohead".to_string(),
                weight: 0.8,
            },
            Edge {
                source: "The Beatles".to_string(),
                target: "Pink Floyd".to_string(),
                weight: 0.3,
            },
            Edge {
                source: "Radiohead".to_string(),
                target: "Pink Floyd".to_string(),
                weight: 0.6,
            },
        ]
    }

    #[test]
    fn test_normalize() {
        assert_eq!(normalize("The Beatles"), "the beatles");
        assert_eq!(normalize("RADIOHEAD"), "radiohead");
        assert_eq!(normalize("Pink Floyd"), "pink floyd");
        assert_eq!(normalize("AC/DC"), "ac/dc");
    }

    #[test]
    fn test_filtering_threshold() {
        let edges = create_test_edges();

        // Threshold 0.5 should filter out Beatles-Pink Floyd (0.3)
        let mut connected: FxHashSet<String> = FxHashSet::default();
        let mut filtered: Vec<Edge> = Vec::new();

        for edge in edges {
            if edge.weight >= 0.5 {
                connected.insert(normalize(&edge.source));
                connected.insert(normalize(&edge.target));
                filtered.push(edge);
            }
        }

        assert_eq!(filtered.len(), 2);
        assert!(connected.contains("the beatles"));
        assert!(connected.contains("radiohead"));
        assert!(connected.contains("pink floyd"));
    }

    #[test]
    fn test_center_always_included() {
        let artists = create_test_artists();
        let edges = vec![Edge {
            source: "Radiohead".to_string(),
            target: "Pink Floyd".to_string(),
            weight: 0.8,
        }];

        // Beatles is center but not connected - should still be included
        let center = Some("The Beatles".to_string());
        let center_norm = center.as_ref().map(|s| normalize(s));

        let mut connected: FxHashSet<String> = FxHashSet::default();
        for edge in &edges {
            connected.insert(normalize(&edge.source));
            connected.insert(normalize(&edge.target));
        }

        let mut included = 0;
        for artist in &artists {
            let norm = normalize(&artist.name);
            if connected.contains(&norm) || center_norm.as_ref().map_or(false, |c| &norm == c) {
                included += 1;
            }
        }

        assert_eq!(included, 3); // Beatles (center) + Radiohead + Pink Floyd
    }

    #[test]
    fn test_case_insensitive_matching() {
        let artists = vec![Artist {
            id: Some("1".to_string()),
            name: "The Beatles".to_string(),
            mbid: None,
            url: None,
            image_url: None,
            listeners: Some(1000000),
            playcount: None,
            tags: None,
            lastfm_url: None,
        }];

        let edges = vec![Edge {
            source: "THE BEATLES".to_string(),
            target: "Radiohead".to_string(),
            weight: 0.8,
        }];

        // Even though edge uses "THE BEATLES" and artist uses "The Beatles",
        // they should match via normalization
        let mut connected: FxHashSet<String> = FxHashSet::default();
        for edge in &edges {
            connected.insert(normalize(&edge.source));
        }

        let artist_norm = normalize(&artists[0].name);
        assert!(connected.contains(&artist_norm));
    }

    #[test]
    fn test_empty_inputs() {
        let artists: Vec<Artist> = vec![];
        let edges: Vec<Edge> = vec![];

        let center_normalized: Option<String> = None;
        let threshold = 0.5;

        let mut connected_nodes: FxHashSet<String> = FxHashSet::default();
        let mut filtered_edges: Vec<Edge> = Vec::new();

        for edge in edges {
            if edge.weight >= threshold {
                connected_nodes.insert(normalize(&edge.source));
                connected_nodes.insert(normalize(&edge.target));
                filtered_edges.push(edge);
            }
        }

        let mut filtered_nodes: Vec<GraphNode> = Vec::new();
        for node in artists {
            let normalized = normalize(&node.name);
            let is_connected = connected_nodes.contains(&normalized);
            let is_center = center_normalized
                .as_ref()
                .map_or(false, |c| &normalized == c);

            if is_connected || is_center {
                let graph_node: GraphNode = node.into();
                filtered_nodes.push(graph_node);
            }
        }

        assert_eq!(filtered_nodes.len(), 0);
        assert_eq!(filtered_edges.len(), 0);
    }

    #[test]
    fn test_resolve_links_indices() {
        let nodes = vec![
            GraphNode {
                id: Some("1".to_string()),
                name: "The Beatles".to_string(),
                mbid: None,
                url: None,
                image_url: None,
                listeners: Some(1000000),
                playcount: None,
                tags: None,
                lastfm_url: None,
                is_center: true,
                x: None,
                y: None,
                fx: None,
                fy: None,
            },
            GraphNode {
                id: Some("2".to_string()),
                name: "Radiohead".to_string(),
                mbid: None,
                url: None,
                image_url: None,
                listeners: Some(500000),
                playcount: None,
                tags: None,
                lastfm_url: None,
                is_center: false,
                x: None,
                y: None,
                fx: None,
                fy: None,
            },
        ];

        let links = vec![GraphLink {
            source: "The Beatles".to_string(),
            target: "Radiohead".to_string(),
            weight: 0.8,
        }];

        // Build node index map
        let mut node_indices: FxHashMap<String, u32> = FxHashMap::default();
        for (idx, node) in nodes.iter().enumerate() {
            node_indices.insert(normalize(&node.name), idx as u32);
        }

        // Resolve links
        let mut resolved: Vec<ResolvedLink> = Vec::new();
        for link in links {
            let source_norm = normalize(&link.source);
            let target_norm = normalize(&link.target);

            if let (Some(&src_idx), Some(&tgt_idx)) = (
                node_indices.get(&source_norm),
                node_indices.get(&target_norm),
            ) {
                resolved.push(ResolvedLink {
                    source: src_idx,
                    target: tgt_idx,
                    weight: link.weight,
                });
            }
        }

        assert_eq!(resolved.len(), 1);
        assert_eq!(resolved[0].source, 0); // Beatles is index 0
        assert_eq!(resolved[0].target, 1); // Radiohead is index 1
        assert!((resolved[0].weight - 0.8).abs() < f32::EPSILON);
    }
}
