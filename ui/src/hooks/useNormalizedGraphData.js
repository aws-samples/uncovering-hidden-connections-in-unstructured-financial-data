import { useState, useCallback, useMemo } from 'react';
import {
  normalizeGraphData,
  denormalizeGraphData,
  addEntities,
  addRelationships,
  updateEntity,
  removeEntities,
  getUniqueEntityTypes,
  getUniqueRelationshipTypes
} from '../utils/dataNormalization';

/**
 * Custom hook for managing normalized graph data
 * Provides optimized state management for large graph datasets
 */
export const useNormalizedGraphData = (initialData = { nodes: [], edges: [] }) => {
  // Initialize normalized data
  const [normalizedData, setNormalizedData] = useState(() => 
    normalizeGraphData(initialData)
  );

  // Add entities to the graph
  const addEntitiesToGraph = useCallback((newEntities) => {
    setNormalizedData(prevData => {
      const updatedData = { ...prevData };
      return addEntities(updatedData, newEntities);
    });
  }, []);

  // Add relationships to the graph
  const addRelationshipsToGraph = useCallback((newRelationships) => {
    setNormalizedData(prevData => {
      const updatedData = { ...prevData };
      return addRelationships(updatedData, newRelationships);
    });
  }, []);

  // Update a specific entity
  const updateEntityInGraph = useCallback((entityId, updates) => {
    setNormalizedData(prevData => {
      const updatedData = { ...prevData };
      return updateEntity(updatedData, entityId, updates);
    });
  }, []);

  // Remove entities from the graph
  const removeEntitiesFromGraph = useCallback((entityIds) => {
    setNormalizedData(prevData => {
      const updatedData = { ...prevData };
      return removeEntities(updatedData, entityIds);
    });
  }, []);

  // Set complete graph data (replaces all data)
  const setGraphData = useCallback((newGraphData) => {
    setNormalizedData(normalizeGraphData(newGraphData));
  }, []);

  // Clear all graph data
  const clearGraphData = useCallback(() => {
    setNormalizedData(normalizeGraphData({ nodes: [], edges: [] }));
  }, []);

  // Get denormalized data with optional filters
  const getGraphData = useCallback((filters = {}) => {
    return denormalizeGraphData(normalizedData, filters);
  }, [normalizedData]);

  // Get a specific entity
  const getEntity = useCallback((entityId) => {
    return normalizedData.getEntity(entityId);
  }, [normalizedData]);

  // Get a specific relationship
  const getRelationship = useCallback((relationshipId) => {
    return normalizedData.getRelationship(relationshipId);
  }, [normalizedData]);

  // Get relationships for a specific entity
  const getEntityRelationships = useCallback((entityId) => {
    return normalizedData.getEntityRelationships(entityId);
  }, [normalizedData]);

  // Memoized unique types for filters
  const uniqueEntityTypes = useMemo(() => 
    getUniqueEntityTypes(normalizedData), 
    [normalizedData.entities]
  );

  const uniqueRelationshipTypes = useMemo(() => 
    getUniqueRelationshipTypes(normalizedData), 
    [normalizedData.relationships]
  );

  // Memoized statistics
  const stats = useMemo(() => ({
    entityCount: normalizedData.entities.size,
    relationshipCount: normalizedData.relationships.size,
    avgRelationshipsPerEntity: normalizedData.entities.size > 0 
      ? normalizedData.relationships.size / normalizedData.entities.size 
      : 0,
    uniqueEntityTypes: uniqueEntityTypes.length,
    uniqueRelationshipTypes: uniqueRelationshipTypes.length
  }), [normalizedData, uniqueEntityTypes, uniqueRelationshipTypes]);

  // Batch operations for better performance
  const batchUpdate = useCallback((operations) => {
    setNormalizedData(prevData => {
      let updatedData = { ...prevData };
      
      operations.forEach(operation => {
        switch (operation.type) {
          case 'addEntities':
            updatedData = addEntities(updatedData, operation.entities);
            break;
          case 'addRelationships':
            updatedData = addRelationships(updatedData, operation.relationships);
            break;
          case 'updateEntity':
            updatedData = updateEntity(updatedData, operation.entityId, operation.updates);
            break;
          case 'removeEntities':
            updatedData = removeEntities(updatedData, operation.entityIds);
            break;
          default:
            console.warn('Unknown batch operation type:', operation.type);
        }
      });
      
      return updatedData;
    });
  }, []);

  // Check if entity exists
  const hasEntity = useCallback((entityId) => {
    return normalizedData.entities.has(String(entityId));
  }, [normalizedData.entities]);

  // Check if relationship exists
  const hasRelationship = useCallback((relationshipId) => {
    return normalizedData.relationships.has(String(relationshipId));
  }, [normalizedData.relationships]);

  // Find entities by criteria
  const findEntities = useCallback((criteria) => {
    const entities = Array.from(normalizedData.entities.values());
    
    return entities.filter(entity => {
      if (criteria.label && entity.label !== criteria.label) return false;
      if (criteria.name && !entity.name.toLowerCase().includes(criteria.name.toLowerCase())) return false;
      if (criteria.isExpanded !== undefined && entity.isExpanded !== criteria.isExpanded) return false;
      if (criteria.hasProperties && Object.keys(entity.properties).length === 0) return false;
      
      return true;
    });
  }, [normalizedData.entities]);

  // Find relationships by criteria
  const findRelationships = useCallback((criteria) => {
    const relationships = Array.from(normalizedData.relationships.values());
    
    return relationships.filter(rel => {
      if (criteria.label && rel.label !== criteria.label) return false;
      if (criteria.sourceId && rel.sourceId !== String(criteria.sourceId)) return false;
      if (criteria.targetId && rel.targetId !== String(criteria.targetId)) return false;
      
      return true;
    });
  }, [normalizedData.relationships]);

  return {
    // Data access
    getGraphData,
    getEntity,
    getRelationship,
    getEntityRelationships,
    
    // Data modification
    addEntitiesToGraph,
    addRelationshipsToGraph,
    updateEntityInGraph,
    removeEntitiesFromGraph,
    setGraphData,
    clearGraphData,
    batchUpdate,
    
    // Queries
    hasEntity,
    hasRelationship,
    findEntities,
    findRelationships,
    
    // Metadata
    uniqueEntityTypes,
    uniqueRelationshipTypes,
    stats,
    
    // Raw normalized data (for advanced use cases)
    normalizedData
  };
};