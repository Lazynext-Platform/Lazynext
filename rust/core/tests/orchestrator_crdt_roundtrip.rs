#[cfg(test)]
mod orchestrator_crdt_tests {
    use serde_json::json;
    use state::entity_graph::EntityGraph;
    use state::operations::CrdtOperation;

    /// Verify that orchestrator-style patches, once normalised to
    /// EntityInsert / EntityDelete / PropertyUpdate format by the TS
    /// adapter, can be deserialised and processed by the CRDT engine.
    #[test]
    fn entity_insert_from_orchestrator_patch() {
        // Simulate what normalizeOrchestratorPatches() produces for
        // {op: "add", path: "/tracks/caption_track/clips/caption_1",
        //  value: {type: "TextLayer", text: "Hello", start: 0, end: 5}}
        let op_json = json!({
            "EntityInsert": {
                "entity_id": "caption_track/caption_1",
                "entity_type": "clip",
                "data": {
                    "type": "TextLayer",
                    "text": "Hello",
                    "start": 0,
                    "end": 5
                }
            }
        });

        let op: CrdtOperation =
            serde_json::from_value(op_json).expect("EntityInsert should deserialize");

        assert!(matches!(op, CrdtOperation::EntityInsert { .. }));

        // Apply to entity graph
        let mut graph = EntityGraph::new();
        if let CrdtOperation::EntityInsert {
            entity_id, data, ..
        } = &op
        {
            let data_str = serde_json::to_string(data).unwrap();
            graph.set_entity(entity_id, &data_str);
        }

        let stored = graph.get_entity("caption_track/caption_1").unwrap();
        let stored_data: serde_json::Value = serde_json::from_str(stored).unwrap();
        assert_eq!(stored_data["text"], "Hello");
        assert_eq!(stored_data["type"], "TextLayer");
    }

    #[test]
    fn entity_delete_from_orchestrator_patch() {
        // {op: "remove", path: "/tracks/main/clips/old_clip"}
        let op_json = json!({
            "EntityDelete": {
                "entity_id": "main/old_clip"
            }
        });

        let op: CrdtOperation =
            serde_json::from_value(op_json).expect("EntityDelete should deserialize");

        assert!(matches!(op, CrdtOperation::EntityDelete { .. }));
    }

    #[test]
    fn property_update_from_orchestrator_patch() {
        // {op: "replace", path: "/tracks/main/clips/my_clip/text", value: {text: "Updated"}}
        let op_json = json!({
            "PropertyUpdate": {
                "target_id": "main/my_clip",
                "property": "text",
                "value": {"text": "Updated"}
            }
        });

        let op: CrdtOperation =
            serde_json::from_value(op_json).expect("PropertyUpdate should deserialize");

        assert!(matches!(op, CrdtOperation::PropertyUpdate { .. }));
    }

    /// Verify the full round-trip: insert → graph stores it → retrieve matches
    #[test]
    fn roundtrip_insert_then_read() {
        let mut graph = EntityGraph::new();

        let op = CrdtOperation::EntityInsert {
            entity_id: "track_a/clip_1".into(),
            entity_type: "clip".into(),
            data: json!({"name": "My Clip", "start": 0, "end": 100}),
        };

        let data_str = serde_json::to_string(&op).unwrap();

        // Re-deserialize to confirm format is round-trippable
        let op2: CrdtOperation = serde_json::from_str(&data_str).unwrap();
        assert!(matches!(op2, CrdtOperation::EntityInsert { .. }));

        if let CrdtOperation::EntityInsert {
            entity_id, data, ..
        } = op2
        {
            let value_str = serde_json::to_string(&data).unwrap();
            graph.set_entity(&entity_id, &value_str);
        }

        let stored = graph.get_entity("track_a/clip_1").unwrap();
        let stored_value: serde_json::Value = serde_json::from_str(stored).unwrap();
        assert_eq!(stored_value["name"], "My Clip");
        assert_eq!(stored_value["start"], 0);
        assert_eq!(stored_value["end"], 100);
    }
}
