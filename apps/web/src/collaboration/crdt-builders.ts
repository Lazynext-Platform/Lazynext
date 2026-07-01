/**
 * Utility functions for building generic CRDT Operation payloads
 * expected by the Rust `CrdtEngine`.
 *
 * @module collaboration/crdt-builders
 */

/**
 * Builds an EntityInsert CRDT operation.
 *
 * @param entityId - unique identifier for the new entity.
 * @param entityType - type tag (e.g., "element", "track").
 * @param data - the entity data to store.
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

/**
 * Builds an EntityDelete CRDT operation.
 *
 * @param entityId - identifier of the entity to remove.
 * @param entityType - type tag of the removed entity.
 * @param oldData - snapshot of the entity before deletion (for tombstone).
 */
export function buildEntityDeleteOp(entityId: string, entityType: string, oldData: any) {
	return {
		EntityDelete: {
			entity_id: entityId,
			entity_type: entityType,
			old_data: oldData,
		},
	};
}

/**
 * Builds a PropertyUpdate CRDT operation for a single property change.
 *
 * @param entityId - identifier of the entity being updated.
 * @param propertyPath - dot-separated property path (e.g., "params.opacity").
 * @param oldValue - previous value for conflict resolution (null if undefined).
 * @param newValue - the new value to set.
 */
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
