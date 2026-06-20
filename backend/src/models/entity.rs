use serde::{
    Deserialize,
    Serialize,
};

#[derive(
    Debug,
    Serialize,
    Deserialize,
)]
pub struct CanonicalEntity {
    pub entity_type: String,
    pub canonical: String,
    pub aliases: Vec<String>,
    pub confidence: Option<f64>,
}
