use serde::{Deserialize, Serialize};

/// Artist node data from Last.fm
/// Matches the TypeScript Artist interface in src/types/artist.ts
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Artist {
    pub id: Option<String>,
    pub name: String,
    #[serde(rename = "lastfm_mbid")]
    pub mbid: Option<String>,
    pub url: Option<String>,
    pub image_url: Option<String>,
    pub listeners: Option<u32>,
    pub playcount: Option<u32>,
    pub tags: Option<Vec<String>>,
    #[serde(rename = "lastfm_url")]
    pub lastfm_url: Option<String>,
}

/// Edge between two artists (similarity relationship)
/// Matches the TypeScript SimilarityEdge interface
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Edge {
    pub source: String,
    pub target: String,
    pub weight: f32,
}

/// Processed graph node for visualization
/// Extends Artist with D3 simulation fields
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GraphNode {
    pub id: Option<String>,
    pub name: String,
    #[serde(rename = "lastfm_mbid")]
    pub mbid: Option<String>,
    pub url: Option<String>,
    pub image_url: Option<String>,
    pub listeners: Option<u32>,
    pub playcount: Option<u32>,
    pub tags: Option<Vec<String>>,
    #[serde(rename = "lastfm_url")]
    pub lastfm_url: Option<String>,
    /// Whether this node is the center/searched artist
    #[serde(rename = "isCenter")]
    pub is_center: bool,
    // D3 simulation position fields (will be mutated by D3)
    pub x: Option<f64>,
    pub y: Option<f64>,
    pub fx: Option<f64>,
    pub fy: Option<f64>,
}

/// Processed graph link with string node references
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GraphLink {
    pub source: String,
    pub target: String,
    pub weight: f32,
}

/// Link resolved to integer indices for D3 simulation
/// D3 force simulation performs better with integer indices
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ResolvedLink {
    pub source: u32,
    pub target: u32,
    pub weight: f32,
}

/// Complete processed graph data with string-based links
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProcessedGraph {
    pub nodes: Vec<GraphNode>,
    pub links: Vec<GraphLink>,
}

/// Graph data with resolved integer-indexed links
/// Ready for direct use by D3 force simulation
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ResolvedGraph {
    pub nodes: Vec<GraphNode>,
    pub links: Vec<ResolvedLink>,
}

impl From<Artist> for GraphNode {
    fn from(artist: Artist) -> Self {
        GraphNode {
            id: artist.id,
            name: artist.name,
            mbid: artist.mbid,
            url: artist.url,
            image_url: artist.image_url,
            listeners: artist.listeners,
            playcount: artist.playcount,
            tags: artist.tags,
            lastfm_url: artist.lastfm_url,
            is_center: false,
            x: None,
            y: None,
            fx: None,
            fy: None,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_artist_to_graph_node() {
        let artist = Artist {
            id: Some("1".to_string()),
            name: "The Beatles".to_string(),
            mbid: Some("mbid123".to_string()),
            url: None,
            image_url: Some("http://example.com/image.jpg".to_string()),
            listeners: Some(1000000),
            playcount: None,
            tags: Some(vec!["rock".to_string(), "british".to_string()]),
            lastfm_url: Some("http://last.fm/beatles".to_string()),
        };

        let node: GraphNode = artist.into();

        assert_eq!(node.name, "The Beatles");
        assert_eq!(node.listeners, Some(1000000));
        assert!(!node.is_center);
        assert!(node.x.is_none());
        assert!(node.y.is_none());
    }

    #[test]
    fn test_edge_serialization() {
        let edge = Edge {
            source: "The Beatles".to_string(),
            target: "Radiohead".to_string(),
            weight: 0.85,
        };

        let json = serde_json::to_string(&edge).unwrap();
        assert!(json.contains("The Beatles"));
        assert!(json.contains("Radiohead"));
        assert!(json.contains("0.85"));
    }

    #[test]
    fn test_graph_node_is_center_serialization() {
        let node = GraphNode {
            id: None,
            name: "Test".to_string(),
            mbid: None,
            url: None,
            image_url: None,
            listeners: None,
            playcount: None,
            tags: None,
            lastfm_url: None,
            is_center: true,
            x: Some(100.0),
            y: Some(200.0),
            fx: None,
            fy: None,
        };

        let json = serde_json::to_string(&node).unwrap();
        // Verify isCenter is serialized in camelCase
        assert!(json.contains("\"isCenter\":true"));
    }

    #[test]
    fn test_resolved_link() {
        let link = ResolvedLink {
            source: 0,
            target: 1,
            weight: 0.75,
        };

        assert_eq!(link.source, 0);
        assert_eq!(link.target, 1);
        assert!((link.weight - 0.75).abs() < f32::EPSILON);
    }
}
