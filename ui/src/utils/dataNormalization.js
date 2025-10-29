/**
 * Data normalization utilities for graph data
 * Converts nested graph data into normalized flat structures for better performance
 */

/**
 * Normalize graph data into separate entity and relationship maps
 * @param {Object} graphData - Raw graph data with nodes and edges arrays
 * @returns {Object} Normalized data structure
 */
export const normalizeGraphData = (graphData) => {
  const entities = new Map();
  const relationships = new Map();
  const entityRelationships = new Map(); // Track relationships per entity

  // Normalize nodes/entities
  if (graphData.nodes) {
    graphData.nodes.forEach(node => {
      const entityId = String(node.id);
      entities.set(entityId, {
        id: entityId,
        name: node.name,
        label: node.label,
        properties: node.properties || {},
        relationshipCount: node.relationshipCount || 0,
        isExpanded: node.isExpanded || false,
        needsFullDetails: node.needsFullDetails || false,
        // Add metadata
        createdAt: node.createdAt || Date.now(),
        updatedAt: Date.now()
      });

      // Initialize relationship tracking
      if (!entityRelationships.has(entityId)) {
        entityRelationships.set(entityId, new Set());
      }
    });
  }

  // Normalize edges/relationships
  if (graphData.edges) {
    graphData.edges.forEach(edge => {
      const relationshipId = String(edge.id);
      const sourceId = String(edge.source);
      const targetId = String(edge.target);

      relationships.set(relationshipId, {
        id: relationshipId,
        sourceId,
        targetId,
        label: edge.label || '',
        properties: edge.properties || {},
        // Add metadata
        createdAt: edge.createdAt || Date.now(),
        updatedAt: Date.now()
      });

      // Track relationships for entities
      if (entityRelationships.has(sourceId)) {
        entityRelationships.get(sourceId).add(relationshipId);
      }
      if (entityRelationships.has(targetId)) {
        entityRelationships.get(targetId).add(relationshipId);
      }
    });
  }

  return {
    entities,
    relationships,
    entityRelationships,
    // Helper methods
    getEntity: (id) => entities.get(String(id)),
    getRelationship: (id) => relationships.get(String(id)),
    getEntityRelationships: (entityId) => {
      const relIds = entityRelationships.get(String(entityId)) || new Set();
      return Array.from(relIds).map(id => relationships.get(id)).filter(Boolean);
    },
    // Statistics
    stats: {
      entityCount: entities.size,
      relationshipCount: relationships.size,
      avgRelationshipsPerEntity: entities.size > 0 ? relationships.size / entities.size : 0
    }
  };
};

/**
 * Denormalize data back to graph format for rendering
 * @param {Object} normalizedData - Normalized data structure
 * @param {Object} filters - Optional filters to apply
 * @returns {Object} Graph data with nodes and edges arrays
 */
export const denormalizeGraphData = (normalizedData, filters = {}) => {
  const { entities, relationships } = normalizedData;
  
  // Apply entity filters
  let filteredEntities = Array.from(entities.values());
  if (filters.entityTypes !== undefined) {
    if (filters.entityTypes.length === 0) {
      // If no entity types are selected, show no entities
      filteredEntities = [];
    } else {
      // Filter to only show selected entity types
      filteredEntities = filteredEntities.filter(entity => 
        filters.entityTypes.includes(entity.label)
      );
    }
  }
  if (filters.searchTerm) {
    const searchLower = filters.searchTerm.toLowerCase();
    filteredEntities = filteredEntities.filter(entity =>
      entity.name.toLowerCase().includes(searchLower) ||
      entity.label.toLowerCase().includes(searchLower)
    );
  }
  
  // Apply connection count range filter
  if (filters.connectionRange) {
    const { min, max } = filters.connectionRange;
    filteredEntities = filteredEntities.filter(entity => {
      const connectionCount = entity.relationshipCount || 0;
      return connectionCount >= min && connectionCount <= max;
    });
  }

  // Get filtered entity IDs for relationship filtering
  const filteredEntityIds = new Set(filteredEntities.map(e => e.id));

  // Apply relationship filters
  let filteredRelationships = Array.from(relationships.values());
  if (filters.relationshipTypes !== undefined) {
    if (filters.relationshipTypes.length === 0) {
      // If no relationship types are selected, show no relationships
      filteredRelationships = [];
    } else {
      // Filter to only show selected relationship types
      filteredRelationships = filteredRelationships.filter(rel =>
        filters.relationshipTypes.includes(rel.label)
      );
    }
  }
  // Only include relationships between visible entities
  filteredRelationships = filteredRelationships.filter(rel =>
    filteredEntityIds.has(rel.sourceId) && filteredEntityIds.has(rel.targetId)
  );

  // Convert back to graph format
  const nodes = filteredEntities.map(entity => ({
    id: entity.id,
    name: entity.name,
    label: entity.label,
    properties: entity.properties,
    relationshipCount: entity.relationshipCount,
    isExpanded: entity.isExpanded,
    needsFullDetails: entity.needsFullDetails
  }));

  const edges = filteredRelationships.map(rel => ({
    id: rel.id,
    source: rel.sourceId,
    target: rel.targetId,
    label: rel.label,
    properties: rel.properties
  }));

  return { nodes, edges };
};

/**
 * Add entities to normalized data
 * @param {Object} normalizedData - Current normalized data
 * @param {Array} newEntities - Array of new entities to add
 * @returns {Object} Updated normalized data
 */
export const addEntities = (normalizedData, newEntities) => {
  const { entities, entityRelationships } = normalizedData;
  
  newEntities.forEach(entity => {
    const entityId = String(entity.id);
    entities.set(entityId, {
      id: entityId,
      name: entity.name,
      label: entity.label,
      properties: entity.properties || {},
      relationshipCount: entity.relationshipCount || 0,
      isExpanded: entity.isExpanded || false,
      needsFullDetails: entity.needsFullDetails || false,
      createdAt: entity.createdAt || Date.now(),
      updatedAt: Date.now()
    });

    // Initialize relationship tracking
    if (!entityRelationships.has(entityId)) {
      entityRelationships.set(entityId, new Set());
    }
  });

  return normalizedData;
};

/**
 * Add relationships to normalized data
 * @param {Object} normalizedData - Current normalized data
 * @param {Array} newRelationships - Array of new relationships to add
 * @returns {Object} Updated normalized data
 */
export const addRelationships = (normalizedData, newRelationships) => {
  const { relationships, entityRelationships } = normalizedData;
  
  newRelationships.forEach(rel => {
    const relationshipId = String(rel.id);
    const sourceId = String(rel.source);
    const targetId = String(rel.target);

    relationships.set(relationshipId, {
      id: relationshipId,
      sourceId,
      targetId,
      label: rel.label || '',
      properties: rel.properties || {},
      createdAt: rel.createdAt || Date.now(),
      updatedAt: Date.now()
    });

    // Track relationships for entities
    if (entityRelationships.has(sourceId)) {
      entityRelationships.get(sourceId).add(relationshipId);
    }
    if (entityRelationships.has(targetId)) {
      entityRelationships.get(targetId).add(relationshipId);
    }
  });

  return normalizedData;
};

/**
 * Update entity in normalized data
 * @param {Object} normalizedData - Current normalized data
 * @param {string} entityId - Entity ID to update
 * @param {Object} updates - Updates to apply
 * @returns {Object} Updated normalized data
 */
export const updateEntity = (normalizedData, entityId, updates) => {
  const { entities } = normalizedData;
  const entity = entities.get(String(entityId));
  
  if (entity) {
    entities.set(String(entityId), {
      ...entity,
      ...updates,
      updatedAt: Date.now()
    });
  }

  return normalizedData;
};

/**
 * Remove entities and their relationships from normalized data
 * @param {Object} normalizedData - Current normalized data
 * @param {Array} entityIds - Array of entity IDs to remove
 * @returns {Object} Updated normalized data
 */
export const removeEntities = (normalizedData, entityIds) => {
  const { entities, relationships, entityRelationships } = normalizedData;
  
  entityIds.forEach(entityId => {
    const id = String(entityId);
    
    // Remove entity's relationships
    const relIds = entityRelationships.get(id) || new Set();
    relIds.forEach(relId => {
      relationships.delete(relId);
    });
    
    // Remove entity
    entities.delete(id);
    entityRelationships.delete(id);
    
    // Clean up relationship references from other entities
    entityRelationships.forEach((relSet, otherId) => {
      relIds.forEach(relId => relSet.delete(relId));
    });
  });

  return normalizedData;
};

/**
 * Get unique entity types from normalized data
 * @param {Object} normalizedData - Normalized data
 * @returns {Array} Array of unique entity types
 */
export const getUniqueEntityTypes = (normalizedData) => {
  const { entities } = normalizedData;
  const types = new Set();
  
  entities.forEach(entity => {
    types.add(entity.label);
  });
  
  return Array.from(types);
};

/**
 * Get unique relationship types from normalized data
 * @param {Object} normalizedData - Normalized data
 * @returns {Array} Array of unique relationship types
 */
export const getUniqueRelationshipTypes = (normalizedData) => {
  const { relationships } = normalizedData;
  const types = new Set();
  
  relationships.forEach(rel => {
    if (rel.label) {
      types.add(rel.label);
    }
  });
  
  return Array.from(types);
};