/**
 * Utility functions for building generic CRDT Operation payloads 
 * expected by the Rust `CrdtEngine`.
 */

export function buildEntityInsertOp(entityId: string, entityType: string, data: any) {
	return {
		EntityInsert: {
			entity_id: entityId,
			entity_type: entityType,
			data,
		},
	};
}

export function buildEntityDeleteOp(entityId: string, entityType: string, oldData: any) {
	return {
		EntityDelete: {
			entity_id: entityId,
			entity_type: entityType,
			old_data: oldData,
		},
	};
}

export function buildPropertyUpdateOp(entityId: string, propertyPath: string, oldValue: any, newValue: any) {
	return {
		PropertyUpdate: {
			entity_id: entityId,
			property_path: propertyPath,
			old_value: oldValue === undefined ? null : oldValue,
			new_value: newValue,
		},
	};
}
